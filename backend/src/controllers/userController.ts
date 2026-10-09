import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { PasswordUtil } from '../utils/password';

const prisma = new PrismaClient();

export class UserController {
  static listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId;
      if (!organizationId) {
        throw new AppError('Tenant context missing.', 400);
      }

      const users = await prisma.user.findMany({
        where: { organizationId },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          phone: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          userRoles: {
            select: {
              role: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formattedUsers = users.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        fullName: u.fullName,
        phone: u.phone,
        status: u.status,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        roles: u.userRoles.map((ur) => ur.role.code),
      }));

      res.status(200).json({
        status: 'success',
        data: { users: formattedUsers },
      });
    } catch (error) {
      next(error);
    }
  };

  static createStaffUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.context.organizationId;
      if (!organizationId) {
        throw new AppError('Tenant context missing.', 400);
      }

      const { email, username, password, fullName, phone, roleCode } = req.body;

      if (!email || !username || !password || !fullName || !roleCode) {
        throw new AppError('Missing required fields (email, username, password, fullName, roleCode).', 400);
      }

      const passwordValidation = PasswordUtil.validateStrength(password);
      if (!passwordValidation.valid) {
        throw new AppError(passwordValidation.message || 'Invalid password.', 400);
      }

      const targetRole = await prisma.role.findFirst({
        where: {
          organizationId,
          code: roleCode.toUpperCase(),
        },
      });

      if (!targetRole) {
        throw new AppError(`Role '${roleCode}' not found for this pharmacy.`, 404);
      }

      // Cashiers or Managers cannot assign OWNER role
      if (roleCode.toUpperCase() === 'OWNER' && !req.context.roles.includes('OWNER')) {
        throw new AppError('Only pharmacy owners can assign the OWNER role.', 403);
      }

      const existing = await prisma.user.findFirst({
        where: {
          organizationId,
          OR: [{ email }, { username }],
        },
      });

      if (existing) {
        throw new AppError('A staff account with this email or username already exists.', 409);
      }

      const passwordHash = await PasswordUtil.hash(password);

      const newUser = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            organizationId,
            email: email.trim().toLowerCase(),
            username: username.trim().toLowerCase(),
            passwordHash,
            fullName: fullName.trim(),
            phone: phone ? String(phone).trim() : null,
            status: 'ACTIVE',
          },
        });

        await tx.userRole.create({
          data: {
            userId: u.id,
            roleId: targetRole.id,
          },
        });

        await tx.auditLog.create({
          data: {
            organizationId,
            userId: req.context.userId,
            action: 'USER_CREATED',
            entity: 'User',
            entityId: u.id,
            metadata: { email: u.email, roleCode: targetRole.code },
          },
        });

        return u;
      });

      res.status(201).json({
        status: 'success',
        message: `Staff member '${newUser.fullName}' created successfully with role ${targetRole.code}.`,
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            fullName: newUser.fullName,
            roles: [targetRole.code],
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
