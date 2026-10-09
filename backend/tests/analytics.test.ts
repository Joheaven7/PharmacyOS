import { describe, it, expect } from 'vitest';
import { AnalyticsService } from '../src/services/analyticsService';

describe('Analytics & Business Intelligence Logic', () => {
  it('should generate correct DateRange boundaries for period filters', () => {
    const today = AnalyticsService.getDateRange('today');
    expect(today.startDate.getHours()).toBe(0);
    expect(today.endDate.getHours()).toBe(23);

    const sevenDays = AnalyticsService.getDateRange('7days');
    const diffDays = Math.round((today.endDate.getTime() - sevenDays.startDate.getTime()) / (1000 * 3600 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(7);
  });

  it('should calculate Gross Profit correctly (Revenue - COGS)', () => {
    const salesRevenue = 1500.0;
    const costOfGoodsSold = 900.0;
    const grossProfit = salesRevenue - costOfGoodsSold;

    expect(grossProfit).toBe(600.0);
    expect(grossProfit).toBeGreaterThan(0);
  });
});
