// ==========================================
// FORMATTING + DATE UTILITIES TESTS
// Currency unit conventions and timezone-aware date rendering.
// ==========================================

import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  formatCurrency,
  formatCurrencyFromCents,
  formatCurrencyFromDollars,
} from './formatting';
import {
  DEFAULT_TIME_ZONE,
  formatDate,
  formatDateTime,
  formatTime,
  getRelativeTime,
  isToday,
} from './dates';

// Normalize non-breaking spaces that Intl inserts between symbol and number
const norm = (s: string) => s.replace(/ | /g, ' ');

describe('formatCurrency (dollars, CAD default)', () => {
  it('treats input as dollars — does NOT divide by 100', () => {
    expect(norm(formatCurrency(12.5))).toBe('$12.50');
  });

  it('defaults to CAD / en-CA', () => {
    // en-CA renders CAD as plain "$"
    expect(norm(formatCurrency(1000))).toBe('$1,000.00');
  });

  it('supports explicit currency and locale', () => {
    expect(norm(formatCurrency(99.99, 'USD', 'en-US'))).toBe('$99.99');
  });

  it('formats zero', () => {
    expect(norm(formatCurrency(0))).toBe('$0.00');
  });
});

describe('formatCurrencyFromCents', () => {
  it('divides cents by 100', () => {
    expect(norm(formatCurrencyFromCents(1250))).toBe('$12.50');
  });

  it('matches formatCurrency for the equivalent dollar amount', () => {
    expect(formatCurrencyFromCents(123456)).toBe(formatCurrency(1234.56));
  });
});

describe('formatCurrencyFromDollars (deprecated alias)', () => {
  it('behaves identically to formatCurrency', () => {
    expect(formatCurrencyFromDollars(42.42)).toBe(formatCurrency(42.42));
  });
});

describe('timezone-aware date formatters', () => {
  it('exports America/Toronto as the default timezone', () => {
    expect(DEFAULT_TIME_ZONE).toBe('America/Toronto');
  });

  // 2026-01-15T02:30:00Z is Jan 14, 9:30 PM in Toronto (EST, UTC-5).
  const lateNightUtc = '2026-01-15T02:30:00.000Z';

  it('formatDate renders the Toronto calendar date, not UTC', () => {
    expect(formatDate(lateNightUtc)).toBe('Jan 14, 2026');
  });

  it('formatDate honors an explicit timeZone option', () => {
    expect(formatDate(lateNightUtc, { timeZone: 'UTC' })).toBe('Jan 15, 2026');
  });

  it('formatTime renders Toronto wall-clock time', () => {
    expect(norm(formatTime(lateNightUtc))).toBe('9:30 PM');
  });

  it('formatTime honors an explicit timeZone option', () => {
    expect(norm(formatTime(lateNightUtc, { timeZone: 'UTC' }))).toBe('2:30 AM');
  });

  it('formatDateTime renders date and time in Toronto', () => {
    expect(norm(formatDateTime(lateNightUtc))).toBe('Jan 14, 2026, 9:30 PM');
  });
});

describe('isToday (Toronto calendar day)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for an instant on the same Toronto day even if UTC day differs', () => {
    // "Now" = 2026-01-15T03:00:00Z → Jan 14, 10:00 PM in Toronto
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T03:00:00.000Z'));
    // Jan 14, 8:00 AM Toronto = 13:00Z on Jan 14 — same Toronto day
    expect(isToday('2026-01-14T13:00:00.000Z')).toBe(true);
    // In UTC terms these are different days; UTC zone should say false
    expect(isToday('2026-01-14T13:00:00.000Z', { timeZone: 'UTC' })).toBe(false);
  });

  it('returns false for a different Toronto day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T03:00:00.000Z'));
    // Jan 15, noon Toronto (17:00Z) — Toronto "today" is still Jan 14
    expect(isToday('2026-01-15T17:00:00.000Z')).toBe(false);
  });
});

describe('getRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders recent deltas independent of zone', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-10T12:00:00.000Z'));
    expect(getRelativeTime('2026-06-10T11:55:00.000Z')).toBe('5 min ago');
    expect(getRelativeTime('2026-06-10T09:00:00.000Z')).toBe('3 hr ago');
  });

  it('falls back to a Toronto-zone date for >7 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-10T12:00:00.000Z'));
    // 2026-01-15T02:30Z is Jan 14 in Toronto
    expect(getRelativeTime('2026-01-15T02:30:00.000Z')).toBe('Jan 14, 2026');
  });
});
