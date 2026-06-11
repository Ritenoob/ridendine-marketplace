/**
 * @jest-environment node
 *
 * Checkout totals re-validation guard + promo in-flight status.
 *
 * Unit tests for the cent-level tolerance helper, plus source-level
 * assertions (same convention as account-auth-redirects.test.ts) that the
 * checkout page wires the guard and the promo 'validating' state.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('@ridendine/utils', () => ({
  formatCurrency: (value: number) => `$${value.toFixed(2)}`,
}));

import { totalsDifferBeyondTolerance } from '@/lib/cart-summary';

describe('totalsDifferBeyondTolerance', () => {
  it('tolerates differences of one cent or less', () => {
    expect(totalsDifferBeyondTolerance(20, 20)).toBe(false);
    expect(totalsDifferBeyondTolerance(20, 20.01)).toBe(false);
    expect(totalsDifferBeyondTolerance(20.01, 20)).toBe(false);
  });

  it('flags differences greater than one cent in either direction', () => {
    expect(totalsDifferBeyondTolerance(20, 20.02)).toBe(true);
    expect(totalsDifferBeyondTolerance(20.02, 20)).toBe(true);
    expect(totalsDifferBeyondTolerance(45.5, 52.75)).toBe(true);
  });

  it('is immune to floating-point noise', () => {
    expect(totalsDifferBeyondTolerance(0.1 + 0.2, 0.3)).toBe(false);
    expect(totalsDifferBeyondTolerance(10.1 + 5.2, 15.3)).toBe(false);
  });
});

describe('checkout page wiring', () => {
  const src = readFileSync(
    join(__dirname, '..', 'app', 'checkout', 'page.tsx'),
    'utf8'
  );

  it('re-validates the server breakdown against the client-displayed total', () => {
    expect(src).toContain('totalsDifferBeyondTolerance');
    expect(src).toContain('totalChangeNotice');
    // Payment form must be gated until the updated total is re-confirmed.
    expect(src).toContain('clientSecret && !totalChangeNotice');
    expect(src).toContain('Confirm updated total');
  });

  it('shows an in-flight promo validation status', () => {
    expect(src).toContain("'idle' | 'validating' | 'valid' | 'invalid'");
    expect(src).toContain('Checking code…');
    // Indicator starts as soon as new non-empty input is pending validation.
    expect(src).toContain("setPromoStatus(value.trim() ? 'validating' : 'idle')");
  });
});
