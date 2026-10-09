import { Request, Response, NextFunction } from 'express';
import { ReturnService } from '../services/returnService';
import { ReturnsValidators } from '../validators/returnsValidators';

export class ReturnController {
  static processReturn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const cashierId = req.context.userId!;

      const validatedInput = ReturnsValidators.validateProcessReturn(req.body);
      const result = await ReturnService.processSaleReturn(organizationId, cashierId, validatedInput);

      res.status(201).json({
        status: 'success',
        message: `Sale return '${result.saleReturn.returnNumber}' processed successfully. Total Refund: $${result.totalRefund}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  static listReturns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const returns = await ReturnService.listReturns(organizationId);

      res.status(200).json({
        status: 'success',
        data: { returns },
      });
    } catch (error) {
      next(error);
    }
  };

  static declareDamage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const userId = req.context.userId!;

      const validatedInput = ReturnsValidators.validateDeclareDamage(req.body);
      const result = await ReturnService.processDamageAdjustment(organizationId, userId, validatedInput);

      res.status(200).json({
        status: 'success',
        message: `Damaged stock declared successfully. Batch ${result.batch.batchNumber} updated.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  static disposeExpired = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const userId = req.context.userId!;

      const validatedInput = ReturnsValidators.validateDisposeExpired(req.body);
      const result = await ReturnService.processExpiredStockDisposal(organizationId, userId, validatedInput);

      res.status(200).json({
        status: 'success',
        message: `Expired stock disposed. Batch ${result.batch.batchNumber} marked EXPIRED.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
