import { AppError } from '../middleware/errorHandler';

export interface UpdateOrganizationInput {
  name?: string;
  legalName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  logoUrl?: string;
  settings?: {
    lowStockThreshold?: number;
    expiryWarningDays?: number;
    criticalExpiryDays?: number;
    receiptHeader?: string;
    receiptFooter?: string;
  };
}

export class OrganizationValidators {
  static validateUpdateProfile(body: Record<string, unknown>): UpdateOrganizationInput {
    const output: UpdateOrganizationInput = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        throw new AppError('Pharmacy name cannot be empty.', 400);
      }
      output.name = body.name.trim();
    }

    if (body.legalName !== undefined) output.legalName = String(body.legalName).trim();
    if (body.phone !== undefined) output.phone = String(body.phone).trim();
    if (body.email !== undefined) {
      if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
        throw new AppError('Invalid email format.', 400);
      }
      output.email = String(body.email).trim().toLowerCase();
    }
    if (body.address !== undefined) output.address = String(body.address).trim();
    if (body.city !== undefined) output.city = String(body.city).trim();
    if (body.country !== undefined) output.country = String(body.country).trim();
    if (body.currency !== undefined) output.currency = String(body.currency).trim().toUpperCase();
    if (body.timezone !== undefined) output.timezone = String(body.timezone).trim();
    if (body.logoUrl !== undefined) output.logoUrl = String(body.logoUrl).trim();

    if (body.settings && typeof body.settings === 'object') {
      const settings = body.settings as Record<string, unknown>;
      output.settings = {};

      if (settings.lowStockThreshold !== undefined) {
        const val = Number(settings.lowStockThreshold);
        if (isNaN(val) || val < 0) throw new AppError('Low stock threshold must be a non-negative number.', 400);
        output.settings.lowStockThreshold = val;
      }

      if (settings.expiryWarningDays !== undefined) {
        const val = Number(settings.expiryWarningDays);
        if (isNaN(val) || val < 1) throw new AppError('Expiry warning days must be at least 1.', 400);
        output.settings.expiryWarningDays = val;
      }

      if (settings.criticalExpiryDays !== undefined) {
        const val = Number(settings.criticalExpiryDays);
        if (isNaN(val) || val < 1) throw new AppError('Critical expiry days must be at least 1.', 400);
        output.settings.criticalExpiryDays = val;
      }

      if (settings.receiptHeader !== undefined) output.settings.receiptHeader = String(settings.receiptHeader).trim();
      if (settings.receiptFooter !== undefined) output.settings.receiptFooter = String(settings.receiptFooter).trim();
    }

    return output;
  }
}
