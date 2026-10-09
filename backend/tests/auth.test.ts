import { describe, it, expect } from 'vitest';
import { PasswordUtil } from '../src/utils/password';
import { JWTUtil, SessionPayload } from '../src/utils/jwt';
import { AuthValidators } from '../src/validators/authValidators';

describe('Auth Utilities & RBAC Validations', () => {
  it('should hash and compare passwords correctly', async () => {
    const rawPassword = 'SecurePassword123!';
    const hashed = await PasswordUtil.hash(rawPassword);

    expect(hashed).not.toBe(rawPassword);

    const isValid = await PasswordUtil.compare(rawPassword, hashed);
    expect(isValid).toBe(true);

    const isWrong = await PasswordUtil.compare('WrongPassword123!', hashed);
    expect(isWrong).toBe(false);
  });

  it('should validate password strength rules', () => {
    expect(PasswordUtil.validateStrength('short').valid).toBe(false);
    expect(PasswordUtil.validateStrength('nouppercase123').valid).toBe(false);
    expect(PasswordUtil.validateStrength('NOLOWERCASE123').valid).toBe(false);
    expect(PasswordUtil.validateStrength('NoDigitsHere').valid).toBe(false);
    expect(PasswordUtil.validateStrength('ValidPass123').valid).toBe(true);
  });

  it('should encode and verify JWT session payload correctly', () => {
    const payload: SessionPayload = {
      userId: 'user-123',
      organizationId: 'org-456',
      email: 'owner@pharmacy.com',
      fullName: 'Dr. Pharmacy Owner',
      roles: ['OWNER'],
      permissions: ['products.create', 'sales.create'],
    };

    const token = JWTUtil.generateToken(payload);
    expect(typeof token).toBe('string');

    const decoded = JWTUtil.verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe('user-123');
    expect(decoded?.organizationId).toBe('org-456');
    expect(decoded?.roles).toContain('OWNER');
    expect(decoded?.permissions).toContain('sales.create');
  });

  it('should reject invalid registration input', () => {
    expect(() =>
      AuthValidators.validateRegisterOwner({
        pharmacyName: '',
        email: 'invalid-email',
        username: 'ab',
        password: '123',
        fullName: '',
      })
    ).toThrow();
  });
});
