import { describe, it, expect } from 'vitest';
import { enforceTenantIsolation } from '../src/middleware/tenantIsolation';
import { Request, Response } from 'express';

describe('Tenant Isolation Middleware', () => {
  it('should reject requests missing tenant context in req.context', () => {
    const req = {
      context: {},
    } as unknown as Request;

    let errorObj: unknown = null;
    const next = (err?: unknown) => {
      errorObj = err;
    };

    enforceTenantIsolation(req, {} as Response, next);
    expect(errorObj).not.toBeNull();
  });

  it('should strip untrusted organizationId from query and body', () => {
    const req = {
      context: {
        organizationId: 'org-A-real',
      },
      query: {
        organizationId: 'org-B-spoofed',
        search: 'paracetamol',
      },
      body: {
        organizationId: 'org-C-spoofed',
        name: 'New Product',
      },
    } as unknown as Request;

    const next = () => {};

    enforceTenantIsolation(req, {} as Response, next);

    expect(req.query.organizationId).toBeUndefined();
    expect(req.query.search).toBe('paracetamol');
    expect(req.body.organizationId).toBeUndefined();
    expect(req.body.name).toBe('New Product');
    expect(req.context.organizationId).toBe('org-A-real');
  });
});
