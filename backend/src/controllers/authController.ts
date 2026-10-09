import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AuthValidators } from '../validators/authValidators';
import { COOKIE_NAME } from '../middleware/authMiddleware';
import { config } from '../config';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: config.isProduction,
  sameSite: (config.isProduction ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});

export class AuthController {
  static registerOwner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedInput = AuthValidators.validateRegisterOwner(req.body);
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.registerOwner(validatedInput, ip, userAgent);

      res.cookie(COOKIE_NAME, result.token, getCookieOptions());

      res.status(201).json({
        status: 'success',
        message: 'Pharmacy organization & owner account registered successfully.',
        data: {
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  static login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedInput = AuthValidators.validateLogin(req.body);
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.login(validatedInput, ip, userAgent);

      res.cookie(COOKIE_NAME, result.token, getCookieOptions());

      res.status(200).json({
        status: 'success',
        message: 'Logged in successfully.',
        data: {
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  static logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.context?.userId && req.context?.organizationId) {
        const ip = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        await AuthService.recordLogout(req.context.organizationId, req.context.userId, ip, userAgent);
      }

      res.clearCookie(COOKIE_NAME, getCookieOptions());

      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  static me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.context?.userId) {
        res.status(401).json({ status: 'error', message: 'Not authenticated' });
        return;
      }

      const currentUser = await AuthService.getCurrentUser(req.context.userId);

      res.status(200).json({
        status: 'success',
        data: {
          user: currentUser,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
