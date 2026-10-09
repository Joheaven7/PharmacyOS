import { PrismaClient, ReturnCondition } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { ProcessSaleReturnInput, DeclareDamageInput, DisposeExpiredInput } from '../validators/returnsValidators';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class ReturnService {
  private static async generateReturnNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RET-${year}-`;

    const lastRet = await prisma.saleReturn.findFirst({
      where: {
        organizationId,
        returnNumber: { startsWith: prefix },
      },
      orderBy: { createdAt: 'desc' },
      select: { returnNumber: true },
    });

    if (!lastRet) return `${prefix}00001`;

    const lastNumStr = lastRet.returnNumber.replace(prefix, '');
    const lastNum = parseInt(lastNumStr, 10);
    const nextNum = isNaN(lastNum) ? 1 : lastNum + 1;

    return `${prefix}${String(nextNum).padStart(5, '0')}`;
  }

  static async processSaleReturn(organizationId: string, cashierId: string, input: ProcessSaleReturnInput) {
    const sale = await prisma.sale.findFirst({
      where: { id: input.saleId, organizationId },
      include: {
        items: true,
        returns: { include: { items: true } },
      },
    });

    if (!sale) {
      throw new AppError('Target sale transaction not found.', 404);
    }

    const returnNumber = await this.generateReturnNumber(organizationId);

    // Calculate previous returned quantities per sale item
    const previouslyReturnedMap = new Map<string, number>();
    sale.returns.forEach((r) => {
      r.items.forEach((ri) => {
        const cur = previouslyReturnedMap.get(ri.batchId) || 0;
        previouslyReturnedMap.set(ri.batchId, cur + ri.quantity);
      });
    });

    const result = await prisma.$transaction(async (tx) => {
      let totalRefund = 0;
      const createdReturnItems = [];

      for (const retItem of input.items) {
        const originalSaleItem = sale.items.find(
          (si) => si.id === retItem.saleItemId && si.batchId === retItem.batchId
        );

        if (!originalSaleItem) {
          throw new AppError(
            `Sale item matching batch ID ${retItem.batchId} not found in original sale.`,
            400
          );
        }

        const prevReturned = previouslyReturnedMap.get(retItem.batchId) || 0;
        const maxReturnable = originalSaleItem.quantity - prevReturned;

        if (retItem.quantity > maxReturnable) {
          throw new AppError(
            `Cannot return ${retItem.quantity} units. Max returnable quantity for this item is ${maxReturnable}.`,
            400
          );
        }

        const refundForLine = retItem.quantity * originalSaleItem.unitPrice;
        totalRefund += refundForLine;

        // Inventory Stock Movement handling depending on inspected condition
        const isSellable = retItem.condition === 'SELLABLE';

        if (isSellable) {
          // Increment batch sellable quantity (+Qty)
          await tx.batch.update({
            where: { id: retItem.batchId },
            data: { quantity: { increment: retItem.quantity } },
          });
        }

        // CRITICAL INVENTORY RULE: Write immutable StockMovement
        await tx.stockMovement.create({
          data: {
            organizationId,
            medicineId: retItem.medicineId,
            batchId: retItem.batchId,
            type: 'RETURN',
            quantity: isSellable ? retItem.quantity : 0, // 0 sellable qty change for quarantine
            referenceType: 'CUSTOMER_RETURN',
            referenceId: sale.id,
            reason: `Return ${returnNumber} (${retItem.condition}): ${input.reason}`,
            userId: cashierId,
          },
        });

        createdReturnItems.push({
          medicineId: retItem.medicineId,
          batchId: retItem.batchId,
          quantity: retItem.quantity,
          refundAmount: refundForLine,
          condition: retItem.condition as ReturnCondition,
        });
      }

      // Create SaleReturn Header
      const saleReturn = await tx.saleReturn.create({
        data: {
          organizationId,
          saleId: sale.id,
          returnNumber,
          cashierId,
          totalRefund,
          reason: input.reason,
        },
      });

      // Create Return Items
      for (const cri of createdReturnItems) {
        await tx.returnItem.create({
          data: {
            returnId: saleReturn.id,
            ...cri,
          },
        });
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          organizationId,
          userId: cashierId,
          action: 'PROCESS_SALE_RETURN',
          entity: 'SaleReturn',
          entityId: saleReturn.id,
          metadata: {
            returnNumber,
            saleNumber: sale.saleNumber,
            totalRefund,
            itemCount: input.items.length,
          },
        },
      });

      return { saleReturn, totalRefund };
    });

    logger.info(`Sale Return processed: ${returnNumber} for Sale ${sale.saleNumber} (Refund: $${result.totalRefund})`);

    return result;
  }

  static async processDamageAdjustment(organizationId: string, userId: string, input: DeclareDamageInput) {
    const batch = await prisma.batch.findFirst({
      where: { id: input.batchId, organizationId, medicineId: input.medicineId },
    });

    if (!batch) {
      throw new AppError('Target batch not found.', 404);
    }

    if (batch.quantity < input.quantity) {
      throw new AppError(`Cannot declare ${input.quantity} damaged units. Available in batch: ${batch.quantity}.`, 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedBatch = await tx.batch.update({
        where: { id: batch.id },
        data: { quantity: { decrement: input.quantity } },
      });

      const movement = await tx.stockMovement.create({
        data: {
          organizationId,
          medicineId: input.medicineId,
          batchId: batch.id,
          type: 'DAMAGE',
          quantity: -input.quantity, // Negative OUT
          referenceType: 'DAMAGE_DISPOSAL',
          reason: input.reason,
          userId,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'DECLARE_DAMAGE_STOCK',
          entity: 'Batch',
          entityId: batch.id,
          metadata: { batchNumber: batch.batchNumber, quantity: input.quantity, reason: input.reason },
        },
      });

      return { batch: updatedBatch, movement };
    });

    logger.info(`Damage stock declared: ${input.quantity} units from Batch ${batch.batchNumber}`);

    return result;
  }

  static async processExpiredStockDisposal(organizationId: string, userId: string, input: DisposeExpiredInput) {
    const batch = await prisma.batch.findFirst({
      where: { id: input.batchId, organizationId, medicineId: input.medicineId },
    });

    if (!batch) {
      throw new AppError('Target batch not found.', 404);
    }

    const expiredQty = batch.quantity;

    const result = await prisma.$transaction(async (tx) => {
      const updatedBatch = await tx.batch.update({
        where: { id: batch.id },
        data: {
          quantity: 0,
          status: 'EXPIRED',
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          organizationId,
          medicineId: input.medicineId,
          batchId: batch.id,
          type: 'EXPIRY',
          quantity: -expiredQty, // Negative OUT
          referenceType: 'EXPIRY_DISPOSAL',
          reason: input.reason,
          userId,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'DISPOSE_EXPIRED_STOCK',
          entity: 'Batch',
          entityId: batch.id,
          metadata: { batchNumber: batch.batchNumber, quantity: expiredQty, reason: input.reason },
        },
      });

      return { batch: updatedBatch, movement };
    });

    logger.info(`Expired stock disposed: ${expiredQty} units from Batch ${batch.batchNumber}`);

    return result;
  }

  static async listReturns(organizationId: string) {
    return prisma.saleReturn.findMany({
      where: { organizationId },
      include: {
        sale: { select: { saleNumber: true } },
        cashier: { select: { fullName: true } },
        items: {
          include: {
            medicine: { select: { name: true } },
            batch: { select: { batchNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
