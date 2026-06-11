// ==========================================
// VALIDATION SCHEMA TESTS
// Focused coverage for route-wired schemas: checkout (tip bounds),
// chef routeCreateMenuItemSchema, driver presencePatchSchema.
// ==========================================

import { describe, expect, it } from 'vitest';
import { checkoutSchema } from './customer';
import { routeCreateMenuItemSchema } from './chef';
import { presencePatchSchema } from './driver';
import { priceSchema } from './common';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

describe('checkoutSchema', () => {
  const base = {
    storefrontId: UUID_A,
    deliveryAddressId: UUID_B,
  };

  it('accepts a valid checkout with a reasonable tip', () => {
    const result = checkoutSchema.safeParse({ ...base, tip: 5.25 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tip).toBe(5.25);
  });

  it('defaults tip to 0 when absent', () => {
    const result = checkoutSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tip).toBe(0);
  });

  it('rejects negative tips', () => {
    expect(checkoutSchema.safeParse({ ...base, tip: -1 }).success).toBe(false);
  });

  it('rejects tips above the $500 cap (e.g. a 10^9 tip)', () => {
    expect(checkoutSchema.safeParse({ ...base, tip: 1_000_000_000 }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, tip: 500.01 }).success).toBe(false);
  });

  it('accepts the boundary tip of exactly $500', () => {
    expect(checkoutSchema.safeParse({ ...base, tip: 500 }).success).toBe(true);
  });

  it('rejects tips with more than 2 decimal places', () => {
    expect(checkoutSchema.safeParse({ ...base, tip: 1.001 }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, tip: 3.14159 }).success).toBe(false);
  });

  it('still accepts common 2-decimal tips (floating point safety)', () => {
    for (const tip of [0.01, 0.1, 1.1, 2.22, 19.99, 123.45]) {
      expect(checkoutSchema.safeParse({ ...base, tip }).success).toBe(true);
    }
  });

  it('rejects invalid UUIDs', () => {
    expect(
      checkoutSchema.safeParse({ ...base, storefrontId: 'not-a-uuid' }).success
    ).toBe(false);
  });
});

describe('priceSchema', () => {
  it('accepts normal prices', () => {
    expect(priceSchema.safeParse(0).success).toBe(true);
    expect(priceSchema.safeParse(24.99).success).toBe(true);
  });

  it('rejects negatives and absurdly large values', () => {
    expect(priceSchema.safeParse(-0.01).success).toBe(false);
    expect(priceSchema.safeParse(100001).success).toBe(false);
    expect(priceSchema.safeParse(1e9).success).toBe(false);
  });

  it('accepts the boundary maximum', () => {
    expect(priceSchema.safeParse(100000).success).toBe(true);
  });
});

describe('routeCreateMenuItemSchema', () => {
  const valid = {
    name: 'Butter Chicken',
    price: 15.99,
    category_id: UUID_A,
  };

  it('accepts a minimal valid menu item', () => {
    const result = routeCreateMenuItemSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts full optional fields', () => {
    const result = routeCreateMenuItemSchema.safeParse({
      ...valid,
      description: 'Creamy and rich',
      image_url: 'https://example.com/img.jpg',
      is_available: true,
      is_featured: false,
      sort_order: 2,
      dietary_tags: ['halal'],
      prep_time_minutes: 20,
    });
    expect(result.success).toBe(true);
  });

  it('requires name, price, and category_id', () => {
    expect(routeCreateMenuItemSchema.safeParse({}).success).toBe(false);
    expect(routeCreateMenuItemSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
    expect(
      routeCreateMenuItemSchema.safeParse({ name: 'X', category_id: UUID_A }).success
    ).toBe(false);
    expect(
      routeCreateMenuItemSchema.safeParse({ name: 'X', price: 9.99 }).success
    ).toBe(false);
  });

  it('rejects non-numeric price and non-integer prep time', () => {
    expect(
      routeCreateMenuItemSchema.safeParse({ ...valid, price: '15.99' }).success
    ).toBe(false);
    expect(
      routeCreateMenuItemSchema.safeParse({ ...valid, prep_time_minutes: 1.5 }).success
    ).toBe(false);
  });

  it('rejects invalid image_url but allows null', () => {
    expect(
      routeCreateMenuItemSchema.safeParse({ ...valid, image_url: 'not-a-url' }).success
    ).toBe(false);
    expect(
      routeCreateMenuItemSchema.safeParse({ ...valid, image_url: null }).success
    ).toBe(true);
  });
});

describe('presencePatchSchema', () => {
  it.each(['online', 'offline', 'busy'] as const)('accepts status %s', (status) => {
    const result = presencePatchSchema.safeParse({ status });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe(status);
  });

  it('rejects unknown statuses', () => {
    expect(presencePatchSchema.safeParse({ status: 'away' }).success).toBe(false);
    expect(presencePatchSchema.safeParse({ status: '' }).success).toBe(false);
  });

  it('rejects a missing status', () => {
    expect(presencePatchSchema.safeParse({}).success).toBe(false);
  });
});
