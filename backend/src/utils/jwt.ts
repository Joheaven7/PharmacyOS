import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface SessionPayload {
  userId: string;
  organizationId: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

export class JWTUtil {
  static generateToken(payload: SessionPayload): string {
    return jwt.sign(payload, config.sessionSecret, {
      expiresIn: '24h',
    });
  }

  static verifyToken(token: string): SessionPayload | null {
    try {
      return jwt.verify(token, config.sessionSecret) as SessionPayload;
    } catch {
      return null;
    }
  }
}
