import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { ImportService } from '../services/importService';
import { logger } from '../utils/logger';

export class ImportController {
  static async previewImport(req: AuthenticatedRequest, res: Response) {
    try {
      const organizationId = req.user!.organizationId;
      const { csvContent, rows } = req.body;

      let rowData = rows;
      if (csvContent && typeof csvContent === 'string') {
        rowData = ImportService.parseCSVString(csvContent);
      }

      if (!Array.isArray(rowData) || rowData.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid data rows supplied in import request.',
        });
      }

      const preview = await ImportService.previewImport(organizationId, rowData);

      res.status(200).json({
        success: true,
        data: preview,
      });
    } catch (error: any) {
      logger.error('Error previewing CSV import:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to preview CSV import' });
    }
  }

  static async executeImport(req: AuthenticatedRequest, res: Response) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.userId;
      const { rows } = req.body;

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No rows provided for execution.',
        });
      }

      const result = await ImportService.executeImport(organizationId, userId, rows);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error executing CSV import:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to execute CSV import' });
    }
  }
}
