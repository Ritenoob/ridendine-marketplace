/**
 * @jest-environment node
 *
 * Tests for scheduled order display utility functions
 */

import { formatScheduledTime, isScheduledOrder } from '../../src/lib/checkout/scheduling';

describe('formatScheduledTime', () => {
  it('returns null for null input', () => {
    expect(formatScheduledTime(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatScheduledTime(undefined)).toBeNull();
  });

  it('formats a future ISO timestamp into a readable string', () => {
    const future = new Date('2026-06-15T14:30:00.000Z').toISOString();
    const result = formatScheduledTime(future);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('returns null for an invalid date string', () => {
    expect(formatScheduledTime('not-a-date')).toBeNull();
  });
});

describe('isScheduledOrder', () => {
  it('returns false for null', () => {
    expect(isScheduledOrder(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isScheduledOrder(undefined)).toBe(false);
  });

  it('returns true for an ISO timestamp string', () => {
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    expect(isScheduledOrder(future)).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isScheduledOrder('')).toBe(false);
  });
});
