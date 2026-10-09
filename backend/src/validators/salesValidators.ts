import { AppError } from '../middleware/errorHandler';

export interface CartItemInput {
  medicineId: string;
  quantity: number;
}

export interface CompleteSaleInput {
  items: CartItemInput[];
  discount?: number;
  paymentMethod: 'CASH' | 'CARD' | 'DIGITAL';
}

export class SalesValidators {
  static validateCompleteSale(body: Record<string, unknown>): CompleteSaleInput {
    const { items, discount, paymentMethod } = body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('POS cart cannot be empty.', 400);
    }

    const validatedItems: CartItemInput[] = items.map((item, idx) => {
      const { medicineId, quantity } = item || {};

      if (!medicineId || typeof medicineId !== 'string') {
        throw new AppError(`Cart Item #${idx + 1}: Medicine ID is required.`, 400);
      }

      const qty = Number(quantity);
      if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
        throw new AppError(`Cart Item #${idx + 1}: Quantity must be a positive integer greater than 0.`, 400);
      }

      return {
        medicineId: medicineId.trim(),
        quantity: qty,
      };
    });

    const validPaymentMethods = ['CASH', 'CARD', 'DIGITAL'];
    const pMethod = paymentMethod ? String(paymentMethod).toUpperCase() : 'CASH';

    if (!validPaymentMethods.includes(pMethod)) {
      throw new AppError("Payment method must be 'CASH', 'CARD', or 'DIGITAL'.", 400);
    }

    return {
      items: validatedItems,
      discount: discount ? Math.max(0, Number(discount)) : 0,
      paymentMethod: pMethod as 'CASH' | 'CARD' | 'DIGITAL',
    };
  }
}
