import { describe, it, expect } from 'vitest';
import { ReportService } from '../src/services/reportService';

describe('Executive Reporting Service Unit Tests', () => {
  it('Formats Sales Report CSV with correct headers and column structure', () => {
    const mockSalesReport = {
      summary: {
        totalSalesCount: 1,
        totalItemsSold: 3,
        totalSubtotal: 30.0,
        totalDiscount: 5.0,
        totalRevenue: 25.0,
        totalCOGS: 15.0,
        grossProfit: 10.0,
        grossProfitMargin: 40.0,
        paymentBreakdown: { CASH: 25.0, CARD: 0, DIGITAL: 0 },
      },
      sales: [
        {
          id: 'sale-001',
          saleNumber: 'SAL-202610-0001',
          createdAt: '2026-10-09T10:00:00.000Z',
          cashierName: 'John Pharmacist',
          paymentMethod: 'CASH',
          subtotal: 30.0,
          discount: 5.0,
          total: 25.0,
          cogs: 15.0,
          grossProfit: 10.0,
          itemsCount: 3,
        },
      ],
    };

    const csv = ReportService.generateSalesCSV(mockSalesReport as any);
    expect(csv).toContain('Sale Number,Date & Time,Cashier,Payment Method');
    expect(csv).toContain('"SAL-202610-0001"');
    expect(csv).toContain('"John Pharmacist"');
    expect(csv).toContain('25.00');
    expect(csv).toContain('10.00');
  });

  it('Formats Inventory Valuation CSV with lot cost and retail metrics', () => {
    const mockInventoryReport = {
      summary: {
        totalMedicines: 1,
        totalBatches: 1,
        totalStockUnits: 100,
        totalCostValuation: 500.0,
        totalRetailValuation: 1000.0,
        potentialGrossProfit: 500.0,
        lowStockCount: 0,
        expiringBatchesCount: 0,
      },
      lowStockList: [],
      expiringBatchesList: [],
      detailedInventory: [
        {
          medicineId: 'med-001',
          medicineName: 'Amoxicillin 500mg',
          category: 'Antibiotics',
          barcode: '8901234567890',
          sku: 'AMX-500',
          unit: 'BOX',
          batchId: 'batch-001',
          batchNumber: 'BN-9988',
          expiryDate: '2027-12-31T00:00:00.000Z',
          quantity: 100,
          purchasePrice: 5.0,
          sellingPrice: 10.0,
          costValuation: 500.0,
          retailValuation: 1000.0,
          status: 'ACTIVE',
        },
      ],
    };

    const csv = ReportService.generateInventoryCSV(mockInventoryReport as any);
    expect(csv).toContain('Medicine Name,Category,Barcode,SKU,Batch Number');
    expect(csv).toContain('"Amoxicillin 500mg"');
    expect(csv).toContain('"BN-9988"');
    expect(csv).toContain('500.00');
    expect(csv).toContain('1000.00');
  });

  it('Formats Stock Movements CSV with movement types and user attribution', () => {
    const mockMovementReport = {
      summary: {
        totalMovements: 1,
        totalInboundUnits: 100,
        totalOutboundUnits: 0,
        netQuantityChange: 100,
      },
      movements: [
        {
          id: 'mov-001',
          createdAt: '2026-10-09T10:00:00.000Z',
          type: 'PURCHASE',
          medicineName: 'Paracetamol 500mg',
          barcode: '12345678',
          batchNumber: 'LOT-100',
          quantity: 100,
          referenceType: 'Purchase',
          referenceId: 'pur-123',
          reason: 'Initial purchase stock receipt',
          userName: 'Admin User',
        },
      ],
    };

    const csv = ReportService.generateStockMovementsCSV(mockMovementReport as any);
    expect(csv).toContain('Date & Time,Movement Type,Medicine Name,Barcode');
    expect(csv).toContain('"PURCHASE"');
    expect(csv).toContain('"Paracetamol 500mg"');
    expect(csv).toContain('"Admin User"');
  });
});
