import { AppError } from '../middleware/errorHandler';

export interface CreateCategoryInput {
  name: string;
  description?: string;
}

export interface CreateMedicineInput {
  name: string;
  genericName?: string;
  brandName?: string;
  strength?: string;
  dosageForm?: string;
  categoryId?: string;
  manufacturer?: string;
  barcode?: string;
  sku?: string;
  unit?: string;
}

export interface UpdateMedicineInput {
  name?: string;
  genericName?: string;
  brandName?: string;
  strength?: string;
  dosageForm?: string;
  categoryId?: string;
  manufacturer?: string;
  barcode?: string;
  sku?: string;
  unit?: string;
  active?: boolean;
}

export class MedicineValidators {
  static validateCreateCategory(body: Record<string, unknown>): CreateCategoryInput {
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError('Category name is required.', 400);
    }

    return {
      name: name.trim(),
      description: description ? String(description).trim() : undefined,
    };
  }

  static validateCreateMedicine(body: Record<string, unknown>): CreateMedicineInput {
    const { name, genericName, brandName, strength, dosageForm, categoryId, manufacturer, barcode, sku, unit } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError('Medicine name is required.', 400);
    }

    return {
      name: name.trim(),
      genericName: genericName ? String(genericName).trim() : undefined,
      brandName: brandName ? String(brandName).trim() : undefined,
      strength: strength ? String(strength).trim() : undefined,
      dosageForm: dosageForm ? String(dosageForm).trim().toUpperCase() : undefined,
      categoryId: categoryId ? String(categoryId).trim() : undefined,
      manufacturer: manufacturer ? String(manufacturer).trim() : undefined,
      barcode: barcode ? String(barcode).trim() : undefined,
      sku: sku ? String(sku).trim() : undefined,
      unit: unit ? String(unit).trim().toUpperCase() : 'BOX',
    };
  }

  static validateUpdateMedicine(body: Record<string, unknown>): UpdateMedicineInput {
    const output: UpdateMedicineInput = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        throw new AppError('Medicine name cannot be empty.', 400);
      }
      output.name = body.name.trim();
    }

    if (body.genericName !== undefined) output.genericName = String(body.genericName).trim();
    if (body.brandName !== undefined) output.brandName = String(body.brandName).trim();
    if (body.strength !== undefined) output.strength = String(body.strength).trim();
    if (body.dosageForm !== undefined) output.dosageForm = String(body.dosageForm).trim().toUpperCase();
    if (body.categoryId !== undefined) output.categoryId = body.categoryId ? String(body.categoryId).trim() : undefined;
    if (body.manufacturer !== undefined) output.manufacturer = String(body.manufacturer).trim();
    if (body.barcode !== undefined) output.barcode = body.barcode ? String(body.barcode).trim() : undefined;
    if (body.sku !== undefined) output.sku = body.sku ? String(body.sku).trim() : undefined;
    if (body.unit !== undefined) output.unit = String(body.unit).trim().toUpperCase();
    if (body.active !== undefined) output.active = Boolean(body.active);

    return output;
  }
}
