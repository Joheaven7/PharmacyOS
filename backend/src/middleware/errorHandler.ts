import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`API Error: ${message}`, err, {
    url: req.originalUrl,
    method: req.method,
    requestId: req.context?.requestId,
  });

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    ...(config.isProduction ? {} : { stack: err.stack }),
    requestId: req.context?.requestId,
  });
};
