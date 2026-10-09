import { describe, it, expect } from 'vitest';
import { SalesValidators } from '../src/validators/salesValidators';

describe('POS & Sales Validation Logic', () => {
  it('CASE 1: Validate valid POS sale payload with items and payment method', () => {
    const payload = {
      items: [
        { medicineId: 'med-paracetamol-500', quantity: 2 },
        { medicineId: 'med-amoxicillin-250', quantity: 1 },
      ],
      discount: 1.5,
      paymentMethod: 'CASH',
    };

    const validated = SalesValidators.validateCompleteSale(payload);
    expect(validated.items).toHaveLength(2);
    expect(validated.items[0].quantity).toBe(2);
    expect(validated.paymentMethod).toBe('CASH');
    expect(validated.discount).toBe(1.5);
  });

  it('CASE 4 & 6: Reject POS sale with empty cart or invalid payment method', () => {
    expect(() =>
      SalesValidators.validateCompleteSale({
        items: [],
        paymentMethod: 'CASH',
      })
    ).toThrow();

    expect(() =>
      SalesValidators.validateCompleteSale({
        items: [{ medicineId: 'med-123', quantity: 1 }],
        paymentMethod: 'INVALID_METHOD',
      })
    ).toThrow();
  });
});
