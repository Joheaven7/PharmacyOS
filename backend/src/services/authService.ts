import { PrismaClient } from '@prisma/client';
import { PasswordUtil } from '../utils/password';
import { JWTUtil, SessionPayload } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { RegisterOwnerInput, LoginInput } from '../validators/authValidators';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// System default roles & initial permission sets
const DEFAULT_PERMISSIONS = [
  { code: 'products.view', module: 'PRODUCTS', description: 'View product catalog' },
  { code: 'products.create', module: 'PRODUCTS', description: 'Create new products' },
  { code: 'products.edit', module: 'PRODUCTS', description: 'Modify existing products' },
  { code: 'products.archive', module: 'PRODUCTS', description: 'Archive products' },

  { code: 'inventory.view', module: 'INVENTORY', description: 'View inventory batches & stock' },
  { code: 'inventory.adjust', module: 'INVENTORY', description: 'Perform stock adjustments' },
  { code: 'inventory.receive', module: 'INVENTORY', description: 'Receive purchase stock' },

  { code: 'sales.view', module: 'SALES', description: 'View sales history' },
  { code: 'sales.create', module: 'SALES', description: 'Create POS sale' },
  { code: 'sales.return', module: 'SALES', description: 'Process customer returns' },

  { code: 'purchases.view', module: 'PURCHASES', description: 'View purchase invoices' },
  { code: 'purchases.create', module: 'PURCHASES', description: 'Create purchase orders' },

  { code: 'reports.view', module: 'REPORTS', description: 'View sales and inventory reports' },

  { code: 'users.view', module: 'USERS', description: 'View staff members' },
  { code: 'users.manage', module: 'USERS', description: 'Manage staff accounts & roles' },

  { code: 'settings.view', module: 'SETTINGS', description: 'View pharmacy settings' },
  { code: 'settings.manage', module: 'SETTINGS', description: 'Update pharmacy settings' },
];

export class AuthService {
  static async registerOwner(input: RegisterOwnerInput, ipAddress?: string, userAgent?: string) {
    const passwordValidation = PasswordUtil.validateStrength(input.password);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.message || 'Invalid password.', 400);
    }

    // Check duplicate accounts across global or pending orgs
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email }, { username: input.username }],
      },
    });

    if (existingUser) {
      throw new AppError('An account with this email or username already exists.', 409);
    }

    const passwordHash = await PasswordUtil.hash(input.password);

    // Atomic transaction creating Organization, Default Roles, User, and UserRole binding
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const org = await tx.organization.create({
        data: {
          name: input.pharmacyName,
          legalName: input.legalName || input.pharmacyName,
          email: input.email,
          phone: input.phone,
        },
      });

      // 2. Ensure default system permissions exist
      for (const perm of DEFAULT_PERMISSIONS) {
        await tx.permission.upsert({
          where: { code: perm.code },
          update: {},
          create: perm,
        });
      }

      const allPermissions = await tx.permission.findMany();

      // 3. Create System Roles for the Organization
      const ownerRole = await tx.role.create({
        data: {
          organizationId: org.id,
          name: 'Owner',
          code: 'OWNER',
          description: 'Full system access & business administration',
          isSystem: true,
        },
      });

      await tx.role.createMany({
        data: [
          { organizationId: org.id, name: 'Manager', code: 'MANAGER', description: 'Pharmacy manager with inventory & report controls', isSystem: true },
          { organizationId: org.id, name: 'Pharmacist', code: 'PHARMACIST', description: 'Licensed pharmacist handling dispensing & stock', isSystem: true },
          { organizationId: org.id, name: 'Cashier', code: 'CASHIER', description: 'POS sales cashier', isSystem: true },
        ],
      });

      // Bind all permissions to OWNER role
      await tx.rolePermission.createMany({
        data: allPermissions.map((p) => ({
          roleId: ownerRole.id,
          permissionId: p.id,
        })),
      });

      // 4. Create Owner User
      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          email: input.email,
          username: input.username,
          passwordHash,
          fullName: input.fullName,
          phone: input.phone,
          status: 'ACTIVE',
        },
      });

      // Bind user to OWNER role
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: ownerRole.id,
        },
      });

      // 5. Audit log entry
      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          action: 'REGISTER_OWNER',
          entity: 'Organization',
          entityId: org.id,
          metadata: { pharmacyName: org.name, ownerEmail: user.email },
          ipAddress,
          userAgent,
        },
      });

      return { org, user, roles: ['OWNER'], permissions: allPermissions.map((p) => p.code) };
    });

    const sessionPayload: SessionPayload = {
      userId: result.user.id,
      organizationId: result.org.id,
      email: result.user.email,
      fullName: result.user.fullName,
      roles: result.roles,
      permissions: result.permissions,
    };

    const token = JWTUtil.generateToken(sessionPayload);

    logger.info(`Pharmacy Owner registered successfully: ${result.user.email} (${result.org.name})`);

    return {
      user: {
        id: result.user.id,
        organizationId: result.org.id,
        organizationName: result.org.name,
        email: result.user.email,
        username: result.user.username,
        fullName: result.user.fullName,
        roles: result.roles,
        permissions: result.permissions,
      },
      token,
    };
  }

  static async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.emailOrUsername }, { username: input.emailOrUsername }],
      },
      include: {
        organization: true,
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      logger.warn(`Failed login attempt for identifier: ${input.emailOrUsername}`);
      throw new AppError('Invalid credentials.', 401);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Account is inactive or suspended. Please contact administrator.', 403);
    }

    const isPasswordValid = await PasswordUtil.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      await prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'LOGIN_FAILED',
          entity: 'User',
          entityId: user.id,
          metadata: { identifier: input.emailOrUsername, reason: 'Invalid password' },
          ipAddress,
          userAgent,
        },
      });

      logger.warn(`Failed login (wrong password) for user: ${user.email}`);
      throw new AppError('Invalid credentials.', 401);
    }

    // Extract roles and fine-grained permissions
    const roles = user.userRoles.map((ur) => ur.role.code);
    const permissionSet = new Set<string>();

    user.userRoles.forEach((ur) => {
      ur.role.permissions.forEach((rp) => {
        permissionSet.add(rp.permission.code);
      });
    });

    const permissions = Array.from(permissionSet);

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        entity: 'User',
        entityId: user.id,
        metadata: { loginTime: new Date() },
        ipAddress,
        userAgent,
      },
    });

    const sessionPayload: SessionPayload = {
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      fullName: user.fullName,
      roles,
      permissions,
    };

    const token = JWTUtil.generateToken(sessionPayload);

    logger.info(`User logged in successfully: ${user.email} [Org: ${user.organization.name}]`);

    return {
      user: {
        id: user.id,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        roles,
        permissions,
      },
      token,
    };
  }

  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User account not found.', 404);
    }

    const roles = user.userRoles.map((ur) => ur.role.code);
    const permissionSet = new Set<string>();

    user.userRoles.forEach((ur) => {
      ur.role.permissions.forEach((rp) => {
        permissionSet.add(rp.permission.code);
      });
    });

    return {
      id: user.id,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      status: user.status,
      roles,
      permissions: Array.from(permissionSet),
    };
  }

  static async recordLogout(organizationId: string, userId: string, ipAddress?: string, userAgent?: string) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'LOGOUT',
        entity: 'User',
        entityId: userId,
        ipAddress,
        userAgent,
      },
    });
  }
}
