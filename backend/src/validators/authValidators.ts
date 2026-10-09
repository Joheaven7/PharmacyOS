import { AppError } from '../middleware/errorHandler';

export interface RegisterOwnerInput {
  pharmacyName: string;
  legalName?: string;
  email: string;
  username: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface LoginInput {
  emailOrUsername: string;
  password: string;
}

export class AuthValidators {
  static validateRegisterOwner(body: Record<string, unknown>): RegisterOwnerInput {
    const { pharmacyName, legalName, email, username, password, fullName, phone } = body;

    if (!pharmacyName || typeof pharmacyName !== 'string' || pharmacyName.trim().length === 0) {
      throw new AppError('Pharmacy name is required.', 400);
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('Valid email address is required.', 400);
    }
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      throw new AppError('Username must be at least 3 characters long.', 400);
    }
    if (!password || typeof password !== 'string') {
      throw new AppError('Password is required.', 400);
    }
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
      throw new AppError('Full name is required.', 400);
    }

    return {
      pharmacyName: pharmacyName.trim(),
      legalName: legalName ? String(legalName).trim() : undefined,
      email: email.trim().toLowerCase(),
      username: username.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      phone: phone ? String(phone).trim() : undefined,
    };
  }

  static validateLogin(body: Record<string, unknown>): LoginInput {
    const { emailOrUsername, password } = body;

    if (!emailOrUsername || typeof emailOrUsername !== 'string' || emailOrUsername.trim().length === 0) {
      throw new AppError('Email or username is required.', 400);
    }
    if (!password || typeof password !== 'string' || password.length === 0) {
      throw new AppError('Password is required.', 400);
    }

    return {
      emailOrUsername: emailOrUsername.trim().toLowerCase(),
      password,
    };
  }
}
