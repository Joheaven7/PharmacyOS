import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { CreateMedicineInput, UpdateMedicineInput, CreateCategoryInput } from '../validators/medicineValidators';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface MedicineQueryOptions {
  search?: string;
  categoryId?: string;
  activeOnly?: boolean;
  page?: number;
  limit?: number;
}

export class MedicineService {
  // --- Category Operations ---
  static async listCategories(organizationId: string) {
    return prisma.category.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  static async createCategory(organizationId: string, input: CreateCategoryInput) {
    const existing = await prisma.category.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name: input.name,
        },
      },
    });

    if (existing) {
      throw new AppError(`Category '${input.name}' already exists.`, 409);
    }

    return prisma.category.create({
      data: {
        organizationId,
        name: input.name,
        description: input.description,
      },
    });
  }

  // --- Medicine Operations ---
  static async listMedicines(organizationId: string, options: MedicineQueryOptions) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? options.limit : 50;
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      organizationId,
    };

    if (options.activeOnly !== false) {
      whereClause.active = true;
    }

    if (options.categoryId) {
      whereClause.categoryId = options.categoryId;
    }

    if (options.search && options.search.trim().length > 0) {
      const query = options.search.trim();
      whereClause.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { genericName: { contains: query, mode: 'insensitive' } },
        { brandName: { contains: query, mode: 'insensitive' } },
        { barcode: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.medicine.findMany({
        where: whereClause,
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.medicine.count({ where: whereClause }),
    ]);

    return {
      medicines: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getMedicineById(organizationId: string, id: string) {
    const medicine = await prisma.medicine.findFirst({
      where: { id, organizationId },
      include: { category: true },
    });

    if (!medicine) {
      throw new AppError('Medicine not found in catalog.', 404);
    }

    return medicine;
  }

  static async getMedicineByBarcode(organizationId: string, barcode: string) {
    const medicine = await prisma.medicine.findFirst({
      where: {
        organizationId,
        barcode: barcode.trim(),
        active: true,
      },
      include: { category: true },
    });

    if (!medicine) {
      throw new AppError(`No active medicine product found with barcode '${barcode}'.`, 404);
    }

    return medicine;
  }

  static async createMedicine(organizationId: string, userId: string, input: CreateMedicineInput) {
    // Check barcode duplicate per tenant
    if (input.barcode) {
      const existingBarcode = await prisma.medicine.findFirst({
        where: {
          organizationId,
          barcode: input.barcode,
        },
      });

      if (existingBarcode) {
        throw new AppError(`A medicine with barcode '${input.barcode}' already exists (${existingBarcode.name}).`, 409);
      }
    }

    // Check SKU duplicate per tenant
    if (input.sku) {
      const existingSku = await prisma.medicine.findFirst({
        where: {
          organizationId,
          sku: input.sku,
        },
      });

      if (existingSku) {
        throw new AppError(`A medicine with SKU '${input.sku}' already exists (${existingSku.name}).`, 409);
      }
    }

    const medicine = await prisma.medicine.create({
      data: {
        organizationId,
        name: input.name,
        genericName: input.genericName,
        brandName: input.brandName,
        strength: input.strength,
        dosageForm: input.dosageForm,
        categoryId: input.categoryId,
        manufacturer: input.manufacturer,
        barcode: input.barcode,
        sku: input.sku,
        unit: input.unit || 'BOX',
        active: true,
      },
      include: { category: true },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'CREATE_MEDICINE',
        entity: 'Medicine',
        entityId: medicine.id,
        metadata: { name: medicine.name, barcode: medicine.barcode },
      },
    });

    logger.info(`Medicine created: ${medicine.name} [Org: ${organizationId}]`);

    return medicine;
  }

  static async updateMedicine(
    organizationId: string,
    userId: string,
    id: string,
    input: UpdateMedicineInput
  ) {
    const existing = await this.getMedicineById(organizationId, id);

    // Check barcode uniqueness if changed
    if (input.barcode && input.barcode !== existing.barcode) {
      const duplicateBarcode = await prisma.medicine.findFirst({
        where: {
          organizationId,
          barcode: input.barcode,
          id: { not: id },
        },
      });

      if (duplicateBarcode) {
        throw new AppError(`Barcode '${input.barcode}' is already assigned to ${duplicateBarcode.name}.`, 409);
      }
    }

    const updated = await prisma.medicine.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.genericName !== undefined ? { genericName: input.genericName } : {}),
        ...(input.brandName !== undefined ? { brandName: input.brandName } : {}),
        ...(input.strength !== undefined ? { strength: input.strength } : {}),
        ...(input.dosageForm !== undefined ? { dosageForm: input.dosageForm } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.manufacturer !== undefined ? { manufacturer: input.manufacturer } : {}),
        ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
      include: { category: true },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'UPDATE_MEDICINE',
        entity: 'Medicine',
        entityId: id,
        metadata: { changes: input },
      },
    });

    return updated;
  }

  static async archiveMedicine(organizationId: string, userId: string, id: string) {
    await this.getMedicineById(organizationId, id);

    const archived = await prisma.medicine.update({
      where: { id },
      data: { active: false },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'ARCHIVE_MEDICINE',
        entity: 'Medicine',
        entityId: id,
      },
    });

    logger.info(`Medicine archived: ${archived.name} [Org: ${organizationId}]`);

    return archived;
  }
}
