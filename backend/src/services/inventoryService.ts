import { PrismaClient, StockMovementType, BatchStatus, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { ReceiveStockInput, AdjustStockInput } from '../validators/inventoryValidators';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface FEFOAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: Date;
  quantityToDeduct: number;
  purchasePrice: number;
  sellingPrice: number;
}

export class InventoryService {
  // --- 1. Receive Stock (Create / Update Batch & Record Stock Movement) ---
  static async receiveStockBatch(organizationId: string, userId: string, input: ReceiveStockInput) {
    // Ensure medicine exists in this organization
    const medicine = await prisma.medicine.findFirst({
      where: { id: input.medicineId, organizationId, active: true },
    });

    if (!medicine) {
      throw new AppError('Medicine not found or inactive.', 404);
    }

    const expiryDateObj = new Date(input.expiryDate);

    const result = await prisma.$transaction(async (tx) => {
      // Find existing batch or create a new one
      let batch = await tx.batch.findUnique({
        where: {
          organizationId_medicineId_batchNumber: {
            organizationId,
            medicineId: input.medicineId,
            batchNumber: input.batchNumber,
          },
        },
      });

      if (batch) {
        // Update quantity and price on existing batch
        batch = await tx.batch.update({
          where: { id: batch.id },
          data: {
            quantity: { increment: input.quantity },
            purchasePrice: input.purchasePrice,
            sellingPrice: input.sellingPrice,
            status: 'ACTIVE',
          },
        });
      } else {
        // Create new batch
        batch = await tx.batch.create({
          data: {
            organizationId,
            medicineId: input.medicineId,
            batchNumber: input.batchNumber,
            expiryDate: expiryDateObj,
            quantity: input.quantity,
            purchasePrice: input.purchasePrice,
            sellingPrice: input.sellingPrice,
            supplierId: input.supplierId,
            status: 'ACTIVE',
          },
        });
      }

      // CRITICAL INVENTORY RULE: Write immutable StockMovement entry
      const movement = await tx.stockMovement.create({
        data: {
          organizationId,
          medicineId: input.medicineId,
          batchId: batch.id,
          type: 'PURCHASE',
          quantity: input.quantity, // Positive IN
          referenceType: 'PURCHASE_RECEIVE',
          reason: 'Initial or restock inventory receiving',
          userId,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'RECEIVE_STOCK',
          entity: 'Batch',
          entityId: batch.id,
          metadata: { batchNumber: batch.batchNumber, quantity: input.quantity },
        },
      });

      return { batch, movement };
    });

    logger.info(`Stock received: ${input.quantity} units of ${medicine.name} (Batch ${input.batchNumber})`);

    return result;
  }

  // --- 2. Manual Controlled Stock Adjustment ---
  static async adjustStock(organizationId: string, userId: string, input: AdjustStockInput) {
    const batch = await prisma.batch.findFirst({
      where: {
        id: input.batchId,
        organizationId,
        medicineId: input.medicineId,
      },
    });

    if (!batch) {
      throw new AppError('Target inventory batch not found.', 404);
    }

    const movementType: StockMovementType =
      input.direction === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
    const quantityDelta = input.direction === 'IN' ? input.quantity : -input.quantity;

    // Check negative stock violation
    if (input.direction === 'OUT' && batch.quantity < input.quantity) {
      throw new AppError(
        `Insufficient stock in Batch ${batch.batchNumber}. Available: ${batch.quantity}, Requested adjustment: -${input.quantity}.`,
        400
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mutate batch quantity
      const updatedBatch = await tx.batch.update({
        where: { id: batch.id },
        data: {
          quantity: { increment: quantityDelta },
        },
      });

      // 2. CRITICAL RULE: Record StockMovement
      const movement = await tx.stockMovement.create({
        data: {
          organizationId,
          medicineId: input.medicineId,
          batchId: batch.id,
          type: movementType,
          quantity: quantityDelta,
          referenceType: 'MANUAL_ADJUSTMENT',
          reason: input.reason,
          userId,
        },
      });

      // 3. Audit Log
      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'ADJUST_STOCK',
          entity: 'Batch',
          entityId: batch.id,
          metadata: {
            batchNumber: batch.batchNumber,
            direction: input.direction,
            quantity: input.quantity,
            reason: input.reason,
          },
        },
      });

