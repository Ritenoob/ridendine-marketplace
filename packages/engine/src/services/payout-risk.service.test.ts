import { describe, expect, it, vi } from 'vitest';
import {
  validateChefPayoutLine,
  validateDriverBatchPayoutLine,
  validateInstantPayoutRequest,
} from './payout-risk.service';

function resultChain(result: { data: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: result.data, error: result.error ?? null });
  return chain;
}

type TableData = Record<string, unknown>;

function mockClient(tables: TableData) {
  return {
    from: vi.fn((table: string) => resultChain({ data: tables[table] ?? null })),
  } as never;
}

// ------------------------------------------------------------------
// validateChefPayoutLine
// ------------------------------------------------------------------

describe('validateChefPayoutLine', () => {
  const baseInput = {
    storefrontId: 'sf-1',
    chefId: 'chef-1',
    amountCents: 5000,
    currency: 'cad',
    payoutRunId: 'run-1',
  };

  const healthyTables = {
    platform_accounts: { balance_cents: 10000, currency: 'cad' },
    chef_payouts: null,
    chef_payout_accounts: {
      stripe_account_id: 'acct_chef',
      payout_enabled: true,
      is_verified: true,
    },
  };

  it('returns ok when balance covers amount, no duplicate, and account is verified', async () => {
    const client = mockClient(healthyTables);
    const result = await validateChefPayoutLine(client, baseInput);
    expect(result).toEqual({ ok: true });
  });

  it('blocks zero amount with INVALID_AMOUNT before touching the DB', async () => {
    const client = mockClient(healthyTables);
    const result = await validateChefPayoutLine(client, { ...baseInput, amountCents: 0 });
    expect(result).toMatchObject({ ok: false, code: 'INVALID_AMOUNT' });
    expect((client as { from: ReturnType<typeof vi.fn> }).from).not.toHaveBeenCalled();
  });

  it('blocks negative amount with INVALID_AMOUNT', async () => {
    const client = mockClient(healthyTables);
    const result = await validateChefPayoutLine(client, { ...baseInput, amountCents: -100 });
    expect(result).toMatchObject({ ok: false, code: 'INVALID_AMOUNT' });
  });

  it('blocks when chef payable balance is below the requested amount', async () => {
    const client = mockClient({
      ...healthyTables,
      platform_accounts: { balance_cents: 4999, currency: 'cad' },
    });
    const result = await validateChefPayoutLine(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'INSUFFICIENT_BALANCE' });
  });

  it('treats a missing platform account row as zero balance', async () => {
    const client = mockClient({ ...healthyTables, platform_accounts: null });
    const result = await validateChefPayoutLine(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'INSUFFICIENT_BALANCE' });
    expect((result as { message: string }).message).toContain('0');
  });

  it('allows payout when balance exactly equals the requested amount', async () => {
    const client = mockClient({
      ...healthyTables,
      platform_accounts: { balance_cents: 5000, currency: 'cad' },
    });
    const result = await validateChefPayoutLine(client, baseInput);
    expect(result).toEqual({ ok: true });
  });

  it('blocks duplicate payout for the same chef and run', async () => {
    const client = mockClient({
      ...healthyTables,
      chef_payouts: { id: 'existing-payout' },
    });
    const result = await validateChefPayoutLine(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'DUPLICATE_PAYOUT' });
  });

  it('blocks when the chef has no payout account row at all', async () => {
    const client = mockClient({ ...healthyTables, chef_payout_accounts: null });
    const result = await validateChefPayoutLine(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'NO_STRIPE_ACCOUNT' });
  });

  it('blocks when the payout account has no stripe_account_id', async () => {
    const client = mockClient({
      ...healthyTables,
      chef_payout_accounts: { stripe_account_id: null, payout_enabled: true, is_verified: true },
    });
    const result = await validateChefPayoutLine(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'NO_STRIPE_ACCOUNT' });
  });

  it('blocks when payouts are explicitly disabled on the account', async () => {
    const client = mockClient({
      ...healthyTables,
      chef_payout_accounts: { stripe_account_id: 'acct_chef', payout_enabled: false, is_verified: true },
    });
    const result = await validateChefPayoutLine(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'PAYOUT_DISABLED' });
  });

  it('blocks when the account is not verified (is_verified null)', async () => {
    const client = mockClient({
      ...healthyTables,
      chef_payout_accounts: { stripe_account_id: 'acct_chef', payout_enabled: true, is_verified: null },
    });
    const result = await validateChefPayoutLine(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'ACCOUNT_NOT_VERIFIED' });
  });
});

