/**
 * @jest-environment node
 */

import {
  hasActiveDiscoveryFilters,
  isChefOpenNow,
  normalizeStorefrontSort,
} from '../../src/lib/discovery';

describe('customer discovery helpers', () => {
  it('detects a chef as open when the current local time is inside an active slot', () => {
    expect(
      isChefOpenNow(
        [{ day_of_week: 2, start_time: '09:00', end_time: '17:30', is_available: true }],
        new Date('2026-06-09T12:00:00')
      )
    ).toBe(true);
  });

  it('detects a chef as closed outside active slots or when no slots exist', () => {
    expect(
      isChefOpenNow(
        [{ day_of_week: 2, start_time: '09:00', end_time: '11:00', is_available: true }],
        new Date('2026-06-09T12:00:00')
      )
    ).toBe(false);
    expect(isChefOpenNow([], new Date('2026-06-09T12:00:00'))).toBe(false);
  });

  it('treats openNow and fastest sort as active discovery filters', () => {
    expect(hasActiveDiscoveryFilters({ openNow: true })).toBe(true);
    expect(hasActiveDiscoveryFilters({ sortBy: 'fastest' })).toBe(true);
    expect(hasActiveDiscoveryFilters({ cuisines: [], sortBy: 'default' })).toBe(false);
  });

  it('normalizes supported sort values and falls back to default for unknown values', () => {
    expect(normalizeStorefrontSort('fastest')).toBe('fastest');
    expect(normalizeStorefrontSort('popular')).toBe('popular');
    expect(normalizeStorefrontSort('not-real')).toBe('default');
  });
});
