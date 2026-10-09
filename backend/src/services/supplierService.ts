import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { CreateSupplierInput } from '../validators/purchasingValidators';

const prisma = new PrismaClient();

export class SupplierService {
  static async listSuppliers(organizationId: string) {
    return prisma.supplier.findMany({
      where: { organizationId, active: true },
      include: {
        purchases: {
          select: { id: true, invoiceNumber: true, total: true, purchaseDate: true },
          orderBy: { purchaseDate: 'desc' },
          take: 5,
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async createSupplier(organizationId: string, input: CreateSupplierInput) {
    const existing = await prisma.supplier.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name: input.name,
        },
      },
    });

    if (existing) {
      throw new AppError(`Supplier '${input.name}' already exists.`, 409);
    }

    return prisma.supplier.create({
      data: {
        organizationId,
        name: input.name,
        contactPerson: input.contactPerson,
        phone: input.phone,
        email: input.email,
        address: input.address,
        notes: input.notes,
        active: true,
      },
    });
  }

  static async getSupplierById(organizationId: string, id: string) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, organizationId },
      include: {
        purchases: {
          orderBy: { purchaseDate: 'desc' },
        },
      },
    });

    if (!supplier) {
      throw new AppError('Supplier not found.', 404);
    }

    return supplier;
  }
}
