import { describe, expect, it, vi } from 'vitest';
import { validateInstantPayoutRequest } from './payout-risk.service';

function resultChain(result: { data: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: result.data, error: result.error ?? null });
  return chain;
}

describe('validateInstantPayoutRequest', () => {
  it('requires enough driver payable balance for instant payout principal plus fee', async () => {
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'instant_payout_requests') {
          return resultChain({
            data: {
              id: 'ipr-1',
              status: 'pending',
              amount_cents: 10000,
              fee_cents: 150,
            },
          });
        }

        if (table === 'drivers') {
          return resultChain({
            data: {
              stripe_connect_account_id: 'acct_driver',
              payout_blocked: false,
              instant_payouts_enabled: true,
            },
          });
        }

        if (table === 'platform_accounts') {
          return resultChain({ data: { balance_cents: 10000 } });
        }

        return resultChain({ data: null });
      }),
    };

    const result = await validateInstantPayoutRequest(client as never, {
      requestId: 'ipr-1',
      driverId: 'driver-1',
      amountCents: 10000,
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'INSUFFICIENT_BALANCE',
    });
  });
});
