import { PrismaClient, PaymentMethod } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { InventoryService } from './inventoryService';
import { CompleteSaleInput } from '../validators/salesValidators';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class SaleService {
  private static async generateSaleNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SALE-${year}-`;

    const lastSale = await prisma.sale.findFirst({
      where: {
        organizationId,
        saleNumber: { startsWith: prefix },
      },
      orderBy: { createdAt: 'desc' },
      select: { saleNumber: true },
    });

    if (!lastSale) {
      return `${prefix}00001`;
    }

    const lastNumStr = lastSale.saleNumber.replace(prefix, '');
    const lastNum = parseInt(lastNumStr, 10);
    const nextNum = isNaN(lastNum) ? 1 : lastNum + 1;

    return `${prefix}${String(nextNum).padStart(5, '0')}`;
  }

  static async completeSale(organizationId: string, cashierId: string, input: CompleteSaleInput) {
    const saleNumber = await this.generateSaleNumber(organizationId);

    // Atomic database transaction executing FEFO deductions, SaleItems, and Sale record creation
    const saleResult = await prisma.$transaction(async (tx) => {
      let subtotalSum = 0;
      const saleItemsToCreate: {
        medicineId: string;
        batchId: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }[] = [];

      for (const item of input.items) {
        // Execute FEFO stock deduction in transaction
        const allocations = await InventoryService.deductStockFEFOInTransaction(
          tx,
          organizationId,
          cashierId,
          item.medicineId,
          item.quantity,
          'SALE',
          undefined, // referenceId set after sale creation
          `POS Sale ${saleNumber}`
        );

        for (const alloc of allocations) {
          const lineSubtotal = alloc.quantityToDeduct * alloc.sellingPrice;
          subtotalSum += lineSubtotal;

          saleItemsToCreate.push({
            medicineId: item.medicineId,
            batchId: alloc.batchId,
            quantity: alloc.quantityToDeduct,
            unitPrice: alloc.sellingPrice,
            subtotal: lineSubtotal,
          });
        }
      }

      const discount = input.discount || 0;
      const total = Math.max(0, subtotalSum - discount);

      // Create Sale Header
      const sale = await tx.sale.create({
        data: {
          organizationId,
          saleNumber,
          cashierId,
          subtotal: subtotalSum,
          discount,
          total,
          paymentMethod: input.paymentMethod as PaymentMethod,
          status: 'COMPLETED',
        },
        include: {
          organization: true,
          cashier: { select: { id: true, fullName: true, username: true } },
        },
      });

      // Create Sale Items linked to created Sale
      const createdSaleItems = [];
      for (const sItem of saleItemsToCreate) {
        const itemCreated = await tx.saleItem.create({
          data: {
            saleId: sale.id,
            medicineId: sItem.medicineId,
            batchId: sItem.batchId,
            quantity: sItem.quantity,
            unitPrice: sItem.unitPrice,
            subtotal: sItem.subtotal,
          },
          include: {
            medicine: { select: { id: true, name: true, strength: true, dosageForm: true, barcode: true, unit: true } },
            batch: { select: { id: true, batchNumber: true, expiryDate: true } },
          },
        });
        createdSaleItems.push(itemCreated);
      }

      // Update StockMovement referenceId to sale.id
      await tx.stockMovement.updateMany({
        where: {
          organizationId,
          referenceType: 'SALE',
          reason: `POS Sale ${saleNumber}`,
        },
        data: {
          referenceId: sale.id,
        },
      });

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          organizationId,
          userId: cashierId,
          action: 'POS_SALE_COMPLETED',
          entity: 'Sale',
          entityId: sale.id,
          metadata: {
            saleNumber: sale.saleNumber,
            total: sale.total,
            paymentMethod: sale.paymentMethod,
            itemCount: input.items.length,
          },
        },
      });

      return {
        ...sale,
        items: createdSaleItems,
      };
    });

    logger.info(`POS Sale Completed: ${saleNumber} [Total: $${saleResult.total}]`);

    return saleResult;
  }

  static async listSales(organizationId: string) {
    return prisma.sale.findMany({
      where: { organizationId },
      include: {
        cashier: { select: { id: true, fullName: true, username: true } },
        items: {
          include: {
            medicine: { select: { id: true, name: true, barcode: true } },
            batch: { select: { id: true, batchNumber: true, expiryDate: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getSaleById(organizationId: string, id: string) {
    const sale = await prisma.sale.findFirst({
      where: { id, organizationId },
      include: {
        organization: true,
        cashier: { select: { id: true, fullName: true, username: true } },
        items: {
          include: {
            medicine: { select: { id: true, name: true, strength: true, dosageForm: true, barcode: true, unit: true } },
            batch: { select: { id: true, batchNumber: true, expiryDate: true } },
          },
        },
      },
    });

    if (!sale) {
      throw new AppError('Sale transaction record not found.', 404);
    }

    return sale;
  }
}
