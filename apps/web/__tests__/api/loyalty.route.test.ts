/**
 * @jest-environment node
 */

const mockGetCustomerActorContext = jest.fn();
const mockErrorResponse = jest.fn((code: string, msg: string, status = 400) => {
  return new Response(JSON.stringify({ error: { code, message: msg } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
});
const mockSuccessResponse = jest.fn((data: unknown) => {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

const mockGetBalance = jest.fn();
const mockGetOrCreateAccount = jest.fn();
const mockRedeemPoints = jest.fn();
const mockCreateLoyaltyService = jest.fn(() => ({
  getBalance: mockGetBalance,
  getOrCreateAccount: mockGetOrCreateAccount,
  redeemPoints: mockRedeemPoints,
}));

jest.mock('@/lib/engine', () => ({
  getCustomerActorContext: mockGetCustomerActorContext,
  errorResponse: mockErrorResponse,
  successResponse: mockSuccessResponse,
}));

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => ({})),
}));

jest.mock('@ridendine/engine', () => ({
  createLoyaltyService: mockCreateLoyaltyService,
}));

describe('GET /api/loyalty', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetCustomerActorContext.mockResolvedValue(null);

    const { GET } = await import('../../src/app/api/loyalty/route');
    const res = await GET();

    expect(res.status).toBe(401);
    expect(mockErrorResponse).toHaveBeenCalledWith('UNAUTHORIZED', expect.any(String), 401);
  });

  it('returns loyalty balance and transactions on success', async () => {
    mockGetCustomerActorContext.mockResolvedValue({
      customerId: 'cust-1',
      actor: { userId: 'user-1', role: 'customer', entityId: 'cust-1' },
    });

    const fakeAccount = {
      id: 'acc-1',
      customer_id: 'cust-1',
      points_balance: 250,
      lifetime_points: 250,
      tier: 'bronze',
    };

    const fakeBalance = {
      pointsBalance: 250,
      lifetimePoints: 250,
      tier: 'bronze',
      nextTierPoints: 250,
    };

    const fakeTxTable = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    // Override createAdminClient for this test to return a client with from()
    const dbModule = await import('@ridendine/db');
    (dbModule.createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => fakeTxTable),
    });

    mockGetBalance.mockResolvedValue(fakeBalance);
    mockGetOrCreateAccount.mockResolvedValue(fakeAccount);

    const { GET } = await import('../../src/app/api/loyalty/route');
    await GET();

    expect(mockSuccessResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        pointsBalance: 250,
        tier: 'bronze',
        recentTransactions: [],
      })
    );
  });
});

describe('POST /api/loyalty', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetCustomerActorContext.mockResolvedValue(null);

    const { POST } = await import('../../src/app/api/loyalty/route');
    const req = new Request('http://localhost/api/loyalty', {
      method: 'POST',
      body: JSON.stringify({ points: 50 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid points value', async () => {
    mockGetCustomerActorContext.mockResolvedValue({
      customerId: 'cust-1',
      actor: { userId: 'user-1', role: 'customer', entityId: 'cust-1' },
    });

    const { POST } = await import('../../src/app/api/loyalty/route');
    const req = new Request('http://localhost/api/loyalty', {
      method: 'POST',
      body: JSON.stringify({ points: -5 }),
      headers: { 'Content-Type': 'application/json' },
    });
    await POST(req);

    expect(mockErrorResponse).toHaveBeenCalledWith('VALIDATION_ERROR', expect.any(String), 400);
  });

  it('redeems points and returns discount', async () => {
    mockGetCustomerActorContext.mockResolvedValue({
      customerId: 'cust-1',
      actor: { userId: 'user-1', role: 'customer', entityId: 'cust-1' },
    });

    const redeemResult = { discountCents: 500, pointsRedeemed: 50, newBalance: 50 };
    mockRedeemPoints.mockResolvedValue(redeemResult);

    const { POST } = await import('../../src/app/api/loyalty/route');
    const req = new Request('http://localhost/api/loyalty', {
      method: 'POST',
      body: JSON.stringify({ points: 50 }),
      headers: { 'Content-Type': 'application/json' },
    });
    await POST(req);

    expect(mockSuccessResponse).toHaveBeenCalledWith(redeemResult);
  });

  it('returns INSUFFICIENT_POINTS error when not enough points', async () => {
    mockGetCustomerActorContext.mockResolvedValue({
      customerId: 'cust-1',
      actor: { userId: 'user-1', role: 'customer', entityId: 'cust-1' },
    });

    mockRedeemPoints.mockRejectedValue(new Error('Insufficient points: have 10, need 100'));

    const { POST } = await import('../../src/app/api/loyalty/route');
    const req = new Request('http://localhost/api/loyalty', {
      method: 'POST',
      body: JSON.stringify({ points: 100 }),
      headers: { 'Content-Type': 'application/json' },
    });
    await POST(req);

    expect(mockErrorResponse).toHaveBeenCalledWith(
      'INSUFFICIENT_POINTS',
      expect.stringContaining('Insufficient points'),
      400
    );
  });
});
