import { describe, it, expect } from 'vitest';
import { HealthService } from '../src/services/healthService';

describe('Health Check Service', () => {
  it('should return a structured health report format', async () => {
    const health = await HealthService.checkHealth();
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('timestamp');
    expect(health).toHaveProperty('uptime');
    expect(health).toHaveProperty('environment');
    expect(health).toHaveProperty('services');
    expect(health.services).toHaveProperty('database');
  });
});
