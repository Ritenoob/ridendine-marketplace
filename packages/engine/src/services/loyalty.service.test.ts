import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  LoyaltyService,
  createLoyaltyService,
  TIER_THRESHOLDS,
  computeTier,
  computeMultiplier,
  computePointsEarned,
} from './loyalty.service';

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyChainable = any;

function makeTable(initial: Row[] = []): { rows: Row[]; chainable: AnyChainable } {
  const rows: Row[] = [...initial];

  const chainable: AnyChainable = {
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(async () => ({ data: rows[0] ?? null, error: null })),
    maybeSingle: vi.fn(async () => ({ data: rows[0] ?? null, error: null })),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    data: null,
    error: null,
  };

  return { rows, chainable };
}

function buildClient(overrides: Record<string, AnyChainable> = {}) {
  return {
    from: vi.fn((table: string) => overrides[table] ?? makeTable().chainable),
  } as unknown as import('@supabase/supabase-js').SupabaseClient;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe('computeTier', () => {
  it('returns bronze for 0 lifetime points', () => {
    expect(computeTier(0)).toBe('bronze');
  });
  it('returns bronze for 499 lifetime points', () => {
    expect(computeTier(499)).toBe('bronze');
  });
  it('returns silver for 500 lifetime points', () => {
    expect(computeTier(500)).toBe('silver');
  });
  it('returns silver for 1499 lifetime points', () => {
    expect(computeTier(1499)).toBe('silver');
  });
  it('returns gold for 1500 lifetime points', () => {
    expect(computeTier(1500)).toBe('gold');
  });
});

describe('computeMultiplier', () => {
  it('returns 1 for bronze', () => {
    expect(computeMultiplier('bronze')).toBe(1);
  });
  it('returns 1.25 for silver', () => {
    expect(computeMultiplier('silver')).toBe(1.25);
  });
  it('returns 1.5 for gold', () => {
    expect(computeMultiplier('gold')).toBe(1.5);
  });
});

describe('computePointsEarned', () => {
  it('bronze: 1 point per $1 (rounds down)', () => {
    expect(computePointsEarned(2550, 'bronze')).toBe(25); // $25.50 → 25 pts
  });
  it('silver: 1.25x multiplier', () => {
    expect(computePointsEarned(2000, 'silver')).toBe(25); // 20 * 1.25 = 25
  });
  it('gold: 1.5x multiplier', () => {
    expect(computePointsEarned(2000, 'gold')).toBe(30); // 20 * 1.5 = 30
  });
  it('returns 0 for zero order', () => {
    expect(computePointsEarned(0, 'bronze')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TIER_THRESHOLDS export
// ---------------------------------------------------------------------------

describe('TIER_THRESHOLDS', () => {
  it('exports bronze, silver, gold thresholds', () => {
    expect(TIER_THRESHOLDS.bronze).toBe(0);
    expect(TIER_THRESHOLDS.silver).toBe(500);
    expect(TIER_THRESHOLDS.gold).toBe(1500);
  });
});

// ---------------------------------------------------------------------------
// LoyaltyService — getOrCreateAccount
// ---------------------------------------------------------------------------

describe('LoyaltyService.getOrCreateAccount', () => {
  it('returns existing account when one exists', async () => {
    const existing = {
      id: 'acc-1',
      customer_id: 'cust-1',
      points_balance: 100,
      lifetime_points: 100,
      tier: 'bronze',
    };

    const table = makeTable([existing]);
    const client = buildClient({ loyalty_accounts: table.chainable });
    const svc = createLoyaltyService(client);

    const result = await svc.getOrCreateAccount('cust-1');
    expect(result.id).toBe('acc-1');
    expect(result.points_balance).toBe(100);
  });

  it('creates a new account when none exists', async () => {
    const created: Row = {
      id: 'acc-new',
      customer_id: 'cust-2',
      points_balance: 0,
      lifetime_points: 0,
      tier: 'bronze',
    };

    const noData = makeTable().chainable;
    noData.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    noData.insert = vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        single: vi.fn(async () => ({ data: created, error: null })),
      }),
    }));

    const client = buildClient({ loyalty_accounts: noData });
    const svc = createLoyaltyService(client);

    const result = await svc.getOrCreateAccount('cust-2');
    expect(result.id).toBe('acc-new');
    expect(result.tier).toBe('bronze');
  });
});

// ---------------------------------------------------------------------------
// LoyaltyService — getBalance
// ---------------------------------------------------------------------------

describe('LoyaltyService.getBalance', () => {
  it('returns balance and tier from account', async () => {
    const account = {
      id: 'acc-1',
      customer_id: 'cust-1',
      points_balance: 600,
      lifetime_points: 600,
      tier: 'silver',
    };

    const table = makeTable([account]);
    const client = buildClient({ loyalty_accounts: table.chainable });
    const svc = createLoyaltyService(client);

    const result = await svc.getBalance('cust-1');
    expect(result.pointsBalance).toBe(600);
    expect(result.tier).toBe('silver');
    expect(result.lifetimePoints).toBe(600);
  });
});

// ---------------------------------------------------------------------------
// LoyaltyService — earnPoints
// ---------------------------------------------------------------------------

describe('LoyaltyService.earnPoints', () => {
  it('records earn transaction and updates balance', async () => {
    const account = {
      id: 'acc-1',
      customer_id: 'cust-1',
      points_balance: 0,
      lifetime_points: 0,
      tier: 'bronze',
    };

    const accountTable = makeTable([account]);
    // update chain
    accountTable.chainable.update = vi.fn(() => accountTable.chainable);

    const txTable = makeTable();
    txTable.chainable.insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn(async () => ({
          data: { id: 'tx-1', points: 15 },
          error: null,
        })),
      }),
    });

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'loyalty_accounts') return accountTable.chainable;
        if (table === 'loyalty_transactions') return txTable.chainable;
        return makeTable().chainable;
      }),
    } as unknown as import('@supabase/supabase-js').SupabaseClient;

    const svc = createLoyaltyService(client);
    const result = await svc.earnPoints('cust-1', 'order-1', 1500); // $15.00 → 15 pts

    expect(result.pointsEarned).toBe(15);
    expect(result.newBalance).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// LoyaltyService — redeemPoints
