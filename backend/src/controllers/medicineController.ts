import { Request, Response, NextFunction } from 'express';
import { MedicineService } from '../services/medicineService';
import { MedicineValidators } from '../validators/medicineValidators';
import { AppError } from '../middleware/errorHandler';

export class MedicineController {
  // Categories
  static listCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const categories = await MedicineService.listCategories(organizationId);

      res.status(200).json({
        status: 'success',
        data: { categories },
      });
    } catch (error) {
      next(error);
    }
  };

  static createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const validatedInput = MedicineValidators.validateCreateCategory(req.body);
      const category = await MedicineService.createCategory(organizationId, validatedInput);

      res.status(201).json({
        status: 'success',
        message: `Category '${category.name}' created successfully.`,
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  };

  // Medicines
  static listMedicines = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const { search, categoryId, activeOnly, page, limit } = req.query;

      const result = await MedicineService.listMedicines(organizationId, {
        search: search ? String(search) : undefined,
        categoryId: categoryId ? String(categoryId) : undefined,
        activeOnly: activeOnly !== undefined ? activeOnly === 'true' : true,
        page: page ? parseInt(String(page), 10) : 1,
        limit: limit ? parseInt(String(limit), 10) : 50,
      });

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  static getMedicineByBarcode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const { barcode } = req.params;

      if (!barcode || barcode.trim().length === 0) {
        throw new AppError('Barcode parameter is required.', 400);
      }

      const medicine = await MedicineService.getMedicineByBarcode(organizationId, barcode);

      res.status(200).json({
        status: 'success',
        data: { medicine },
      });
    } catch (error) {
      next(error);
    }
  };

  static getMedicineById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const { id } = req.params;

      const medicine = await MedicineService.getMedicineById(organizationId, id);

      res.status(200).json({
        status: 'success',
        data: { medicine },
      });
    } catch (error) {
      next(error);
    }
  };

  static createMedicine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const userId = req.context.userId!;

      const validatedInput = MedicineValidators.validateCreateMedicine(req.body);
      const medicine = await MedicineService.createMedicine(organizationId, userId, validatedInput);

      res.status(201).json({
        status: 'success',
        message: `Medicine '${medicine.name}' added to catalog.`,
        data: { medicine },
      });
    } catch (error) {
      next(error);
    }
  };

  static updateMedicine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const userId = req.context.userId!;
      const { id } = req.params;

      const validatedInput = MedicineValidators.validateUpdateMedicine(req.body);
      const updated = await MedicineService.updateMedicine(organizationId, userId, id, validatedInput);

      res.status(200).json({
        status: 'success',
        message: `Medicine '${updated.name}' updated successfully.`,
        data: { medicine: updated },
      });
    } catch (error) {
      next(error);
    }
  };

  static archiveMedicine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId!;
      const userId = req.context.userId!;
      const { id } = req.params;

      const archived = await MedicineService.archiveMedicine(organizationId, userId, id);

      res.status(200).json({
        status: 'success',
        message: `Medicine '${archived.name}' archived successfully.`,
        data: { medicine: archived },
      });
    } catch (error) {
      next(error);
    }
  };
}
