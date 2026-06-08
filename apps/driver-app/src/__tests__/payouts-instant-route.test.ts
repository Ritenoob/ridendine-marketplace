/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockFrom = jest.fn();
const mockGetDriverActorContext = jest.fn();
const mockRequestInstantPayout = jest.fn();

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

jest.mock('@ridendine/engine', () => ({
  createCentralEngine: jest.fn(() => ({
    payoutAutomation: {
      requestInstantPayout: mockRequestInstantPayout,
    },
  })),
}));

jest.mock('@/lib/engine', () => ({
  getDriverActorContext: (...args: unknown[]) => mockGetDriverActorContext(...args),
  errorResponse: (code: string, message: string, status = 400) =>
    new Response(JSON.stringify({ success: false, error: { code, message } }), { status }),
  successResponse: (data: unknown, status = 200) =>
    new Response(JSON.stringify({ success: true, data }), { status }),
}));

function resultChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> & PromiseLike<{ data: unknown; error: unknown }> = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    order: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve(result)),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

function request(amountCents: number) {
  return new NextRequest('http://localhost/api/payouts/instant', {
    method: 'POST',
    body: JSON.stringify({ amountCents }),
  });
}

describe('POST /api/payouts/instant', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGetDriverActorContext.mockResolvedValue({
      driverId: 'driver-1',
      actor: { userId: 'user-1', role: 'driver', entityId: 'driver-1' },
    });
    mockRequestInstantPayout.mockResolvedValue({
      requestId: 'ipr-new',
      feeCents: 75,
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'drivers') {
        return resultChain({ data: { instant_payouts_enabled: true }, error: null });
      }

      if (table === 'platform_accounts') {
        return resultChain({ data: { balance_cents: 10000, currency: 'CAD' }, error: null });
      }

      if (table === 'instant_payout_requests') {
        return resultChain({
          data: [{ id: 'ipr-existing', amount_cents: 5000, fee_cents: 75, status: 'pending' }],
          error: null,
        });
      }

      return resultChain({ data: null, error: null });
    });
  });

  it('rejects instant payout amounts above balance net of pending requests and fees', async () => {
    const { POST } = await import('../app/api/payouts/instant/route');

    const response = await POST(request(5000));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
      message: expect.stringContaining('pending instant payout requests'),
    });
    expect(mockRequestInstantPayout).not.toHaveBeenCalled();
  });

  it('rejects instant payout amounts that fit the net balance before the current request fee only', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'drivers') {
        return resultChain({ data: { instant_payouts_enabled: true }, error: null });
      }

      if (table === 'platform_accounts') {
        return resultChain({ data: { balance_cents: 10000, currency: 'CAD' }, error: null });
      }

      if (table === 'instant_payout_requests') {
        return resultChain({ data: [], error: null });
      }

      return resultChain({ data: null, error: null });
    });

    const { POST } = await import('../app/api/payouts/instant/route');

    const response = await POST(request(10000));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
      message: expect.stringContaining('fee'),
    });
    expect(mockRequestInstantPayout).not.toHaveBeenCalled();
  });

  it('uses CAD when the ledger currency is malformed', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'drivers') {
        return resultChain({ data: { instant_payouts_enabled: true }, error: null });
      }

      if (table === 'platform_accounts') {
        return resultChain({ data: { balance_cents: 10000, currency: 'bad-currency' }, error: null });
      }

      if (table === 'instant_payout_requests') {
        return resultChain({ data: [], error: null });
      }

      return resultChain({ data: null, error: null });
    });

    const { POST } = await import('../app/api/payouts/instant/route');

    const response = await POST(request(5000));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.currency).toBe('CAD');
    expect(mockRequestInstantPayout).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 5000,
        currency: 'CAD',
      })
    );
  });
});
