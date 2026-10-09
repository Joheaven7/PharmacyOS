import { PrismaClient, PaymentMethod, StockMovementType } from '@prisma/client';
import { DEFAULT_ORGANIZATION_SETTINGS } from './organizationService';

const prisma = new PrismaClient();

export interface SalesReportQuery {
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
}

export interface StockMovementReportQuery {
  startDate?: string;
  endDate?: string;
  type?: string;
  medicineId?: string;
  batchId?: string;
}

export class ReportService {
  /**
   * Generates sales report with financial performance breakdown
   */
  static async getSalesReport(organizationId: string, query: SalesReportQuery) {
    const whereClause: Record<string, unknown> = {
      organizationId,
      status: 'COMPLETED',
    };

    if (query.startDate || query.endDate) {
      whereClause.createdAt = {};
      if (query.startDate) {
        (whereClause.createdAt as Record<string, Date>).gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        (whereClause.createdAt as Record<string, Date>).lte = end;
      }
    }

    if (query.paymentMethod && Object.values(PaymentMethod).includes(query.paymentMethod as PaymentMethod)) {
      whereClause.paymentMethod = query.paymentMethod;
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        cashier: { select: { id: true, fullName: true, username: true } },
        items: {
          include: {
            medicine: { select: { name: true, barcode: true, sku: true } },
            batch: { select: { batchNumber: true, purchasePrice: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalSubtotal = 0;
    let totalDiscount = 0;
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalItemsSold = 0;

    const paymentBreakdown = {
      CASH: 0,
      CARD: 0,
      DIGITAL: 0,
    };

    const formattedSales = sales.map((sale) => {
      totalSubtotal += sale.subtotal;
      totalDiscount += sale.discount;
      totalRevenue += sale.total;

      if (sale.paymentMethod in paymentBreakdown) {
        paymentBreakdown[sale.paymentMethod as keyof typeof paymentBreakdown] += sale.total;
      }

      let saleCOGS = 0;
      let saleItemsCount = 0;

      sale.items.forEach((item) => {
        saleItemsCount += item.quantity;
        totalItemsSold += item.quantity;
        const purchaseCost = item.batch?.purchasePrice || 0;
        saleCOGS += item.quantity * purchaseCost;
      });

      totalCOGS += saleCOGS;

      return {
        id: sale.id,
        saleNumber: sale.saleNumber,
        createdAt: sale.createdAt,
        cashierName: sale.cashier.fullName,
        paymentMethod: sale.paymentMethod,
        subtotal: sale.subtotal,
        discount: sale.discount,
        total: sale.total,
        cogs: saleCOGS,
        grossProfit: sale.total - saleCOGS,
        itemsCount: saleItemsCount,
      };
    });

    const grossProfit = totalRevenue - totalCOGS;
    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      summary: {
        totalSalesCount: sales.length,
        totalItemsSold,
        totalSubtotal,
        totalDiscount,
        totalRevenue,
        totalCOGS,
        grossProfit,
        grossProfitMargin: Number(grossProfitMargin.toFixed(2)),
        paymentBreakdown,
      },
      sales: formattedSales,
    };
  }

  /**
   * Generates inventory & lot valuation report
   */
  static async getInventoryReport(organizationId: string) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    const orgSettings = (org?.settings as Record<string, unknown>) || {};
    const lowStockThreshold = Number(orgSettings.lowStockThreshold ?? DEFAULT_ORGANIZATION_SETTINGS.lowStockThreshold);
    const expiryWarningDays = Number(orgSettings.expiryWarningDays ?? DEFAULT_ORGANIZATION_SETTINGS.expiryWarningDays);

    const now = new Date();
    const warningCutoff = new Date(now.getTime() + expiryWarningDays * 24 * 60 * 60 * 1000);

    const medicines = await prisma.medicine.findMany({
      where: { organizationId, active: true },
      include: {
        category: { select: { name: true } },
        batches: {
          where: { status: { not: 'DELETED' } },
          orderBy: { expiryDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    let totalMedicines = medicines.length;
    let totalBatches = 0;
    let totalStockUnits = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;

    const lowStockList: Array<{
      medicineId: string;
      name: string;
      barcode?: string | null;
      sku?: string | null;
      totalStock: number;
      category?: string | null;
    }> = [];

    const expiringBatchesList: Array<{
      medicineId: string;
      medicineName: string;
      batchId: string;
      batchNumber: string;
      expiryDate: Date;
      daysRemaining: number;
      quantity: number;
      purchasePrice: number;
      sellingPrice: number;
      isExpired: boolean;
    }> = [];

    const detailedInventory: Array<{
      medicineId: string;
      medicineName: string;
      category?: string | null;
      barcode?: string | null;
      sku?: string | null;
      unit: string;
      batchId: string;
      batchNumber: string;
      expiryDate: Date;
      quantity: number;
      purchasePrice: number;
      sellingPrice: number;
      costValuation: number;
      retailValuation: number;
      status: string;
    }> = [];

    medicines.forEach((med) => {
      const activeBatches = med.batches.filter(
        (b) => b.status === 'ACTIVE' && b.quantity > 0 && new Date(b.expiryDate) > now
      );
      const totalSellableStock = activeBatches.reduce((acc, b) => acc + b.quantity, 0);

      if (totalSellableStock <= lowStockThreshold) {
        lowStockList.push({
          medicineId: med.id,
          name: med.name,
          barcode: med.barcode,
          sku: med.sku,
          totalStock: totalSellableStock,
          category: med.category?.name,
        });
      }

      med.batches.forEach((b) => {
        if (b.status === 'ACTIVE' && b.quantity > 0) {
          totalBatches += 1;
          totalStockUnits += b.quantity;

          const costVal = b.quantity * b.purchasePrice;
          const retailVal = b.quantity * b.sellingPrice;

          totalCostValuation += costVal;
          totalRetailValuation += retailVal;

          const expDate = new Date(b.expiryDate);
          const daysRemaining = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isExpired = expDate <= now;

          if (expDate <= warningCutoff) {
            expiringBatchesList.push({
              medicineId: med.id,
              medicineName: med.name,
              batchId: b.id,
              batchNumber: b.batchNumber,
              expiryDate: b.expiryDate,
              daysRemaining,
              quantity: b.quantity,
              purchasePrice: b.purchasePrice,
              sellingPrice: b.sellingPrice,
              isExpired,
            });
          }

          detailedInventory.push({
            medicineId: med.id,
            medicineName: med.name,
            category: med.category?.name,
            barcode: med.barcode,
            sku: med.sku,
            unit: med.unit,
            batchId: b.id,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            quantity: b.quantity,
            purchasePrice: b.purchasePrice,
            sellingPrice: b.sellingPrice,
            costValuation: costVal,
            retailValuation: retailVal,
            status: isExpired ? 'EXPIRED' : 'ACTIVE',
          });
        }
      });
    });

    return {
      summary: {
        totalMedicines,
        totalBatches,
        totalStockUnits,
        totalCostValuation,
        totalRetailValuation,
        potentialGrossProfit: totalRetailValuation - totalCostValuation,
        lowStockCount: lowStockList.length,
        expiringBatchesCount: expiringBatchesList.length,
      },
      lowStockList,
      expiringBatchesList,
      detailedInventory,
    };
  }

  /**
   * Generates append-only stock movement ledger report
   */
  static async getStockMovementReport(organizationId: string, query: StockMovementReportQuery) {
    const whereClause: Record<string, unknown> = {
      organizationId,
    };

    if (query.startDate || query.endDate) {
      whereClause.createdAt = {};
      if (query.startDate) {
        (whereClause.createdAt as Record<string, Date>).gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        (whereClause.createdAt as Record<string, Date>).lte = end;
      }
    }

    if (query.type && Object.values(StockMovementType).includes(query.type as StockMovementType)) {
      whereClause.type = query.type;
    }

    if (query.medicineId) {
      whereClause.medicineId = query.medicineId;
    }

    if (query.batchId) {
      whereClause.batchId = query.batchId;
    }

    const movements = await prisma.stockMovement.findMany({
      where: whereClause,
      include: {
        medicine: { select: { id: true, name: true, barcode: true, sku: true } },
        batch: { select: { id: true, batchNumber: true, expiryDate: true } },
        user: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    let totalInboundUnits = 0;
    let totalOutboundUnits = 0;

    const formattedMovements = movements.map((m) => {
      if (m.quantity > 0) {
        totalInboundUnits += m.quantity;
      } else {
        totalOutboundUnits += Math.abs(m.quantity);
      }

      return {
        id: m.id,
        createdAt: m.createdAt,
        type: m.type,
        medicineName: m.medicine?.name || 'Deleted Medicine',
        barcode: m.medicine?.barcode,
        batchNumber: m.batch?.batchNumber || 'N/A',
        quantity: m.quantity,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        reason: m.reason,
        userName: m.user?.fullName || 'System',
      };
    });

    return {
      summary: {
        totalMovements: movements.length,
        totalInboundUnits,
        totalOutboundUnits,
        netQuantityChange: totalInboundUnits - totalOutboundUnits,
      },
      movements: formattedMovements,
    };
  }

  // --- CSV GENERATORS ---

  static generateSalesCSV(reportData: Awaited<ReturnType<typeof ReportService.getSalesReport>>): string {
    const headers = [
      'Sale Number',
      'Date & Time',
      'Cashier',
      'Payment Method',
      'Items Count',
      'Subtotal',
      'Discount',
      'Total Revenue',
      'COGS',
      'Gross Profit',
    ];

    const rows = reportData.sales.map((s) => [
      `"${s.saleNumber}"`,
      `"${new Date(s.createdAt).toISOString()}"`,
      `"${s.cashierName.replace(/"/g, '""')}"`,
      `"${s.paymentMethod}"`,
      s.itemsCount,
      s.subtotal.toFixed(2),
      s.discount.toFixed(2),
      s.total.toFixed(2),
      s.cogs.toFixed(2),
      s.grossProfit.toFixed(2),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  static generateInventoryCSV(reportData: Awaited<ReturnType<typeof ReportService.getInventoryReport>>): string {
    const headers = [
      'Medicine Name',
      'Category',
      'Barcode',
      'SKU',
      'Batch Number',
      'Expiry Date',
      'Quantity',
      'Unit',
      'Purchase Price',
      'Selling Price',
      'Total Cost Valuation',
      'Total Retail Valuation',
      'Status',
    ];

    const rows = reportData.detailedInventory.map((i) => [
      `"${i.medicineName.replace(/"/g, '""')}"`,
      `"${(i.category || '').replace(/"/g, '""')}"`,
      `"${i.barcode || ''}"`,
      `"${i.sku || ''}"`,
      `"${i.batchNumber}"`,
      `"${new Date(i.expiryDate).toISOString().split('T')[0]}"`,
      i.quantity,
      `"${i.unit}"`,
      i.purchasePrice.toFixed(2),
      i.sellingPrice.toFixed(2),
      i.costValuation.toFixed(2),
      i.retailValuation.toFixed(2),
      `"${i.status}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  static generateStockMovementsCSV(reportData: Awaited<ReturnType<typeof ReportService.getStockMovementReport>>): string {
    const headers = [
      'Date & Time',
      'Movement Type',
      'Medicine Name',
      'Barcode',
      'Batch Number',
      'Quantity Change',
      'Reference Type',
      'Reference ID',
      'Reason',
      'User',
    ];

    const rows = reportData.movements.map((m) => [
      `"${new Date(m.createdAt).toISOString()}"`,
      `"${m.type}"`,
      `"${m.medicineName.replace(/"/g, '""')}"`,
      `"${m.barcode || ''}"`,
      `"${m.batchNumber}"`,
      m.quantity,
      `"${m.referenceType || ''}"`,
      `"${m.referenceId || ''}"`,
      `"${(m.reason || '').replace(/"/g, '""')}"`,
      `"${m.userName.replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
