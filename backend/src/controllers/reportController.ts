import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { ReportService } from '../services/reportService';
import { logger } from '../utils/logger';

export class ReportController {
  static async getSalesReport(req: AuthenticatedRequest, res: Response) {
    try {
      const organizationId = req.user!.organizationId;
      const { startDate, endDate, paymentMethod } = req.query;

      const report = await ReportService.getSalesReport(organizationId, {
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        paymentMethod: paymentMethod as string | undefined,
      });

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      logger.error('Error fetching sales report:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to generate sales report' });
    }
  }

  static async exportSalesCSV(req: AuthenticatedRequest, res: Response) {
    try {
      const organizationId = req.user!.organizationId;
      const { startDate, endDate, paymentMethod } = req.query;

      const report = await ReportService.getSalesReport(organizationId, {
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        paymentMethod: paymentMethod as string | undefined,
      });

      const csv = ReportService.generateSalesCSV(report);
      const filename = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error: any) {
      logger.error('Error exporting sales CSV:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to export sales CSV' });
    }
  }

  static async getInventoryReport(req: AuthenticatedRequest, res: Response) {
    try {
      const organizationId = req.user!.organizationId;

      const report = await ReportService.getInventoryReport(organizationId);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      logger.error('Error fetching inventory report:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to generate inventory report' });
    }
  }

  static async exportInventoryCSV(req: AuthenticatedRequest, res: Response) {
    try {
      const organizationId = req.user!.organizationId;

      const report = await ReportService.getInventoryReport(organizationId);
      const csv = ReportService.generateInventoryCSV(report);
      const filename = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error: any) {
      logger.error('Error exporting inventory CSV:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to export inventory CSV' });
    }
  }

  static async getStockMovementReport(req: AuthenticatedRequest, res: Response) {
    try {
      const organizationId = req.user!.organizationId;
      const { startDate, endDate, type, medicineId, batchId } = req.query;

      const report = await ReportService.getStockMovementReport(organizationId, {
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        type: type as string | undefined,
        medicineId: medicineId as string | undefined,
        batchId: batchId as string | undefined,
      });

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      logger.error('Error fetching stock movement report:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to generate stock movement report' });
    }
  }

  static async exportStockMovementsCSV(req: AuthenticatedRequest, res: Response) {
    try {
      const organizationId = req.user!.organizationId;
      const { startDate, endDate, type, medicineId, batchId } = req.query;

      const report = await ReportService.getStockMovementReport(organizationId, {
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        type: type as string | undefined,
        medicineId: medicineId as string | undefined,
        batchId: batchId as string | undefined,
      });

      const csv = ReportService.generateStockMovementsCSV(report);
      const filename = `stock-movements-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error: any) {
      logger.error('Error exporting stock movements CSV:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to export stock movements CSV' });
    }
  }
}
