import { Request, Response, NextFunction } from 'express';
import { HealthService } from '../services/healthService';

export class HealthController {
  static getHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const health = await HealthService.checkHealth();
      const httpStatus = health.status === 'ok' ? 200 : 503;

      res.status(httpStatus).json({
        name: 'PharmacyOS API',
        version: '1.0.0',
        requestId: req.context?.requestId,
        ...health,
      });
    } catch (error) {
      next(error);
    }
  };
}
