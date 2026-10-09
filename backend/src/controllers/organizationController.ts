import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from '../services/organizationService';
import { OrganizationValidators } from '../validators/organizationValidators';
import { AppError } from '../middleware/errorHandler';

export class OrganizationController {
  static getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId;
      if (!organizationId) {
        throw new AppError('Tenant context missing.', 400);
      }

      const profile = await OrganizationService.getProfile(organizationId);

      res.status(200).json({
        status: 'success',
        data: { organization: profile },
      });
    } catch (error) {
      next(error);
    }
  };

  static updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId;
      const userId = req.context.userId;
      if (!organizationId || !userId) {
        throw new AppError('Tenant context missing.', 400);
      }

      const validatedInput = OrganizationValidators.validateUpdateProfile(req.body);
      const updatedProfile = await OrganizationService.updateProfile(organizationId, validatedInput, userId);

      res.status(200).json({
        status: 'success',
        message: 'Pharmacy organization profile updated successfully.',
        data: { organization: updatedProfile },
      });
    } catch (error) {
      next(error);
    }
  };
}
