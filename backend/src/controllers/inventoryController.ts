import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventoryService';
import { InventoryValidators } from '../validators/inventoryValidators';

export class InventoryController {
  static getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const { search } = req.query;

      const summary = await InventoryService.getInventorySummary(
        organizationId,
        search ? String(search) : undefined
      );

      res.status(200).json({
        status: 'success',
        data: { inventory: summary },
      });
    } catch (error) {
      next(error);
    }
  };

  static getBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const { medicineId } = req.params;

      const batches = await InventoryService.getMedicineBatches(organizationId, medicineId);

      res.status(200).json({
        status: 'success',
        data: { batches },
      });
    } catch (error) {
      next(error);
    }
  };

  static getMovements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const { limit } = req.query;

      const movements = await InventoryService.getStockMovements(
        organizationId,
        limit ? parseInt(String(limit), 10) : 100
      );

      res.status(200).json({
        status: 'success',
        data: { movements },
      });
    } catch (error) {
      next(error);
    }
  };

  static receiveStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const userId = req.context.userId!;

      const validatedInput = InventoryValidators.validateReceiveStock(req.body);
      const result = await InventoryService.receiveStockBatch(organizationId, userId, validatedInput);

      res.status(201).json({
        status: 'success',
        message: `Stock received successfully. Batch ${result.batch.batchNumber} updated to ${result.batch.quantity} units.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  static adjustStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const userId = req.context.userId!;

      const validatedInput = InventoryValidators.validateAdjustStock(req.body);
      const result = await InventoryService.adjustStock(organizationId, userId, validatedInput);

      res.status(200).json({
        status: 'success',
        message: `Stock adjustment completed. New batch quantity: ${result.batch.quantity}.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
