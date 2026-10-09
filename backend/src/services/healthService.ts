import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface HealthCheckResult {
  status: 'ok' | 'error' | 'degraded';
  timestamp: string;
  uptime: number;
  environment: string;
  services: {
    database: {
      status: 'connected' | 'disconnected';
      latencyMs?: number;
      error?: string;
    };
  };
}

export class HealthService {
  static async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';
    let dbLatency: number | undefined;
    let dbError: string | undefined;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
      dbLatency = Date.now() - startTime;
    } catch (err) {
      dbStatus = 'disconnected';
      dbError = err instanceof Error ? err.message : 'Database connection failed';
      logger.error('Health check database error:', err);
    }

    const isDbOk = dbStatus === 'connected';

    return {
      status: isDbOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: dbStatus,
          ...(dbLatency !== undefined ? { latencyMs: dbLatency } : {}),
          ...(dbError ? { error: dbError } : {}),
        },
      },
    };
  }
}
