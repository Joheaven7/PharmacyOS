import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const attemptStore = new Map<string, RateLimitRecord>();

export const createRateLimiter = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    const record = attemptStore.get(key);

    if (!record) {
      attemptStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (now > record.resetTime) {
      attemptStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxAttempts) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.status(429).json({
        status: 'error',
        statusCode: 429,
        message: `Too many attempts. Please try again after ${retryAfterSeconds} seconds.`,
      });
      return;
    }

    record.count += 1;
    next();
  };
};

export const loginRateLimiter = createRateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 mins
