import { describe, it, expect } from 'vitest';
import { ReturnsValidators } from '../src/validators/returnsValidators';

describe('Returns & Adjustments Validation Logic', () => {
  it('should validate valid customer sale return request', () => {
    const payload = {
      saleId: 'sale-123',
      reason: 'Customer brought back wrong dosage, unopened package.',
      items: [
        {
          saleItemId: 'sale-item-456',
          medicineId: 'med-789',
          batchId: 'batch-001',
          quantity: 2,
          condition: 'SELLABLE',
        },
      ],
    };

    const validated = ReturnsValidators.validateProcessReturn(payload);
    expect(validated.saleId).toBe('sale-123');
    expect(validated.items).toHaveLength(1);
    expect(validated.items[0].condition).toBe('SELLABLE');
    expect(validated.items[0].quantity).toBe(2);
  });

  it('should validate quarantined or damaged return condition', () => {
    const payload = {
      saleId: 'sale-123',
      reason: 'Package seal broken',
      items: [
        {
          saleItemId: 'sale-item-456',
          medicineId: 'med-789',
          batchId: 'batch-001',
          quantity: 1,
          condition: 'QUARANTINED',
        },
      ],
    };

    const validated = ReturnsValidators.validateProcessReturn(payload);
    expect(validated.items[0].condition).toBe('QUARANTINED');
  });

  it('should validate damage declaration input', () => {
    const validated = ReturnsValidators.validateDeclareDamage({
      medicineId: 'med-123',
      batchId: 'batch-456',
      quantity: 5,
      reason: 'Water leak damaged carton box',
    });

    expect(validated.quantity).toBe(5);
    expect(validated.reason).toBe('Water leak damaged carton box');
  });

  it('should reject invalid return quantity <= 0', () => {
    expect(() =>
      ReturnsValidators.validateProcessReturn({
        saleId: 'sale-123',
        reason: 'Testing invalid qty',
        items: [
          {
            saleItemId: 'si-1',
            medicineId: 'm-1',
            batchId: 'b-1',
            quantity: 0,
            condition: 'SELLABLE',
          },
        ],
      })
    ).toThrow();
  });
});
