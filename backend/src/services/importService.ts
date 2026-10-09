import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface CSVRowInput {
  name: string;
  category?: string;
  genericName?: string;
  brandName?: string;
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;
  barcode?: string;
  sku?: string;
  unit?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity?: string | number;
  purchasePrice?: string | number;
  sellingPrice?: string | number;
}

export interface ImportPreviewRow {
  rowNumber: number;
  data: CSVRowInput;
  status: 'VALID' | 'INVALID' | 'WARNING';
  errors: string[];
  warnings: string[];
}

export class ImportService {
  /**
   * Parse CSV content string into structured objects
   */
  static parseCSVString(csvContent: string): CSVRowInput[] {
    const lines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      throw new AppError('CSV file must contain a header row and at least one data row.', 400);
    }

    const header = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());

    const rows: CSVRowInput[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Basic CSV splitter respecting quoted fields
      const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
      const cleanValues = values.map((v) => v.replace(/^"|"$/g, '').trim());

      const row: Record<string, string> = {};

      header.forEach((h, index) => {
        const val = cleanValues[index] || '';
        if (h.includes('name') && !h.includes('generic') && !h.includes('brand') && !h.includes('category')) {
          row['name'] = val;
        } else if (h.includes('category')) {
          row['category'] = val;
        } else if (h.includes('generic')) {
          row['genericName'] = val;
        } else if (h.includes('brand')) {
          row['brandName'] = val;
        } else if (h.includes('strength')) {
          row['strength'] = val;
        } else if (h.includes('dosage') || h.includes('form')) {
          row['dosageForm'] = val;
        } else if (h.includes('manufacturer')) {
          row['manufacturer'] = val;
        } else if (h.includes('barcode')) {
          row['barcode'] = val;
        } else if (h.includes('sku')) {
          row['sku'] = val;
        } else if (h.includes('unit')) {
          row['unit'] = val;
        } else if (h.includes('batch')) {
          row['batchNumber'] = val;
        } else if (h.includes('expiry') || h.includes('exp')) {
          row['expiryDate'] = val;
        } else if (h.includes('qty') || h.includes('quantity')) {
          row['quantity'] = val;
        } else if (h.includes('cost') || h.includes('purchase')) {
          row['purchasePrice'] = val;
        } else if (h.includes('price') || h.includes('sell')) {
          row['sellingPrice'] = val;
        }
      });

      if (Object.keys(row).length > 0) {
        rows.push(row as unknown as CSVRowInput);
      }
    }

    return rows;
  }

  /**
   * Preview and validate import payload against database constraints
   */
  static async previewImport(organizationId: string, rows: CSVRowInput[]) {
    const existingMedicines = await prisma.medicine.findMany({
      where: { organizationId },
      select: { barcode: true, sku: true, name: true },
    });

    const existingBarcodes = new Set(existingMedicines.map((m) => m.barcode).filter(Boolean));
    const existingSKUs = new Set(existingMedicines.map((m) => m.sku).filter(Boolean));

    const seenBarcodesInBatch = new Set<string>();
    const seenSKUsInBatch = new Set<string>();

    const previewRows: ImportPreviewRow[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let warningCount = 0;

    rows.forEach((row, index) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!row.name || row.name.trim().length === 0) {
        errors.push('Product Name is required');
      }

      if (row.barcode && row.barcode.trim()) {
        const b = row.barcode.trim();
        if (existingBarcodes.has(b)) {
          errors.push(`Barcode "${b}" already exists in pharmacy database`);
        } else if (seenBarcodesInBatch.has(b)) {
          errors.push(`Duplicate barcode "${b}" inside CSV import file`);
        } else {
          seenBarcodesInBatch.add(b);
        }
      }

      if (row.sku && row.sku.trim()) {
        const s = row.sku.trim();
        if (existingSKUs.has(s)) {
          errors.push(`SKU "${s}" already exists in pharmacy database`);
        } else if (seenSKUsInBatch.has(s)) {
          errors.push(`Duplicate SKU "${s}" inside CSV import file`);
        } else {
          seenSKUsInBatch.add(s);
        }
      }

      if (row.batchNumber && row.batchNumber.trim()) {
        if (!row.expiryDate) {
          errors.push('Expiry date required when batch number is specified');
        } else {
          const exp = new Date(row.expiryDate);
          if (isNaN(exp.getTime())) {
            errors.push('Invalid expiry date format');
          } else if (exp <= new Date()) {
            warnings.push('Batch expiry date is in the past or expires today');
          }
        }

        const qty = Number(row.quantity);
        if (isNaN(qty) || qty < 0) {
          errors.push('Quantity must be a positive number');
        }

        const purchasePrice = Number(row.purchasePrice);
        if (isNaN(purchasePrice) || purchasePrice < 0) {
          errors.push('Purchase cost must be a non-negative number');
        }

        const sellingPrice = Number(row.sellingPrice);
        if (isNaN(sellingPrice) || sellingPrice < 0) {
          errors.push('Selling price must be a non-negative number');
        } else if (sellingPrice < purchasePrice) {
          warnings.push('Selling price is lower than purchase cost');
        }
      }

      let status: 'VALID' | 'INVALID' | 'WARNING' = 'VALID';
      if (errors.length > 0) {
        status = 'INVALID';
        invalidCount += 1;
      } else if (warnings.length > 0) {
        status = 'WARNING';
        warningCount += 1;
      } else {
        validCount += 1;
      }

      previewRows.push({
        rowNumber: index + 1,
        data: row,
        status,
        errors,
        warnings,
      });
    });

    return {
      summary: {
        totalRows: rows.length,
        validCount,
        invalidCount,
        warningCount,
        canImport: invalidCount === 0,
      },
      previewRows,
    };
  }

  /**
   * Execute atomic database import for validated rows
   */
  static async executeImport(organizationId: string, userId: string, rows: CSVRowInput[]) {
    // Re-verify preview to ensure zero errors before execution
    const preview = await this.previewImport(organizationId, rows);
    if (!preview.summary.canImport) {
      throw new AppError('Cannot execute import because the payload contains validation errors.', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      let medicinesCreated = 0;
      let categoriesCreated = 0;
      let batchesCreated = 0;
      let movementsCreated = 0;

      for (const row of rows) {
        let categoryId: string | undefined = undefined;

        if (row.category && row.category.trim()) {
          const catName = row.category.trim();
          const category = await tx.category.upsert({
            where: {
              organizationId_name: {
                organizationId,
                name: catName,
              },
            },
            update: {},
            create: {
              organizationId,
              name: catName,
            },
          });
          categoryId = category.id;
          categoriesCreated += 1;
        }

        const medicine = await tx.medicine.create({
          data: {
            organizationId,
            categoryId,
            name: row.name.trim(),
            genericName: row.genericName?.trim() || null,
            brandName: row.brandName?.trim() || null,
            strength: row.strength?.trim() || null,
            dosageForm: row.dosageForm?.trim() || null,
            manufacturer: row.manufacturer?.trim() || null,
            barcode: row.barcode?.trim() || null,
            sku: row.sku?.trim() || null,
            unit: row.unit?.trim().toUpperCase() || 'BOX',
            active: true,
          },
        });
        medicinesCreated += 1;

        if (row.batchNumber && row.batchNumber.trim()) {
          const qty = Number(row.quantity) || 0;
          const pPrice = Number(row.purchasePrice) || 0;
          const sPrice = Number(row.sellingPrice) || 0;
          const expDate = new Date(row.expiryDate!);

          const batch = await tx.batch.create({
            data: {
              organizationId,
              medicineId: medicine.id,
              batchNumber: row.batchNumber.trim(),
              expiryDate: expDate,
              quantity: qty,
              purchasePrice: pPrice,
              sellingPrice: sPrice,
              status: expDate <= new Date() ? 'EXPIRED' : 'ACTIVE',
            },
          });
          batchesCreated += 1;

          if (qty > 0) {
            await tx.stockMovement.create({
              data: {
                organizationId,
                medicineId: medicine.id,
                batchId: batch.id,
                type: 'ADJUSTMENT_IN',
                quantity: qty,
                referenceType: 'InitialImport',
                referenceId: medicine.id,
                reason: 'Initial CSV data migration stock intake',
                userId,
              },
            });
            movementsCreated += 1;
          }
        }
      }

      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'BULK_CSV_IMPORT',
          entity: 'Medicine',
          metadata: {
            medicinesCreated,
            categoriesCreated,
            batchesCreated,
            movementsCreated,
            totalRowsImported: rows.length,
          },
        },
      });

      return {
        medicinesCreated,
        categoriesCreated,
        batchesCreated,
        movementsCreated,
      };
    });

    logger.info(`Bulk CSV import executed successfully for Org ${organizationId}: ${result.medicinesCreated} medicines imported.`);
    return result;
  }
}
