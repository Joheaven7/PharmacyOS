import { Request, Response, NextFunction } from 'express';
import { SaleService } from '../services/saleService';
import { SalesValidators } from '../validators/salesValidators';

export class SaleController {
  static completeSale = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const cashierId = req.context.userId!;

      const validatedInput = SalesValidators.validateCompleteSale(req.body);
      const sale = await SaleService.completeSale(organizationId, cashierId, validatedInput);

      res.status(201).json({
        status: 'success',
        message: `Sale ${sale.saleNumber} completed successfully. Total: $${sale.total}.`,
        data: { sale },
      });
    } catch (error) {
      next(error);
    }
  };

  static listSales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const sales = await SaleService.listSales(organizationId);

      res.status(200).json({
        status: 'success',
        data: { sales },
      });
    } catch (error) {
      next(error);
    }
  };

  static getSaleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const { id } = req.params;

      const sale = await SaleService.getSaleById(organizationId, id);

      res.status(200).json({
        status: 'success',
        data: { sale },
      });
    } catch (error) {
      next(error);
    }
  };
}
