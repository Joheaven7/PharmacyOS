import { describe, it, expect } from 'vitest';
import { ImportService } from '../src/services/importService';

describe('CSV Data Import Engine Unit Tests', () => {
  it('Parses CSV string content into structured object rows', () => {
    const csvContent = `Product Name,Category,Barcode,SKU,Unit,Batch Number,Expiry Date,Quantity,Purchase Price,Selling Price
Paracetamol 500mg,Analgesics,8901234567890,PAR-500,BOX,LOT-100,2028-12-31,50,2.50,5.00`;

    const parsed = ImportService.parseCSVString(csvContent);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('Paracetamol 500mg');
    expect(parsed[0].barcode).toBe('8901234567890');
    expect(parsed[0].sku).toBe('PAR-500');
    expect(parsed[0].batchNumber).toBe('LOT-100');
    expect(parsed[0].quantity).toBe('50');
  });

  it('Catches missing required product name in CSV validation', async () => {
    const rows = [
      {
        name: '',
        barcode: '11223344',
      },
    ];

    const preview = await ImportService.previewImport('mock-org-id', rows as any);
    expect(preview.summary.canImport).toBe(false);
    expect(preview.summary.invalidCount).toBe(1);
    expect(preview.previewRows[0].errors).toContain('Product Name is required');
  });
});
