import { Request, Response, NextFunction } from 'express';
import { PurchaseService } from '../services/purchaseService';
import { PurchasingValidators } from '../validators/purchasingValidators';

export class PurchaseController {
  static listPurchases = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const purchases = await PurchaseService.listPurchases(organizationId);

      res.status(200).json({
        status: 'success',
        data: { purchases },
      });
    } catch (error) {
      next(error);
    }
  };

  static getPurchaseById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const { id } = req.params;

      const purchase = await PurchaseService.getPurchaseById(organizationId, id);

      res.status(200).json({
        status: 'success',
        data: { purchase },
      });
    } catch (error) {
      next(error);
    }
  };

  static createPurchase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const userId = req.context.userId!;

      const validatedInput = PurchasingValidators.validateCreatePurchase(req.body);
      const result = await PurchaseService.createAndReceivePurchase(organizationId, userId, validatedInput);

      res.status(201).json({
        status: 'success',
        message: `Purchase invoice '${result.purchase.invoiceNumber}' received successfully. Total: $${result.purchase.total}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