      return { batch: updatedBatch, movement };
    });

    return result;
  }

  // --- 3. FEFO (First Expire, First Out) Pure Allocation Resolver ---
  static async allocateStockFEFO(
    organizationId: string,
    medicineId: string,
    requestedQuantity: number
  ): Promise<FEFOAllocation[]> {
    if (requestedQuantity <= 0) {
      throw new AppError('Requested deduction quantity must be greater than 0.', 400);
    }

    const currentDate = new Date();

    // Query sellable active batches sorted by earliest expiry date first
    const activeBatches = await prisma.batch.findMany({
      where: {
        organizationId,
        medicineId,
        status: 'ACTIVE',
        quantity: { gt: 0 },
        expiryDate: { gt: currentDate }, // Ignore expired stock!
      },
      orderBy: { expiryDate: 'asc' }, // FEFO ordering
    });

    let remainingNeeded = requestedQuantity;
    const allocations: FEFOAllocation[] = [];

    for (const batch of activeBatches) {
      if (remainingNeeded <= 0) break;

      const takeQty = Math.min(batch.quantity, remainingNeeded);
      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantityToDeduct: takeQty,
        purchasePrice: batch.purchasePrice,
        sellingPrice: batch.sellingPrice,
      });

      remainingNeeded -= takeQty;
    }

    if (remainingNeeded > 0) {
      const totalAvailable = activeBatches.reduce((sum, b) => sum + b.quantity, 0);
      throw new AppError(
        `Insufficient sellable inventory. Requested: ${requestedQuantity}, Available unexpired stock: ${totalAvailable}.`,
        400
      );
    }

    return allocations;
  }

  // --- 4. FEFO Deduct Stock inside Prisma Transaction ---
  static async deductStockFEFOInTransaction(
    tx: Prisma.TransactionClient,
    organizationId: string,
    userId: string,
    medicineId: string,
    requestedQuantity: number,
    referenceType = 'SALE',
    referenceId?: string,
    reason?: string
  ): Promise<FEFOAllocation[]> {
    const currentDate = new Date();

    const activeBatches = await tx.batch.findMany({
      where: {
        organizationId,
        medicineId,
        status: 'ACTIVE',
        quantity: { gt: 0 },
        expiryDate: { gt: currentDate },
      },
      orderBy: { expiryDate: 'asc' },
    });

    let remainingNeeded = requestedQuantity;
    const allocations: FEFOAllocation[] = [];

    for (const batch of activeBatches) {
      if (remainingNeeded <= 0) break;

      const takeQty = Math.min(batch.quantity, remainingNeeded);

      // Decrement batch quantity
      await tx.batch.update({
        where: { id: batch.id },
        data: {
          quantity: { decrement: takeQty },
        },
      });

      // Record immutable StockMovement entry (negative quantity OUT)
      await tx.stockMovement.create({
        data: {
          organizationId,
          medicineId,
          batchId: batch.id,
          type: referenceType === 'SALE' ? 'SALE' : 'ADJUSTMENT_OUT',
          quantity: -takeQty,
          referenceType,
          referenceId,
          reason: reason || 'FEFO stock deduction',
          userId,
        },
      });

      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantityToDeduct: takeQty,
        purchasePrice: batch.purchasePrice,
        sellingPrice: batch.sellingPrice,
      });

      remainingNeeded -= takeQty;
    }

    if (remainingNeeded > 0) {
      const totalAvailable = activeBatches.reduce((sum, b) => sum + b.quantity, 0);
      throw new AppError(
        `Insufficient sellable inventory. Requested: ${requestedQuantity}, Available: ${totalAvailable}.`,
        400
      );
    }

    return allocations;
  }

  // --- 5. Inventory Overview & Medicine Stock Summaries ---
  static async getInventorySummary(organizationId: string, search?: string) {
    const currentDate = new Date();

    const whereClause: Record<string, unknown> = {
      organizationId,
      active: true,
    };

    if (search && search.trim().length > 0) {
      const q = search.trim();
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ];
    }

    const medicines = await prisma.medicine.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true } },
        batches: {
          where: { status: { not: 'DELETED' } },
          orderBy: { expiryDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return medicines.map((m) => {
      const activeBatches = m.batches.filter(
        (b) => b.status === 'ACTIVE' && b.quantity > 0 && new Date(b.expiryDate) > currentDate
      );
      const expiredBatches = m.batches.filter(
        (b) => new Date(b.expiryDate) <= currentDate && b.quantity > 0
      );

      const totalQuantity = m.batches.reduce((acc, b) => acc + b.quantity, 0);
      const sellableQuantity = activeBatches.reduce((acc, b) => acc + b.quantity, 0);
      const expiredQuantity = expiredBatches.reduce((acc, b) => acc + b.quantity, 0);

      const earliestExpiry = activeBatches.length > 0 ? activeBatches[0].expiryDate : null;

      return {
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        brandName: m.brandName,
        strength: m.strength,
        dosageForm: m.dosageForm,
        unit: m.unit,
        barcode: m.barcode,
        category: m.category,
        totalQuantity,
        sellableQuantity,
        expiredQuantity,
        activeBatchesCount: activeBatches.length,
        totalBatchesCount: m.batches.length,
        earliestExpiry,
      };
    });
  }

  // --- 6. Get Batches for Medicine ---
  static async getMedicineBatches(organizationId: string, medicineId: string) {
    return prisma.batch.findMany({
      where: { organizationId, medicineId, status: { not: 'DELETED' } },
      include: {
        movements: {
          include: { user: { select: { fullName: true, username: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  // --- 7. Get Stock Movement Ledger Audit Log ---
  static async getStockMovements(organizationId: string, limit = 100) {
    return prisma.stockMovement.findMany({
      where: { organizationId },
      include: {
        medicine: { select: { id: true, name: true, barcode: true } },
        batch: { select: { id: true, batchNumber: true, expiryDate: true } },
        user: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
