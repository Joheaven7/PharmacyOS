import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LogActionInput {
  organizationId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogQueryOptions {
  userId?: string;
  action?: string;
  entity?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export class AuditLogService {
  /**
   * Log system audit event
   */
  static async logAction(input: LogActionInput) {
    return prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId || null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId || null,
        metadata: (input.metadata as any) || null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
    });
  }

  /**
   * Get paginated audit logs filtered by organization and parameters
   */
  static async getAuditLogs(organizationId: string, options: AuditLogQueryOptions) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      organizationId,
    };

    if (options.userId) {
      whereClause.userId = options.userId;
    }

    if (options.action) {
      whereClause.action = { contains: options.action, mode: 'insensitive' };
    }

    if (options.entity) {
      whereClause.entity = { contains: options.entity, mode: 'insensitive' };
    }

    if (options.startDate || options.endDate) {
      whereClause.createdAt = {};
      if (options.startDate) {
        (whereClause.createdAt as Record<string, Date>).gte = new Date(options.startDate);
      }
      if (options.endDate) {
        const end = new Date(options.endDate);
        end.setHours(23, 59, 59, 999);
        (whereClause.createdAt as Record<string, Date>).lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
        user: log.user
          ? {
              id: log.user.id,
              fullName: log.user.fullName,
              username: log.user.username,
              email: log.user.email,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
