import { Request, Response, NextFunction } from 'express';
import { JWTUtil } from '../utils/jwt';
import { AppError } from './errorHandler';

export const COOKIE_NAME = 'pharmacyos_session';

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  let token = req.cookies?.[COOKIE_NAME];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Authentication required. Please log in.', 401));
  }

  const payload = JWTUtil.verifyToken(token);
  if (!payload) {
    return next(new AppError('Invalid or expired authentication session.', 401));
  }

  req.context.userId = payload.userId;
  req.context.organizationId = payload.organizationId;
  req.context.roles = payload.roles || [];
  req.context.permissions = payload.permissions || [];
  req.context.user = {
    id: payload.userId,
    organizationId: payload.organizationId,
    email: payload.email,
    fullName: payload.fullName,
    roles: payload.roles || [],
    permissions: payload.permissions || [],
  };

  next();
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.context.user) {
      return next(new AppError('Authentication required.', 401));
    }

    const userRoles = req.context.roles;
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return next(new AppError('Access denied. Insufficient role permissions.', 403));
    }

    next();
  };
};

export const requirePermission = (...allowedPermissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.context.user) {
      return next(new AppError('Authentication required.', 401));
    }

    const userPermissions = req.context.permissions;
    // OWNER system role has wildcard access to all permissions
    if (req.context.roles.includes('OWNER')) {
      return next();
    }

    const hasPermission = allowedPermissions.some((perm) => userPermissions.includes(perm));

    if (!hasPermission) {
      return next(new AppError(`Access denied. Missing required permission: ${allowedPermissions.join(', ')}`, 403));
    }

    next();
  };
};
