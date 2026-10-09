import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { UpdateOrganizationInput } from '../validators/organizationValidators';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const DEFAULT_ORGANIZATION_SETTINGS = {
  lowStockThreshold: 10,
  expiryWarningDays: 30,
  criticalExpiryDays: 7,
  receiptHeader: 'Thank you for shopping with us!',
  receiptFooter: 'For any inquiries, please contact our pharmacy desk.',
};

export class OrganizationService {
  static async getProfile(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new AppError('Pharmacy organization profile not found.', 404);
    }

    const currentSettings = (org.settings as Record<string, unknown>) || {};
    const mergedSettings = { ...DEFAULT_ORGANIZATION_SETTINGS, ...currentSettings };

    return {
      id: org.id,
      name: org.name,
      legalName: org.legalName,
      phone: org.phone,
      email: org.email,
      address: org.address,
      city: org.city,
      country: org.country,
      currency: org.currency,
      timezone: org.timezone,
      logoUrl: org.logoUrl,
      settings: mergedSettings,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  static async updateProfile(
    organizationId: string,
    input: UpdateOrganizationInput,
    userId: string
  ) {
    const existingOrg = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!existingOrg) {
      throw new AppError('Pharmacy organization profile not found.', 404);
    }

    const currentSettings = (existingOrg.settings as Record<string, unknown>) || {};
    const updatedSettings = input.settings
      ? { ...currentSettings, ...input.settings }
      : currentSettings;

    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
        ...(input.currency ? { currency: input.currency } : {}),
        ...(input.timezone ? { timezone: input.timezone } : {}),
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
        settings: updatedSettings as Prisma.InputJsonValue,
      },
    });

    // Record Audit Log for Settings Update
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'UPDATE_ORGANIZATION_PROFILE',
        entity: 'Organization',
        entityId: organizationId,
        metadata: { changes: input },
      },
    });

    logger.info(`Organization profile updated for tenant ${organizationId} by user ${userId}`);

    const finalSettings = { ...DEFAULT_ORGANIZATION_SETTINGS, ...((updatedOrg.settings as Record<string, unknown>) || {}) };

    return {
      id: updatedOrg.id,
      name: updatedOrg.name,
      legalName: updatedOrg.legalName,
      phone: updatedOrg.phone,
      email: updatedOrg.email,
      address: updatedOrg.address,
      city: updatedOrg.city,
      country: updatedOrg.country,
      currency: updatedOrg.currency,
      timezone: updatedOrg.timezone,
      logoUrl: updatedOrg.logoUrl,
      settings: finalSettings,
      updatedAt: updatedOrg.updatedAt,
    };
  }
}
