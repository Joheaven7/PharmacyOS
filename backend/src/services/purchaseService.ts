import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { CreatePurchaseInput } from '../validators/purchasingValidators';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class PurchaseService {
  static async createAndReceivePurchase(
    organizationId: string,
    userId: string,
    input: CreatePurchaseInput
  ) {
    // 1. Verify supplier exists in organization
    const supplier = await prisma.supplier.findFirst({
      where: { id: input.supplierId, organizationId, active: true },
    });

    if (!supplier) {
      throw new AppError('Supplier not found or inactive.', 404);
    }

    // 2. Check duplicate invoice number per supplier
    const existingInvoice = await prisma.purchase.findUnique({
      where: {
        organizationId_supplierId_invoiceNumber: {
          organizationId,
          supplierId: input.supplierId,
          invoiceNumber: input.invoiceNumber,
        },
      },
    });

    if (existingInvoice) {
      throw new AppError(
        `Invoice number '${input.invoiceNumber}' has already been received for supplier '${supplier.name}'.`,
        409
      );
    }

    // Calculate subtotal & total
    const subtotal = input.items.reduce((acc, item) => acc + item.quantity * item.purchasePrice, 0);
    const discount = input.discount || 0;
    const total = Math.max(0, subtotal - discount);

    // 3. Atomic Database Transaction
    const purchaseResult = await prisma.$transaction(async (tx) => {
      // Create Purchase Header
      const purchase = await tx.purchase.create({
        data: {
          organizationId,
          supplierId: input.supplierId,
          invoiceNumber: input.invoiceNumber,
          purchaseDate: new Date(input.purchaseDate || Date.now()),
          subtotal,
          discount,
          total,
          status: 'COMPLETED',
          createdById: userId,
        },
      });

      const createdItems = [];

      for (const item of input.items) {
        const expiryDateObj = new Date(item.expiryDate);

        // A. Find existing batch or create new
        let batch = await tx.batch.findUnique({
          where: {
            organizationId_medicineId_batchNumber: {
              organizationId,
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
            },
          },
        });

        if (batch) {
          batch = await tx.batch.update({
            where: { id: batch.id },
            data: {
              quantity: { increment: item.quantity },
              purchasePrice: item.purchasePrice,
              sellingPrice: item.sellingPrice,
              supplierId: input.supplierId,
              status: 'ACTIVE',
            },
          });
        } else {
          batch = await tx.batch.create({
            data: {
              organizationId,
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
              expiryDate: expiryDateObj,
              quantity: item.quantity,
              purchasePrice: item.purchasePrice,
              sellingPrice: item.sellingPrice,
              supplierId: input.supplierId,
              status: 'ACTIVE',
            },
          });
        }

        // B. Create Purchase Item Detail
        const purchaseItem = await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            medicineId: item.medicineId,
            batchId: batch.id,
            batchNumber: item.batchNumber,
            expiryDate: expiryDateObj,
            quantity: item.quantity,
            purchasePrice: item.purchasePrice,
            sellingPrice: item.sellingPrice,
            subtotal: item.quantity * item.purchasePrice,
          },
        });

        // C. CRITICAL INVENTORY RULE: Write StockMovement
        await tx.stockMovement.create({
          data: {
            organizationId,
            medicineId: item.medicineId,
            batchId: batch.id,
            type: 'PURCHASE',
            quantity: item.quantity,
            referenceType: 'PURCHASE_INVOICE',
            referenceId: purchase.id,
            reason: `Purchase Invoice ${purchase.invoiceNumber} from ${supplier.name}`,
            userId,
          },
        });

        createdItems.push(purchaseItem);
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'RECEIVE_PURCHASE_INVOICE',
          entity: 'Purchase',
          entityId: purchase.id,
          metadata: {
            invoiceNumber: purchase.invoiceNumber,
            supplierName: supplier.name,
            total,
            itemCount: input.items.length,
          },
        },
      });

      return { purchase, items: createdItems };
    });

    logger.info(`Purchase received: Invoice ${input.invoiceNumber} from ${supplier.name} (Total: $${total})`);

    return purchaseResult;
  }

  static async listPurchases(organizationId: string) {
    return prisma.purchase.findMany({
      where: { organizationId },
      include: {
        supplier: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
        items: {
          include: {
            medicine: { select: { id: true, name: true, barcode: true } },
          },
        },
      },
      orderBy: { purchaseDate: 'desc' },
    });
  }

  static async getPurchaseById(organizationId: string, id: string) {
    const purchase = await prisma.purchase.findFirst({
      where: { id, organizationId },
      include: {
        supplier: true,
        createdBy: { select: { id: true, fullName: true, username: true } },
        items: {
          include: {
            medicine: { select: { id: true, name: true, barcode: true, unit: true } },
          },
        },
      },
    });

    if (!purchase) {
      throw new AppError('Purchase record not found.', 404);
    }

    return purchase;
  }
}
