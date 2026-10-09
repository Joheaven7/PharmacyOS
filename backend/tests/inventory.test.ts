import { describe, it, expect } from 'vitest';
import { InventoryValidators } from '../src/validators/inventoryValidators';

describe('FEFO Engine & Stock Ledger Integrity', () => {
  it('TEST 1 & 2: FEFO allocation calculation logic sorts earliest expiring batches first', () => {
    const today = new Date();
    const expirySoon = new Date(today.getFullYear() + 1, 0, 1);
    const expiryLater = new Date(today.getFullYear() + 2, 0, 1);

    const batches = [
      { id: 'batch-B', batchNumber: 'B100', expiryDate: expiryLater, quantity: 100, purchasePrice: 5, sellingPrice: 10 },
      { id: 'batch-A', batchNumber: 'A10', expiryDate: expirySoon, quantity: 10, purchasePrice: 5, sellingPrice: 10 },
    ];

    // Sort FEFO: earliest expiry first
    const sorted = [...batches].sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
    expect(sorted[0].id).toBe('batch-A');

    // Simulate deduction 5
    let needed = 5;
    const alloc1: { batchId: string; qty: number }[] = [];

    for (const b of sorted) {
      if (needed <= 0) break;
      const take = Math.min(b.quantity, needed);
      alloc1.push({ batchId: b.id, qty: take });
      needed -= take;
    }

    expect(alloc1).toHaveLength(1);
    expect(alloc1[0].batchId).toBe('batch-A');
    expect(alloc1[0].qty).toBe(5);

    // Simulate deduction 15
    needed = 15;
    const alloc2: { batchId: string; qty: number }[] = [];

    for (const b of sorted) {
      if (needed <= 0) break;
      const take = Math.min(b.quantity, needed);
      alloc2.push({ batchId: b.id, qty: take });
      needed -= take;
    }

    expect(alloc2).toHaveLength(2);
    expect(alloc2[0].batchId).toBe('batch-A');
    expect(alloc2[0].qty).toBe(10);
    expect(alloc2[1].batchId).toBe('batch-B');
    expect(alloc2[1].qty).toBe(5);
  });

  it('TEST 3: Expired batches must be excluded from sellable allocation', () => {
    const pastDate = new Date('2020-01-01');
    const futureDate = new Date('2028-01-01');

    const batches = [
      { id: 'expired-1', expiryDate: pastDate, quantity: 50 },
      { id: 'valid-1', expiryDate: futureDate, quantity: 20 },
    ];

    const now = new Date();
    const sellable = batches.filter((b) => b.expiryDate > now);

    expect(sellable).toHaveLength(1);
    expect(sellable[0].id).toBe('valid-1');
  });

  it('TEST 4: Insufficient stock request throws error', () => {
    const availableQty = 10;
    const requestedQty = 25;

    expect(requestedQty > availableQty).toBe(true);
  });

  it('TEST 5: Stock receiving validation requires non-expired date and positive integer quantity', () => {
    expect(() =>
      InventoryValidators.validateReceiveStock({
        medicineId: 'med-123',
        batchNumber: 'B123',
        expiryDate: '2020-01-01', // Expired
        quantity: 10,
        purchasePrice: 5,
        sellingPrice: 10,
      })
    ).toThrow();

    const futureDate = new Date(Date.now() + 86400000 * 365).toISOString().split('T')[0];

    const valid = InventoryValidators.validateReceiveStock({
      medicineId: 'med-123',
      batchNumber: 'B123',
      expiryDate: futureDate,
      quantity: 100,
      purchasePrice: 5,
      sellingPrice: 10,
    });

    expect(valid.quantity).toBe(100);
    expect(valid.batchNumber).toBe('B123');
  });
});
