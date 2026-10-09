import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AuditLogService } from '../services/auditLogService';
import { logger } from '../utils/logger';

export class AuditLogController {
  static async getAuditLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const organizationId = req.user!.organizationId;
      const { userId, action, entity, startDate, endDate, page, limit } = req.query;

      const result = await AuditLogService.getAuditLogs(organizationId, {
        userId: userId as string | undefined,
        action: action as string | undefined,
        entity: entity as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error fetching audit logs:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to retrieve audit logs' });
    }
  }
}
