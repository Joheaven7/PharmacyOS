import { AppError } from '../middleware/errorHandler';

export interface ReturnLineItemInput {
  saleItemId: string;
  medicineId: string;
  batchId: string;
  quantity: number;
  condition: 'SELLABLE' | 'DAMAGED' | 'EXPIRED' | 'QUARANTINED';
}

export interface ProcessSaleReturnInput {
  saleId: string;
  reason: string;
  items: ReturnLineItemInput[];
}

export interface DeclareDamageInput {
  medicineId: string;
  batchId: string;
  quantity: number;
  reason: string;
}

export interface DisposeExpiredInput {
  medicineId: string;
  batchId: string;
  reason: string;
}

export class ReturnsValidators {
  static validateProcessReturn(body: Record<string, unknown>): ProcessSaleReturnInput {
    const { saleId, reason, items } = body;

    if (!saleId || typeof saleId !== 'string') {
      throw new AppError('Sale ID is required for return processing.', 400);
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new AppError('A valid return reason is required.', 400);
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('Return request must specify at least one item.', 400);
    }

    const validConditions = ['SELLABLE', 'DAMAGED', 'EXPIRED', 'QUARANTINED'];

    const validatedItems: ReturnLineItemInput[] = items.map((item, idx) => {
      const { saleItemId, medicineId, batchId, quantity, condition } = item || {};

      if (!saleItemId || typeof saleItemId !== 'string') {
        throw new AppError(`Item #${idx + 1}: Sale Item ID is required.`, 400);
      }
      if (!medicineId || typeof medicineId !== 'string') {
        throw new AppError(`Item #${idx + 1}: Medicine ID is required.`, 400);
      }
      if (!batchId || typeof batchId !== 'string') {
        throw new AppError(`Item #${idx + 1}: Batch ID is required.`, 400);
      }

      const qty = Number(quantity);
      if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
        throw new AppError(`Item #${idx + 1}: Return quantity must be a positive integer greater than 0.`, 400);
      }

      const cond = condition ? String(condition).toUpperCase() : 'SELLABLE';
      if (!validConditions.includes(cond)) {
        throw new AppError(`Item #${idx + 1}: Invalid return condition.`, 400);
      }

      return {
        saleItemId: saleItemId.trim(),
        medicineId: medicineId.trim(),
        batchId: batchId.trim(),
        quantity: qty,
        condition: cond as 'SELLABLE' | 'DAMAGED' | 'EXPIRED' | 'QUARANTINED',
      };
    });

    return {
      saleId: saleId.trim(),
      reason: reason.trim(),
      items: validatedItems,
    };
  }

  static validateDeclareDamage(body: Record<string, unknown>): DeclareDamageInput {
    const { medicineId, batchId, quantity, reason } = body;

    if (!medicineId || typeof medicineId !== 'string') throw new AppError('Medicine ID is required.', 400);
    if (!batchId || typeof batchId !== 'string') throw new AppError('Batch ID is required.', 400);

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      throw new AppError('Damaged quantity must be a positive integer.', 400);
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new AppError('Damage reason is required.', 400);
    }

    return {
      medicineId: medicineId.trim(),
      batchId: batchId.trim(),
      quantity: qty,
      reason: reason.trim(),
    };
  }

  static validateDisposeExpired(body: Record<string, unknown>): DisposeExpiredInput {
    const { medicineId, batchId, reason } = body;

    if (!medicineId || typeof medicineId !== 'string') throw new AppError('Medicine ID is required.', 400);
    if (!batchId || typeof batchId !== 'string') throw new AppError('Batch ID is required.', 400);
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new AppError('Disposal reason is required.', 400);
    }

    return {
      medicineId: medicineId.trim(),
      batchId: batchId.trim(),
      reason: reason.trim(),
    };
  }
}