// ------------------------------------------------------------------
// validateDriverBatchPayoutLine
// ------------------------------------------------------------------

describe('validateDriverBatchPayoutLine', () => {
  const baseInput = { driverId: 'driver-1', amountCents: 3000, payoutRunId: 'run-1' };

  const healthyTables = {
    drivers: { stripe_connect_account_id: 'acct_driver', payout_blocked: false },
    platform_accounts: { balance_cents: 6000 },
    driver_payouts: null,
  };

  it('returns ok for a healthy driver with sufficient balance', async () => {
    const client = mockClient(healthyTables);
    const result = await validateDriverBatchPayoutLine(client, baseInput);
    expect(result).toEqual({ ok: true });
  });

  it('blocks zero amount with INVALID_AMOUNT before touching the DB', async () => {
    const client = mockClient(healthyTables);
    const result = await validateDriverBatchPayoutLine(client, { ...baseInput, amountCents: 0 });
    expect(result).toMatchObject({ ok: false, code: 'INVALID_AMOUNT' });
    expect((client as { from: ReturnType<typeof vi.fn> }).from).not.toHaveBeenCalled();
  });

  it('blocks suspended drivers with PAYOUT_BLOCKED', async () => {
    const client = mockClient({
      ...healthyTables,
      drivers: { stripe_connect_account_id: 'acct_driver', payout_blocked: true },
    });
    const result = await validateDriverBatchPayoutLine(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'PAYOUT_BLOCKED' });
  });

  it('blocks when the driver row is missing entirely', async () => {
    const client = mockClient({ ...healthyTables, drivers: null });
    const result = await validateDriverBatchPayoutLine(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'NO_STRIPE_ACCOUNT' });
  });

  it('blocks when the driver has no Stripe Connect account', async () => {
    const client = mockClient({
      ...healthyTables,
      drivers: { stripe_connect_account_id: null, payout_blocked: false },
    });
    const result = await validateDriverBatchPayoutLine(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'NO_STRIPE_ACCOUNT' });
  });

  it('blocks when driver payable balance is below the requested amount', async () => {
    const client = mockClient({ ...healthyTables, platform_accounts: { balance_cents: 2999 } });
    const result = await validateDriverBatchPayoutLine(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'INSUFFICIENT_BALANCE' });
  });

  it('treats a missing platform account row as zero balance', async () => {
    const client = mockClient({ ...healthyTables, platform_accounts: null });
    const result = await validateDriverBatchPayoutLine(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'INSUFFICIENT_BALANCE' });
  });

  it('blocks duplicate payout for the same driver and run', async () => {
    const client = mockClient({ ...healthyTables, driver_payouts: { id: 'existing' } });
    const result = await validateDriverBatchPayoutLine(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'DUPLICATE_PAYOUT' });
  });
});

// ------------------------------------------------------------------
// validateInstantPayoutRequest
// ------------------------------------------------------------------