// ---------------------------------------------------------------------------

describe('LoyaltyService.redeemPoints', () => {
  it('deducts points and returns discount cents', async () => {
    const account = {
      id: 'acc-1',
      customer_id: 'cust-1',
      points_balance: 100,
      lifetime_points: 200,
      tier: 'bronze',
    };

    const accountTable = makeTable([account]);
    accountTable.chainable.update = vi.fn(() => accountTable.chainable);

    const txTable = makeTable();
    txTable.chainable.insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn(async () => ({
          data: { id: 'tx-2', points: -50 },
          error: null,
        })),
      }),
    });

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'loyalty_accounts') return accountTable.chainable;
        if (table === 'loyalty_transactions') return txTable.chainable;
        return makeTable().chainable;
      }),
    } as unknown as import('@supabase/supabase-js').SupabaseClient;

    const svc = createLoyaltyService(client);
    const result = await svc.redeemPoints('cust-1', 50);

    expect(result.discountCents).toBe(500); // 50 pts * $0.10 = $5.00 = 500 cents
    expect(result.newBalance).toBe(50);
  });

  it('throws when insufficient points', async () => {
    const account = {
      id: 'acc-1',
      customer_id: 'cust-1',
      points_balance: 10,
      lifetime_points: 10,
      tier: 'bronze',
    };

    const accountTable = makeTable([account]);
    const client = buildClient({ loyalty_accounts: accountTable.chainable });
    const svc = createLoyaltyService(client);

    await expect(svc.redeemPoints('cust-1', 50)).rejects.toThrow('Insufficient points');
  });
});
