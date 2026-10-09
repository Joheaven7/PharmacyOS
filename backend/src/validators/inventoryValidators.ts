import { AppError } from '../middleware/errorHandler';

export interface ReceiveStockInput {
  medicineId: string;
  batchNumber: string;
  expiryDate: string; // ISO String (e.g. "2027-08-31")
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  supplierId?: string;
}

export interface AdjustStockInput {
  medicineId: string;
  batchId: string;
  direction: 'IN' | 'OUT';
  quantity: number; // Positive integer change
  reason: string;
}

export class InventoryValidators {
  static validateReceiveStock(body: Record<string, unknown>): ReceiveStockInput {
    const { medicineId, batchNumber, expiryDate, quantity, purchasePrice, sellingPrice, supplierId } = body;

    if (!medicineId || typeof medicineId !== 'string') {
      throw new AppError('Medicine ID is required.', 400);
    }
    if (!batchNumber || typeof batchNumber !== 'string' || batchNumber.trim().length === 0) {
      throw new AppError('Batch number is required.', 400);
    }

    if (!expiryDate || typeof expiryDate !== 'string') {
      throw new AppError('Expiry date is required.', 400);
    }

    const expDate = new Date(expiryDate);
    if (isNaN(expDate.getTime())) {
      throw new AppError('Invalid expiry date format. Use ISO YYYY-MM-DD.', 400);
    }

    if (expDate <= new Date()) {
      throw new AppError('Cannot receive stock with an expired expiry date.', 400);
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      throw new AppError('Quantity must be a positive integer greater than 0.', 400);
    }

    const pPrice = Number(purchasePrice);
    if (isNaN(pPrice) || pPrice < 0) {
      throw new AppError('Purchase price must be a non-negative number.', 400);
    }

    const sPrice = Number(sellingPrice);
    if (isNaN(sPrice) || sPrice < 0) {
      throw new AppError('Selling price must be a non-negative number.', 400);
    }

    return {
      medicineId: medicineId.trim(),
      batchNumber: batchNumber.trim().toUpperCase(),
      expiryDate: expDate.toISOString(),
      quantity: qty,
      purchasePrice: pPrice,
      sellingPrice: sPrice,
      supplierId: supplierId ? String(supplierId).trim() : undefined,
    };
  }

  static validateAdjustStock(body: Record<string, unknown>): AdjustStockInput {
    const { medicineId, batchId, direction, quantity, reason } = body;

    if (!medicineId || typeof medicineId !== 'string') {
      throw new AppError('Medicine ID is required.', 400);
    }
    if (!batchId || typeof batchId !== 'string') {
      throw new AppError('Batch ID is required.', 400);
    }

    if (!direction || (direction !== 'IN' && direction !== 'OUT')) {
      throw new AppError("Adjustment direction must be either 'IN' or 'OUT'.", 400);
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      throw new AppError('Adjustment quantity must be a positive integer.', 400);
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new AppError('A valid reason for stock adjustment is required.', 400);
    }

    return {
      medicineId: medicineId.trim(),
      batchId: batchId.trim(),
      direction,
      quantity: qty,
      reason: reason.trim(),
    };
  }
}
