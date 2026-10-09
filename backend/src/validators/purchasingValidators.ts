import { AppError } from '../middleware/errorHandler';

export interface CreateSupplierInput {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface PurchaseItemInput {
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
}

export interface CreatePurchaseInput {
  supplierId: string;
  invoiceNumber: string;
  purchaseDate?: string;
  discount?: number;
  items: PurchaseItemInput[];
}

export class PurchasingValidators {
  static validateCreateSupplier(body: Record<string, unknown>): CreateSupplierInput {
    const { name, contactPerson, phone, email, address, notes } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError('Supplier name is required.', 400);
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      throw new AppError('Invalid supplier email format.', 400);
    }

    return {
      name: name.trim(),
      contactPerson: contactPerson ? String(contactPerson).trim() : undefined,
      phone: phone ? String(phone).trim() : undefined,
      email: email ? String(email).trim().toLowerCase() : undefined,
      address: address ? String(address).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined,
    };
  }

  static validateCreatePurchase(body: Record<string, unknown>): CreatePurchaseInput {
    const { supplierId, invoiceNumber, purchaseDate, discount, items } = body;

    if (!supplierId || typeof supplierId !== 'string') {
      throw new AppError('Supplier ID is required.', 400);
    }
    if (!invoiceNumber || typeof invoiceNumber !== 'string' || invoiceNumber.trim().length === 0) {
      throw new AppError('Purchase invoice number is required.', 400);
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('Purchase invoice must contain at least one line item.', 400);
    }

    const validatedItems: PurchaseItemInput[] = items.map((item, idx) => {
      const { medicineId, batchNumber, expiryDate, quantity, purchasePrice, sellingPrice } = item || {};

      if (!medicineId || typeof medicineId !== 'string') {
        throw new AppError(`Item #${idx + 1}: Medicine ID is required.`, 400);
      }
      if (!batchNumber || typeof batchNumber !== 'string' || batchNumber.trim().length === 0) {
        throw new AppError(`Item #${idx + 1}: Batch number is required.`, 400);
      }
      if (!expiryDate || typeof expiryDate !== 'string') {
        throw new AppError(`Item #${idx + 1}: Expiry date is required.`, 400);
      }

      const expDate = new Date(expiryDate);
      if (isNaN(expDate.getTime())) {
        throw new AppError(`Item #${idx + 1}: Invalid expiry date format.`, 400);
      }
      if (expDate <= new Date()) {
        throw new AppError(`Item #${idx + 1}: Expiry date must be a future date.`, 400);
      }

      const qty = Number(quantity);
      if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
        throw new AppError(`Item #${idx + 1}: Quantity must be a positive integer greater than 0.`, 400);
      }

      const pPrice = Number(purchasePrice);
      if (isNaN(pPrice) || pPrice < 0) {
        throw new AppError(`Item #${idx + 1}: Purchase price must be a non-negative number.`, 400);
      }

      const sPrice = Number(sellingPrice);
      if (isNaN(sPrice) || sPrice < 0) {
        throw new AppError(`Item #${idx + 1}: Selling price must be a non-negative number.`, 400);
      }

      return {
        medicineId: medicineId.trim(),
        batchNumber: batchNumber.trim().toUpperCase(),
        expiryDate: expDate.toISOString(),
        quantity: qty,
        purchasePrice: pPrice,
        sellingPrice: sPrice,
      };
    });

    return {
      supplierId: supplierId.trim(),
      invoiceNumber: invoiceNumber.trim().toUpperCase(),
      purchaseDate: purchaseDate ? new Date(String(purchaseDate)).toISOString() : new Date().toISOString(),
      discount: discount ? Number(discount) : 0,
      items: validatedItems,
    };
  }
}
