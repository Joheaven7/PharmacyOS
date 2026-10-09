import { Request, Response, NextFunction } from 'express';
import { AnalyticsService, PeriodFilter } from '../services/analyticsService';

export class AnalyticsController {
  static getOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const { period } = req.query;

      const validPeriod = (period ? String(period) : 'today') as PeriodFilter;
      const overview = await AnalyticsService.getDashboardOverview(organizationId, validPeriod);

      res.status(200).json({
        status: 'success',
        data: { overview },
      });
    } catch (error) {
      next(error);
    }
  };

  static getTopProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const { period, limit } = req.query;

      const validPeriod = (period ? String(period) : '30days') as PeriodFilter;
      const limitNum = limit ? parseInt(String(limit), 10) : 5;

      const topProducts = await AnalyticsService.getTopSellingProducts(organizationId, validPeriod, limitNum);

      res.status(200).json({
        status: 'success',
        data: { topProducts },
      });
    } catch (error) {
      next(error);
    }
  };
}