describe('validateInstantPayoutRequest', () => {
  const baseInput = { requestId: 'ipr-1', driverId: 'driver-1', amountCents: 10000 };

  const healthyTables = {
    instant_payout_requests: { id: 'ipr-1', status: 'pending', amount_cents: 10000, fee_cents: 150 },
    drivers: {
      stripe_connect_account_id: 'acct_driver',
      payout_blocked: false,
      instant_payouts_enabled: true,
    },
    platform_accounts: { balance_cents: 20000 },
  };

  it('returns ok when balance covers principal plus fee', async () => {
    const client = mockClient(healthyTables);
    const result = await validateInstantPayoutRequest(client, baseInput);
    expect(result).toEqual({ ok: true });
  });

  it('blocks zero amount with INVALID_AMOUNT', async () => {
    const client = mockClient(healthyTables);
    const result = await validateInstantPayoutRequest(client, { ...baseInput, amountCents: 0 });
    expect(result).toMatchObject({ ok: false, code: 'INVALID_AMOUNT' });
  });

  it('blocks when the request row does not exist', async () => {
    const client = mockClient({ ...healthyTables, instant_payout_requests: null });
    const result = await validateInstantPayoutRequest(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  });

  it('blocks non-pending requests with NOT_EXECUTABLE and reports the status', async () => {
    const client = mockClient({
      ...healthyTables,
      instant_payout_requests: { id: 'ipr-1', status: 'completed', amount_cents: 10000, fee_cents: 150 },
    });
    const result = await validateInstantPayoutRequest(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'NOT_EXECUTABLE' });
    expect((result as { message: string }).message).toContain('completed');
  });

  it('blocks when the requested amount differs from the stored request', async () => {
    const client = mockClient({
      ...healthyTables,
      instant_payout_requests: { id: 'ipr-1', status: 'pending', amount_cents: 9999, fee_cents: 150 },
    });
    const result = await validateInstantPayoutRequest(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'AMOUNT_MISMATCH' });
  });

  it('blocks suspended drivers with PAYOUT_BLOCKED', async () => {
    const client = mockClient({
      ...healthyTables,
      drivers: { stripe_connect_account_id: 'acct_driver', payout_blocked: true, instant_payouts_enabled: true },
    });
    const result = await validateInstantPayoutRequest(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'PAYOUT_BLOCKED' });
  });

  it('blocks when instant payouts are not enabled for the driver', async () => {
    const client = mockClient({
      ...healthyTables,
      drivers: { stripe_connect_account_id: 'acct_driver', payout_blocked: false, instant_payouts_enabled: false },
    });
    const result = await validateInstantPayoutRequest(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'INSTANT_DISABLED' });
  });

  it('blocks with INSTANT_DISABLED when the driver row is missing (checked before Stripe account)', async () => {
    const client = mockClient({ ...healthyTables, drivers: null });
    const result = await validateInstantPayoutRequest(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'INSTANT_DISABLED' });
  });

  it('blocks when the driver has no Stripe Connect account', async () => {
    const client = mockClient({
      ...healthyTables,
      drivers: { stripe_connect_account_id: null, payout_blocked: false, instant_payouts_enabled: true },
    });
    const result = await validateInstantPayoutRequest(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'NO_STRIPE_ACCOUNT' });
  });

  it('requires enough driver payable balance for principal plus fee', async () => {
    const client = mockClient({
      ...healthyTables,
      platform_accounts: { balance_cents: 10000 }, // covers principal but not the 150c fee
    });
    const result = await validateInstantPayoutRequest(client, baseInput);
    expect(result).toMatchObject({ ok: false, code: 'INSUFFICIENT_BALANCE' });
    expect((result as { message: string }).message).toContain('10150');
  });

  it('allows payout when balance exactly equals principal plus fee', async () => {
    const client = mockClient({
      ...healthyTables,
      platform_accounts: { balance_cents: 10150 },
    });
    const result = await validateInstantPayoutRequest(client, baseInput);
    expect(result).toEqual({ ok: true });
  });

  it('treats a null fee_cents as zero fee', async () => {
    const client = mockClient({
      ...healthyTables,
      instant_payout_requests: { id: 'ipr-1', status: 'pending', amount_cents: 10000, fee_cents: null },
      platform_accounts: { balance_cents: 10000 },
    });
    const result = await validateInstantPayoutRequest(client, baseInput);
    expect(result).toEqual({ ok: true });
  });
});
