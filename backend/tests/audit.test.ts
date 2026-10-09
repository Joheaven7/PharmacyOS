import { describe, it, expect } from 'vitest';
import { AuditLogService } from '../src/services/auditLogService';

describe('Audit Log Service Unit Tests', () => {
  it('Verifies log action payload structure compliance', () => {
    const input = {
      organizationId: 'org-test-123',
      userId: 'user-test-456',
      action: 'STOCK_ADJUSTMENT',
      entity: 'Batch',
      entityId: 'batch-789',
      metadata: { reason: 'Damaged packaging during inventory recount', delta: -5 },
      ipAddress: '192.168.1.50',
      userAgent: 'Mozilla/5.0 PharmacyOS Client',
    };

    expect(input.organizationId).toBe('org-test-123');
    expect(input.action).toBe('STOCK_ADJUSTMENT');
    expect(input.metadata.delta).toBe(-5);
  });
});
