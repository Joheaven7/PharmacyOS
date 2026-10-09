import { Request, Response, NextFunction } from 'express';
import { AlertService } from '../services/alertService';

export class AlertController {
  static listAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const { type, status } = req.query;

      const alerts = await AlertService.listAlerts(
        organizationId,
        type ? String(type) : undefined,
        status ? String(status) : 'UNRESOLVED'
      );

      res.status(200).json({
        status: 'success',
        data: { alerts },
      });
    } catch (error) {
      next(error);
    }
  };

  static getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const summary = await AlertService.getAlertSummary(organizationId);

      res.status(200).json({
        status: 'success',
        data: { summary },
      });
    } catch (error) {
      next(error);
    }
  };

  static resolveAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const userId = req.context.userId!;
      const { id } = req.params;

      const updated = await AlertService.resolveAlert(organizationId, userId, id);

      res.status(200).json({
        status: 'success',
        message: 'Alert marked as resolved.',
        data: { alert: updated },
      });
    } catch (error) {
      next(error);
    }
  };
}
