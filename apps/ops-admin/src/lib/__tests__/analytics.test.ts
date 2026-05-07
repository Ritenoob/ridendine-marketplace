/**
 * TDD: Analytics helper functions
 * Tests for lib/analytics.ts
 */

import {
  getPeriodDates,
  formatCents,
  formatPercent,
  formatNumber,
  calcPercentChange,
  buildOrdersByStatus,
} from '../analytics';

describe('getPeriodDates', () => {
  it('returns today range (same day start/end)', () => {
    const { start, end } = getPeriodDates('today');
    const now = new Date();
    expect(start.getDate()).toBe(now.getDate());
    expect(end >= start).toBe(true);
  });

  it('returns week range (7 days)', () => {
    const { start, end } = getPeriodDates('week');
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(7, 0);
  });

  it('returns month range (30 days)', () => {
    const { start, end } = getPeriodDates('month');
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(30, 0);
  });

  it('returns year range (365 days)', () => {
    const { start, end } = getPeriodDates('year');
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(365, 0);
  });

  it('defaults to week for unknown period', () => {
    const { start, end } = getPeriodDates('unknown');
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(7, 0);
  });
});

describe('formatCents', () => {
  it('formats 0 cents as $0.00', () => {
    expect(formatCents(0)).toBe('$0.00');
  });

  it('formats 100 cents as $1.00', () => {
    expect(formatCents(100)).toBe('$1.00');
  });

  it('formats 12345 cents as $123.45', () => {
    expect(formatCents(12345)).toBe('$123.45');
  });

  it('formats large amounts with commas', () => {
    expect(formatCents(1000000)).toBe('$10,000.00');
  });
});

describe('formatPercent', () => {
  it('formats 0 as 0.0%', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('formats positive number with + prefix', () => {
    expect(formatPercent(12.5)).toBe('+12.5%');
  });

  it('formats negative number without extra sign', () => {
    expect(formatPercent(-5.3)).toBe('-5.3%');
  });
});

describe('formatNumber', () => {
  it('formats 0 as "0"', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formats 1234 with comma', () => {
    expect(formatNumber(1234)).toBe('1,234');
  });
});

describe('calcPercentChange', () => {
  it('returns 0 when both values are 0', () => {
    expect(calcPercentChange(0, 0)).toBe(0);
  });

  it('returns 100 when prev is 0 and current is positive', () => {
    expect(calcPercentChange(100, 0)).toBe(100);
  });

  it('calculates positive change', () => {
    expect(calcPercentChange(150, 100)).toBe(50);
  });

  it('calculates negative change', () => {
    expect(calcPercentChange(80, 100)).toBe(-20);
  });

  it('rounds to one decimal', () => {
    expect(calcPercentChange(110, 90)).toBeCloseTo(22.2, 1);
  });
});

describe('buildOrdersByStatus', () => {
  it('returns empty map for empty orders', () => {
    expect(buildOrdersByStatus([])).toEqual({});
  });

  it('counts orders by status', () => {
    const orders = [
      { status: 'pending' },
      { status: 'delivered' },
      { status: 'delivered' },
      { status: 'cancelled' },
    ];
    const result = buildOrdersByStatus(orders);
    expect(result).toEqual({ pending: 1, delivered: 2, cancelled: 1 });
  });
});
