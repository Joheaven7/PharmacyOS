import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const requestContextMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();

  req.context = {
    requestId,
    roles: [],
    permissions: [],
  };

  next();
};
