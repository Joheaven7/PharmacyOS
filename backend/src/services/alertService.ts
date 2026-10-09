import { PrismaClient, AlertType, AlertSeverity, AlertStatus } from '@prisma/client';
import { DEFAULT_ORGANIZATION_SETTINGS } from './organizationService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class AlertService {
  /**
   * Evaluates inventory & batches against pharmacy operational settings
   * and idempotently generates unresolved alert records.
   */
  static async generateTenantAlerts(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) return;

    const orgSettings = (org.settings as Record<string, unknown>) || {};
    const lowStockThreshold = Number(orgSettings.lowStockThreshold ?? DEFAULT_ORGANIZATION_SETTINGS.lowStockThreshold);
    const expiryWarningDays = Number(orgSettings.expiryWarningDays ?? DEFAULT_ORGANIZATION_SETTINGS.expiryWarningDays);
    const criticalExpiryDays = Number(orgSettings.criticalExpiryDays ?? DEFAULT_ORGANIZATION_SETTINGS.criticalExpiryDays);

    const now = new Date();
    const warningDateCutoff = new Date(now.getTime() + expiryWarningDays * 24 * 60 * 60 * 1000);
    const criticalDateCutoff = new Date(now.getTime() + criticalExpiryDays * 24 * 60 * 60 * 1000);

    // 1. Fetch active medicines with batches
    const medicines = await prisma.medicine.findMany({
      where: { organizationId, active: true },
      include: {
        batches: { where: { status: { not: 'DELETED' } } },
      },
    });

    // Fetch existing unresolved alerts to enforce idempotency
    const existingUnresolvedAlerts = await prisma.alert.findMany({
      where: { organizationId, status: 'UNRESOLVED' },
    });

    const isAlertAlreadyActive = (
      type: AlertType,
      medicineId?: string,
      batchId?: string
    ) => {
      return existingUnresolvedAlerts.some(
        (a) =>
          a.type === type &&
          (medicineId ? a.medicineId === medicineId : true) &&
          (batchId ? a.batchId === batchId : true)
      );
    };

    const alertsToCreate: {
      organizationId: string;
      type: AlertType;
      severity: AlertSeverity;
      medicineId?: string;
      batchId?: string;
      message: string;
    }[] = [];

    // A. Evaluate Product Stock Levels
    for (const med of medicines) {
      const sellableBatches = med.batches.filter(
        (b) => b.status === 'ACTIVE' && b.quantity > 0 && new Date(b.expiryDate) > now
      );
      const totalSellableQty = sellableBatches.reduce((acc, b) => acc + b.quantity, 0);

      if (totalSellableQty === 0) {
        if (!isAlertAlreadyActive('OUT_OF_STOCK', med.id)) {
          alertsToCreate.push({
            organizationId,
            type: 'OUT_OF_STOCK',
            severity: 'CRITICAL',
            medicineId: med.id,
            message: `'${med.name}' is OUT OF STOCK (0 sellable units remaining).`,
          });
        }
      } else if (totalSellableQty <= lowStockThreshold) {
        if (!isAlertAlreadyActive('LOW_STOCK', med.id)) {
          alertsToCreate.push({
            organizationId,
            type: 'LOW_STOCK',
            severity: 'WARNING',
            medicineId: med.id,
            message: `'${med.name}' is LOW IN STOCK (${totalSellableQty} units remaining, threshold: ${lowStockThreshold}).`,
          });
        }
      }

      // B. Evaluate Individual Batch Expiries
      for (const batch of med.batches) {
        if (batch.quantity <= 0) continue;

        const expDate = new Date(batch.expiryDate);

        if (expDate <= now) {
          if (!isAlertAlreadyActive('EXPIRED', med.id, batch.id)) {
            alertsToCreate.push({
              organizationId,
              type: 'EXPIRED',
              severity: 'CRITICAL',
              medicineId: med.id,
              batchId: batch.id,
              message: `Batch ${batch.batchNumber} of '${med.name}' (${batch.quantity} units) EXPIRED on ${expDate.toISOString().split('T')[0]}.`,
            });
          }
        } else if (expDate <= criticalDateCutoff) {
          if (!isAlertAlreadyActive('EXPIRING_SOON', med.id, batch.id)) {
            const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
            alertsToCreate.push({
              organizationId,
              type: 'EXPIRING_SOON',
              severity: 'CRITICAL',
              medicineId: med.id,
              batchId: batch.id,
              message: `CRITICAL EXPIRY: Batch ${batch.batchNumber} of '${med.name}' expires in ${daysLeft} day(s) (${expDate.toISOString().split('T')[0]}).`,
            });
          }
        } else if (expDate <= warningDateCutoff) {
          if (!isAlertAlreadyActive('EXPIRING_SOON', med.id, batch.id)) {
            const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
            alertsToCreate.push({
              organizationId,
              type: 'EXPIRING_SOON',
              severity: 'WARNING',
              medicineId: med.id,
              batchId: batch.id,
              message: `EXPIRY WARNING: Batch ${batch.batchNumber} of '${med.name}' expires in ${daysLeft} day(s) (${expDate.toISOString().split('T')[0]}).`,
            });
          }
        }
      }
    }

    if (alertsToCreate.length > 0) {
      await prisma.alert.createMany({
        data: alertsToCreate,
      });
      logger.info(`Generated ${alertsToCreate.length} new inventory alert(s) for organization ${organizationId}`);
    }
  }

  static async listAlerts(organizationId: string, type?: string, status = 'UNRESOLVED') {
    // Generate fresh alerts before reading
    await this.generateTenantAlerts(organizationId);

    const whereClause: Record<string, unknown> = {
      organizationId,
      status: status.toUpperCase() as AlertStatus,
    };

    if (type) {
      whereClause.type = type.toUpperCase() as AlertType;
    }

    return prisma.alert.findMany({
      where: whereClause,
      include: {
        medicine: { select: { id: true, name: true, barcode: true } },
        batch: { select: { id: true, batchNumber: true, expiryDate: true, quantity: true } },
        resolvedBy: { select: { fullName: true } },
      },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
    });
  }

  static async resolveAlert(organizationId: string, userId: string, alertId: string) {
    const alert = await prisma.alert.findFirst({
      where: { id: alertId, organizationId },
    });

    if (!alert) {
      throw new AppError('Alert record not found.', 404);
    }

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedById: userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'RESOLVE_ALERT',
        entity: 'Alert',
        entityId: alertId,
        metadata: { type: alert.type, message: alert.message },
      },
    });

    return updated;
  }

  static async getAlertSummary(organizationId: string) {
    await this.generateTenantAlerts(organizationId);

    const unresolvedAlerts = await prisma.alert.findMany({
      where: { organizationId, status: 'UNRESOLVED' },
    });

    return {
      totalUnresolved: unresolvedAlerts.length,
      outOfStockCount: unresolvedAlerts.filter((a) => a.type === 'OUT_OF_STOCK').length,
      lowStockCount: unresolvedAlerts.filter((a) => a.type === 'LOW_STOCK').length,
      expiringSoonCount: unresolvedAlerts.filter((a) => a.type === 'EXPIRING_SOON').length,
      expiredCount: unresolvedAlerts.filter((a) => a.type === 'EXPIRED').length,
      criticalCount: unresolvedAlerts.filter((a) => a.severity === 'CRITICAL').length,
    };
  }
}
