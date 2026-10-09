import { PrismaClient } from '@prisma/client';
import { DEFAULT_ORGANIZATION_SETTINGS } from './organizationService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export type PeriodFilter = 'today' | 'yesterday' | '7days' | '30days' | 'this_month';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export class AnalyticsService {
  static getDateRange(period: PeriodFilter = 'today'): DateRange {
    const now = new Date();
    const startDate = new Date();
    const endDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'this_month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    return { startDate, endDate };
  }

  static async getDashboardOverview(organizationId: string, period: PeriodFilter = 'today') {
    const { startDate, endDate } = this.getDateRange(period);
    const now = new Date();

    // 1. Fetch sales within period date range
    const sales = await prisma.sale.findMany({
      where: {
        organizationId,
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: {
            batch: { select: { purchasePrice: true } },
          },
        },
      },
    });

    const transactionCount = sales.length;
    const salesRevenue = sales.reduce((acc, s) => acc + s.total, 0);

    let itemsSold = 0;
    let costOfGoodsSold = 0;

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        itemsSold += item.quantity;
        const purchaseCost = item.batch?.purchasePrice || 0;
        costOfGoodsSold += item.quantity * purchaseCost;
      });
    });

    const averageTransactionValue = transactionCount > 0 ? salesRevenue / transactionCount : 0;
    const grossProfit = salesRevenue - costOfGoodsSold;

    const cashSales = sales.filter((s) => s.paymentMethod === 'CASH').reduce((acc, s) => acc + s.total, 0);
    const cardSales = sales.filter((s) => s.paymentMethod === 'CARD').reduce((acc, s) => acc + s.total, 0);
    const digitalSales = sales.filter((s) => s.paymentMethod === 'DIGITAL').reduce((acc, s) => acc + s.total, 0);

    // 2. Fetch inventory metrics
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    const orgSettings = (org?.settings as Record<string, unknown>) || {};
    const lowStockThreshold = Number(orgSettings.lowStockThreshold ?? DEFAULT_ORGANIZATION_SETTINGS.lowStockThreshold);
    const expiryWarningDays = Number(orgSettings.expiryWarningDays ?? DEFAULT_ORGANIZATION_SETTINGS.expiryWarningDays);

    const warningDateCutoff = new Date(now.getTime() + expiryWarningDays * 24 * 60 * 60 * 1000);

    const medicines = await prisma.medicine.findMany({
      where: { organizationId, active: true },
      include: {
        batches: { where: { status: { not: 'DELETED' } } },
      },
    });

    let totalUnits = 0;
    let inventoryCostValue = 0;
    let inventoryRetailValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let expiringBatchesCount = 0;

    medicines.forEach((med) => {
      const activeBatches = med.batches.filter(
        (b) => b.status === 'ACTIVE' && b.quantity > 0 && new Date(b.expiryDate) > now
      );
      const sellableQty = activeBatches.reduce((acc, b) => acc + b.quantity, 0);

      if (sellableQty === 0) outOfStockCount += 1;
      else if (sellableQty <= lowStockThreshold) lowStockCount += 1;

      med.batches.forEach((b) => {
        if (b.status === 'ACTIVE' && b.quantity > 0) {
          totalUnits += b.quantity;
          inventoryCostValue += b.quantity * b.purchasePrice;
          inventoryRetailValue += b.quantity * b.sellingPrice;

          const expDate = new Date(b.expiryDate);
          if (expDate > now && expDate <= warningDateCutoff) {
            expiringBatchesCount += 1;
          }
        }
      });
    });

    return {
      period,
      periodLabel: period.replace('_', ' ').toUpperCase(),
      startDate,
      endDate,
      sales: {
        revenue: salesRevenue,
        transactionCount,
        itemsSold,
        averageTransactionValue,
        cashSales,
        cardSales,
        digitalSales,
      },
      profit: {
        salesRevenue,
        costOfGoodsSold,
        grossProfit,
      },
      inventory: {
        totalUnits,
        inventoryCostValue,
        inventoryRetailValue,
        lowStockCount,
        outOfStockCount,
        expiringBatchesCount,
      },
    };
  }

  static async getTopSellingProducts(organizationId: string, period: PeriodFilter = '30days', limit = 5) {
    const { startDate, endDate } = this.getDateRange(period);

    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          organizationId,
          status: 'COMPLETED',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        medicine: { select: { id: true, name: true, barcode: true, strength: true, unit: true } },
      },
    });

    const productMap = new Map<
      string,
      { medicineId: string; name: string; barcode?: string; totalQty: number; totalRevenue: number }
    >();

    saleItems.forEach((item) => {
      const existing = productMap.get(item.medicineId) || {
        medicineId: item.medicineId,
        name: item.medicine?.name || 'Medicine',
        barcode: item.medicine?.barcode || undefined,
        totalQty: 0,
        totalRevenue: 0,
      };

      existing.totalQty += item.quantity;
      existing.totalRevenue += item.subtotal;
      productMap.set(item.medicineId, existing);
    });

    const ranked = Array.from(productMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);

    return ranked;
  }
}
