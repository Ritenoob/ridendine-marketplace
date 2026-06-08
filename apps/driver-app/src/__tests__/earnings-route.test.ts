/**
 * @jest-environment node
 */

const mockFrom = jest.fn();
const mockGetDeliveryHistory = jest.fn();
const mockGetDriverActorContext = jest.fn();

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => ({
    from: mockFrom,
  })),
  getDeliveryHistory: (...args: unknown[]) => mockGetDeliveryHistory(...args),
}));

jest.mock('@/lib/engine', () => ({
  getDriverActorContext: (...args: unknown[]) => mockGetDriverActorContext(...args),
  errorResponse: (code: string, message: string, status = 400) =>
    new Response(JSON.stringify({ success: false, error: { code, message } }), { status }),
  successResponse: (data: unknown, status = 200) =>
    new Response(JSON.stringify({ success: true, data }), { status }),
}));

type EarningsFixture = {
  platformAccount: Record<string, unknown> | null;
  pendingInstantPayouts: Record<string, unknown>[];
  payoutAccount: Record<string, unknown> | null;
  platformAccountError?: Record<string, unknown> | null;
  pendingInstantPayoutsError?: Record<string, unknown> | null;
  payoutAccountError?: Record<string, unknown> | null;
};

function resultChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> & PromiseLike<{ data: unknown; error: unknown }> = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    order: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve(result)),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

function mockDb(fixture: EarningsFixture) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'platform_accounts') {
      return resultChain({ data: fixture.platformAccount, error: fixture.platformAccountError ?? null });
    }

    if (table === 'instant_payout_requests') {
      return resultChain({ data: fixture.pendingInstantPayouts, error: fixture.pendingInstantPayoutsError ?? null });
    }

    if (table === 'driver_payout_accounts') {
      return resultChain({ data: fixture.payoutAccount, error: fixture.payoutAccountError ?? null });
    }

    return resultChain({ data: null, error: null });
  });
}

describe('GET /api/earnings', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-06-15T18:00:00.000Z'));
    mockGetDriverActorContext.mockResolvedValue({
      driverId: 'driver-1',
      actor: { userId: 'user-1', role: 'driver', entityId: 'driver-1' },
    });
    mockGetDeliveryHistory.mockResolvedValue([
      {
        id: 'delivery-today',
        actual_dropoff_at: '2026-06-15T15:00:00.000Z',
        driver_payout: 12,
      },
      {
        id: 'delivery-week',
        actual_dropoff_at: '2026-06-12T15:00:00.000Z',
        driver_payout: 9,
      },
      {
        id: 'delivery-month',
        actual_dropoff_at: '2026-06-02T15:00:00.000Z',
        driver_payout: 5,
      },
      {
        id: 'delivery-old',
        actual_dropoff_at: '2026-05-20T15:00:00.000Z',
        driver_payout: 7,
      },
    ]);
    mockDb({
      platformAccount: {
        balance_cents: 12345,
        currency: 'CAD',
      },
      pendingInstantPayouts: [
        {
          id: 'ipr-1',
          amount_cents: 5000,
          fee_cents: 75,
          status: 'pending',
          requested_at: '2026-06-15T16:00:00.000Z',
        },
      ],
      payoutAccount: {
        id: 'payout-1',
        status: 'active',
        payouts_enabled: true,
        charges_enabled: true,
        onboarding_completed_at: '2026-06-01T12:00:00.000Z',
        stripe_account_id: 'acct_driver',
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns period earnings, payable balance, currency, pending instant payouts, and payout account status', async () => {
    const { GET } = await import('../app/api/earnings/route');

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetDriverActorContext).toHaveBeenCalledWith();
    expect(mockGetDeliveryHistory).toHaveBeenCalledWith(expect.anything(), 'driver-1', { limit: 1000 });
    expect(json.data).toMatchObject({
      today: { count: 1, earnings: 12 },
      week: { count: 2, earnings: 21 },
      month: { count: 3, earnings: 26 },
      availableBalanceCents: 12345,
      currency: 'CAD',
      pendingInstantPayoutRequests: [
        {
          id: 'ipr-1',
          amountCents: 5000,
          feeCents: 75,
          status: 'pending',
          requestedAt: '2026-06-15T16:00:00.000Z',
        },
      ],
      payoutAccountStatus: {
        connected: true,
        status: 'active',
        payoutsEnabled: true,
        chargesEnabled: true,
        onboardingCompletedAt: '2026-06-01T12:00:00.000Z',
      },
    });
    expect(json.data.week.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: '2026-06-12', count: 1, earnings: 9 }),
        expect.objectContaining({ date: '2026-06-15', count: 1, earnings: 12 }),
      ])
    );
  });

  it('defaults absent ledger and payout rows defensively for new drivers', async () => {
    mockGetDeliveryHistory.mockResolvedValueOnce([]);
    mockDb({
      platformAccount: null,
      pendingInstantPayouts: [],
      payoutAccount: null,
    });

    const { GET } = await import('../app/api/earnings/route');

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toMatchObject({
      today: { count: 0, earnings: 0 },
      week: { count: 0, earnings: 0, breakdown: [] },
      month: { count: 0, earnings: 0 },
      availableBalanceCents: 0,
      currency: 'CAD',
      pendingInstantPayoutRequests: [],
      payoutAccountStatus: {
        connected: false,
        status: 'not_started',
        payoutsEnabled: false,
        chargesEnabled: false,
        onboardingCompletedAt: null,
      },
    });
  });

  it('falls back to CAD when the ledger currency is malformed', async () => {
    mockDb({
      platformAccount: { balance_cents: 1000, currency: 'not-a-currency' },
      pendingInstantPayouts: [],
      payoutAccount: null,
    });

    const { GET } = await import('../app/api/earnings/route');
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.currency).toBe('CAD');
  });

  it.each([
    ['platform account', { platformAccountError: { message: 'ledger read failed' } }],
    ['pending instant payout', { pendingInstantPayoutsError: { message: 'pending read failed' } }],
    ['payout account', { payoutAccountError: { message: 'payout read failed' } }],
  ])('returns an explicit error when the %s financial query fails', async (_label, overrides) => {
    mockDb({
      platformAccount: { balance_cents: 1000, currency: 'CAD' },
      pendingInstantPayouts: [],
      payoutAccount: null,
      ...overrides,
    });

    const { GET } = await import('../app/api/earnings/route');
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toMatchObject({
      code: 'FINANCIAL_QUERY_ERROR',
      message: expect.stringContaining('earnings financial data'),
    });
  });

  it('returns 401 when no approved driver session exists', async () => {
    mockGetDriverActorContext.mockResolvedValueOnce(null);

    const { GET } = await import('../app/api/earnings/route');
    const response = await GET();

    expect(response.status).toBe(401);
  });
});
