import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export const enforceTenantIsolation = (req: Request, _res: Response, next: NextFunction): void => {
  const sessionOrgId = req.context?.organizationId;

  if (!sessionOrgId) {
    return next(new AppError('Tenant context missing. Request denied.', 403));
  }

  // Override any untrusted organizationId supplied in query or body with session context
  if (req.query && req.query.organizationId) {
    delete req.query.organizationId;
  }

  if (req.body && typeof req.body === 'object' && 'organizationId' in req.body) {
    delete req.body.organizationId;
  }

  next();
};
