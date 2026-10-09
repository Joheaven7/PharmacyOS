import { describe, it, expect } from 'vitest';
import { PurchasingValidators } from '../src/validators/purchasingValidators';

describe('Suppliers & Purchasing Validation Logic', () => {
  it('should validate supplier creation payload', () => {
    const validated = PurchasingValidators.validateCreateSupplier({
      name: 'MedPharma Wholesale Ltd',
      contactPerson: 'Sarah Jenkins',
      phone: '+251911223344',
      email: 'orders@medpharma.com',
      address: 'Bole Road, Addis Ababa',
    });

    expect(validated.name).toBe('MedPharma Wholesale Ltd');
    expect(validated.email).toBe('orders@medpharma.com');
  });

  it('should validate purchase receiving payload with 500 units of Paracetamol', () => {
    const futureDate = new Date(Date.now() + 86400000 * 365).toISOString().split('T')[0];

    const validated = PurchasingValidators.validateCreatePurchase({
      supplierId: 'supplier-123',
      invoiceNumber: 'INV-2026-001',
      items: [
        {
          medicineId: 'med-paracetamol-500',
          batchNumber: 'BATCH-2026-X',
          expiryDate: futureDate,
          quantity: 500,
          purchasePrice: 2.5,
          sellingPrice: 5.0,
        },
      ],
    });

    expect(validated.supplierId).toBe('supplier-123');
    expect(validated.invoiceNumber).toBe('INV-2026-001');
    expect(validated.items).toHaveLength(1);
    expect(validated.items[0].quantity).toBe(500);
    expect(validated.items[0].purchasePrice).toBe(2.5);
  });

  it('should reject purchase receiving with expired line item date', () => {
    expect(() =>
      PurchasingValidators.validateCreatePurchase({
        supplierId: 'supplier-123',
        invoiceNumber: 'INV-EXPIRED',
        items: [
          {
            medicineId: 'med-123',
            batchNumber: 'B100',
            expiryDate: '2020-01-01',
            quantity: 100,
            purchasePrice: 2.5,
            sellingPrice: 5.0,
          },
        ],
      })
    ).toThrow();
  });
});
