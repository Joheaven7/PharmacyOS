import { describe, it, expect } from 'vitest';
import { MedicineValidators } from '../src/validators/medicineValidators';

describe('Medicine & Barcode Validation Logic', () => {
  it('should validate valid medicine creation payload', () => {
    const payload = {
      name: 'Paracetamol 500mg',
      genericName: 'Acetaminophen',
      brandName: 'Panadol',
      strength: '500mg',
      dosageForm: 'TABLET',
      barcode: '1234567890123',
      unit: 'BOX',
    };

    const validated = MedicineValidators.validateCreateMedicine(payload);
    expect(validated.name).toBe('Paracetamol 500mg');
    expect(validated.dosageForm).toBe('TABLET');
    expect(validated.barcode).toBe('1234567890123');
    expect(validated.unit).toBe('BOX');
  });

  it('should reject medicine creation missing required name', () => {
    expect(() =>
      MedicineValidators.validateCreateMedicine({
        name: '',
        strength: '500mg',
      })
    ).toThrow();
  });

  it('should validate category creation input', () => {
    const validated = MedicineValidators.validateCreateCategory({
      name: 'Antibiotics',
      description: 'Prescription antimicrobial medications',
    });

    expect(validated.name).toBe('Antibiotics');
    expect(validated.description).toBe('Prescription antimicrobial medications');
  });
});
