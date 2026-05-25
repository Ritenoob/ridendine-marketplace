import { describe, expect, it, vi } from 'vitest';
import {
  hasCustomerUsedPromo,
  recordPromoUsage,
  validatePromoCode,
} from './promo.repository';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePromo(overrides: Record<string, unknown> = {}) {
  return {
    id: 'promo-1',
    code: 'SAVE10',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_amount: null,
    usage_limit: null,
    usage_count: 0,
    expires_at: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Build a mock Supabase client that returns `promoData` for promo_codes
 *  and `usageData` for promo_code_usages */
function makeClient({
  promoData = makePromo(),
  promoError = null,
  usageData = null,
  usageError = null,
  insertError = null,
}: {
  promoData?: ReturnType<typeof makePromo> | null;
  promoError?: unknown;
  usageData?: { id: string } | null;
  usageError?: unknown;
  insertError?: unknown;
} = {}) {
  const fromMock = vi.fn((table: string) => {
    if (table === 'promo_codes') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: promoData, error: promoError }),
          }),
        }),
      };
    }

    if (table === 'promo_code_usages') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: usageData, error: usageError }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: insertError }),
      };
    }

    return {};
  });

  return { from: fromMock };
}

// ---------------------------------------------------------------------------
// hasCustomerUsedPromo
// ---------------------------------------------------------------------------

describe('hasCustomerUsedPromo', () => {
  it('returns false when no usage row exists', async () => {
    const client = makeClient({ usageData: null });
    const result = await hasCustomerUsedPromo(client as any, 'promo-1', 'cust-1');
    expect(result).toBe(false);
  });

  it('returns true when a usage row exists', async () => {
    const client = makeClient({ usageData: { id: 'usage-1' } });
    const result = await hasCustomerUsedPromo(client as any, 'promo-1', 'cust-1');
    expect(result).toBe(true);
  });

  it('queries promo_code_usages with correct promo_id and customer_id', async () => {
    const client = makeClient({ usageData: null });
    await hasCustomerUsedPromo(client as any, 'promo-abc', 'cust-xyz');

    const fromCall = client.from.mock.calls.find((c: string[]) => c[0] === 'promo_code_usages');
    expect(fromCall).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// recordPromoUsage
// ---------------------------------------------------------------------------

describe('recordPromoUsage', () => {
  it('inserts a usage row without throwing on success', async () => {
    const client = makeClient({ insertError: null });
    await expect(
      recordPromoUsage(client as any, 'promo-1', 'cust-1', 'order-1')
    ).resolves.toBeUndefined();
  });

  it('ignores unique-violation errors (idempotent)', async () => {
    const uniqueViolation = { code: '23505', message: 'duplicate key' };
    const client = makeClient({ insertError: uniqueViolation });
    await expect(
      recordPromoUsage(client as any, 'promo-1', 'cust-1', 'order-1')
    ).resolves.toBeUndefined();
  });

  it('throws on non-unique-violation errors', async () => {
    const dbError = { code: '23502', message: 'not null violation' };
    const client = makeClient({ insertError: dbError });
    await expect(
      recordPromoUsage(client as any, 'promo-1', 'cust-1', 'order-1')
    ).rejects.toEqual(dbError);
  });
});

// ---------------------------------------------------------------------------
// validatePromoCode – per-customer check
// ---------------------------------------------------------------------------

describe('validatePromoCode with customerId', () => {
  it('returns invalid when customer has already used the promo', async () => {
    const client = makeClient({ usageData: { id: 'usage-1' } });
    const result = await validatePromoCode(client as any, 'SAVE10', 5000, 'cust-1');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('You have already used this promo code');
  });

  it('returns valid when customer has not used the promo', async () => {
    const client = makeClient({ usageData: null });
    const result = await validatePromoCode(client as any, 'SAVE10', 5000, 'cust-1');
    expect(result.valid).toBe(true);
    expect(result.promoId).toBe('promo-1');
  });

  it('skips per-customer check when customerId is omitted', async () => {
    // usageData is set but no customerId provided – should still pass
    const client = makeClient({ usageData: { id: 'usage-1' } });
    const result = await validatePromoCode(client as any, 'SAVE10', 5000);
    expect(result.valid).toBe(true);
  });

  it('still enforces usage_limit even when customer check passes', async () => {
    const client = makeClient({
      promoData: makePromo({ usage_limit: 5, usage_count: 5 }),
      usageData: null,
    });
    const result = await validatePromoCode(client as any, 'SAVE10', 5000, 'cust-1');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Promo code has reached its usage limit');
  });
});
