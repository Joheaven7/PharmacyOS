import { Request, Response, NextFunction } from 'express';
import { SupplierService } from '../services/supplierService';
import { PurchasingValidators } from '../validators/purchasingValidators';

export class SupplierController {
  static listSuppliers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const suppliers = await SupplierService.listSuppliers(organizationId);

      res.status(200).json({
        status: 'success',
        data: { suppliers },
      });
    } catch (error) {
      next(error);
    }
  };

  static createSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const validatedInput = PurchasingValidators.validateCreateSupplier(req.body);
      const supplier = await SupplierService.createSupplier(organizationId, validatedInput);

      res.status(201).json({
        status: 'success',
        message: `Supplier '${supplier.name}' created successfully.`,
        data: { supplier },
      });
    } catch (error) {
      next(error);
    }
  };

  static getSupplierById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const { id } = req.params;

      const supplier = await SupplierService.getSupplierById(organizationId, id);

      res.status(200).json({
        status: 'success',
        data: { supplier },
      });
    } catch (error) {
      next(error);
    }
  };
}
