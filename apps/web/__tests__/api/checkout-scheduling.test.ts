/**
 * @jest-environment node
 *
 * Tests for scheduled_for validation in checkout API
 * TDD: Red phase - written before implementation
 */

import { validateScheduledFor } from '../../src/lib/checkout/scheduling';

describe('validateScheduledFor', () => {
  const now = () => new Date();

  it('returns null for null input (ASAP order)', () => {
    expect(validateScheduledFor(null)).toEqual({ valid: true, value: null });
  });

  it('returns null for undefined input (ASAP order)', () => {
    expect(validateScheduledFor(undefined)).toEqual({ valid: true, value: null });
  });

  it('rejects a time in the past', () => {
    const past = new Date(Date.now() - 60 * 1000).toISOString();
    const result = validateScheduledFor(past);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/future/i);
  });

  it('rejects a time less than 1 hour from now', () => {
    const tooSoon = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const result = validateScheduledFor(tooSoon);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/1 hour/i);
  });

  it('accepts a time exactly 1 hour from now', () => {
    // Add a small buffer (65 min) to avoid flakiness at boundary
    const oneHourOut = new Date(Date.now() + 65 * 60 * 1000).toISOString();
    const result = validateScheduledFor(oneHourOut);
    expect(result.valid).toBe(true);
    expect(result.value).toBe(oneHourOut);
  });

  it('rejects a time more than 7 days from now', () => {
    const eightDays = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    const result = validateScheduledFor(eightDays);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/7 days/i);
  });

  it('accepts a time 3 days from now', () => {
    const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const result = validateScheduledFor(threeDays);
    expect(result.valid).toBe(true);
  });

  it('rejects an invalid date string', () => {
    const result = validateScheduledFor('not-a-date');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/invalid/i);
  });
});
