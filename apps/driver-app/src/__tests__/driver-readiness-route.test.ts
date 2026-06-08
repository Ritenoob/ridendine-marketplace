/**
 * @jest-environment node
 */

const mockFrom = jest.fn();
const mockGetDriverActorContext = jest.fn();

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

jest.mock('@/lib/engine', () => ({
  getDriverActorContext: (...args: unknown[]) => mockGetDriverActorContext(...args),
  errorResponse: (code: string, message: string, status = 400) =>
    new Response(JSON.stringify({ success: false, error: { code, message } }), { status }),
  successResponse: (data: unknown, status = 200) =>
    new Response(JSON.stringify({ success: true, data }), { status }),
}));

type ReadinessFixture = {
  driver: Record<string, unknown> | null;
  presence: Record<string, unknown> | null;
  activeDeliveries: Record<string, unknown>[];
  payoutAccount: Record<string, unknown> | null;
  documents: Record<string, unknown>[];
  platformAccount: Record<string, unknown> | null;
};

const freshLocation = '2026-06-07T18:00:00.000Z';

function baseFixture(overrides: Partial<ReadinessFixture> = {}): ReadinessFixture {
  return {
    driver: {
      id: 'driver-1',
      status: 'approved',
      instant_payouts_enabled: true,
    },
    presence: {
      driver_id: 'driver-1',
      status: 'online',
      last_location_at: freshLocation,
      last_location_update: null,
      current_lat: 43.1,
      current_lng: -79.1,
    },
    activeDeliveries: [],
    payoutAccount: {
      id: 'payout-1',
      status: 'active',
      payouts_enabled: true,
      onboarding_completed_at: '2026-06-01T12:00:00.000Z',
    },
    documents: [
      { id: 'doc-license', document_type: 'drivers_license', status: 'approved', expires_at: '2027-06-01T00:00:00.000Z' },
      { id: 'doc-registration', document_type: 'vehicle_registration', status: 'approved', expires_at: '2027-06-01T00:00:00.000Z' },
      { id: 'doc-insurance', document_type: 'vehicle_insurance', status: 'approved', expires_at: '2027-06-01T00:00:00.000Z' },
    ],
    platformAccount: {
      balance_cents: 4250,
    },
    ...overrides,
  };
}

function resultChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> & PromiseLike<{ data: unknown; error: unknown }> = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    neq: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve(result)),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

function mockDb(fixture: ReadinessFixture) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'drivers') {
      return resultChain({ data: fixture.driver, error: null });
    }

    if (table === 'driver_presence') {
      return resultChain({ data: fixture.presence, error: null });
    }

    if (table === 'deliveries') {
      return resultChain({ data: fixture.activeDeliveries, error: null });
    }

    if (table === 'driver_payout_accounts') {
      return resultChain({ data: fixture.payoutAccount, error: null });
    }

    if (table === 'driver_documents') {
      return resultChain({ data: fixture.documents, error: null });
    }

    if (table === 'platform_accounts') {
      return resultChain({ data: fixture.platformAccount, error: null });
    }

    return resultChain({ data: null, error: null });
  });
}

async function getRoute() {
  return import('../app/api/driver/readiness/route');
}

describe('GET /api/driver/readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-06-07T18:00:30.000Z'));
    mockGetDriverActorContext.mockResolvedValue({
      driverId: 'driver-1',
      actor: { userId: 'user-1', role: 'driver', entityId: 'driver-1' },
    });
    mockDb(baseFixture());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 401 when no driver session exists', async () => {
    mockGetDriverActorContext.mockResolvedValueOnce(null);

    const { GET } = await getRoute();
    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockGetDriverActorContext).toHaveBeenCalledWith({ requireApproved: false });
  });

  it('returns pending readiness instead of requiring an approved session', async () => {
    mockDb(baseFixture({ driver: { id: 'driver-1', status: 'pending', instant_payouts_enabled: false } }));

    const { GET } = await getRoute();
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetDriverActorContext).toHaveBeenCalledWith({ requireApproved: false });
    expect(json.data).toMatchObject({
      driverId: 'driver-1',
      approvalStatus: 'pending',
      presenceStatus: 'online',
      activeDeliveryCount: 0,
      instantPayoutsEnabled: false,
      readiness: {
        status: 'not_approved',
        blocksDispatch: true,
      },
    });
  });

  it('returns suspended readiness instead of hiding blockers behind auth gating', async () => {
    mockDb(baseFixture({ driver: { id: 'driver-1', status: 'suspended', instant_payouts_enabled: true } }));

    const { GET } = await getRoute();
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.readiness).toMatchObject({
      status: 'suspended',
      blocksDispatch: true,
    });
  });

  it('returns active delivery count, payout readiness, balance, and GPS fallback freshness', async () => {
    mockDb(
      baseFixture({
        presence: {
          driver_id: 'driver-1',
          status: 'online',
          last_location_at: null,
          last_location_update: freshLocation,
          current_lat: 43.1,
          current_lng: -79.1,
        },
        activeDeliveries: [{ id: 'delivery-1' }, { id: 'delivery-2' }],
        payoutAccount: null,
        platformAccount: { balance_cents: 9900 },
      })
    );

    const { GET } = await getRoute();
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toMatchObject({
      activeDeliveryCount: 2,
      availableBalanceCents: 9900,
      instantPayoutsEnabled: true,
      lastLocationAt: freshLocation,
      readiness: {
        status: 'payout_setup_needed',
        blocksDispatch: false,
      },
    });
    expect(JSON.stringify(json.data)).not.toContain('current_lat');
    expect(JSON.stringify(json.data)).not.toContain('current_lng');
  });

  it('counts missing required driver documents as compliance blockers', async () => {
    mockDb(baseFixture({ documents: [] }));

    const { GET } = await getRoute();
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toMatchObject({
      complianceOpenItems: 3,
      readiness: {
        status: 'not_dispatchable',
        detail: expect.stringContaining('compliance'),
      },
    });
  });

  it('counts non-approved required driver document rows as compliance blockers', async () => {
    mockDb(
      baseFixture({
        documents: [
          { id: 'doc-1', document_type: 'drivers_license', status: 'pending', expires_at: null },
          { id: 'doc-2', document_type: 'vehicle_registration', status: 'approved', expires_at: '2027-06-01T00:00:00.000Z' },
          { id: 'doc-3', document_type: 'vehicle_insurance', status: 'rejected', expires_at: null },
        ],
      })
    );

    const { GET } = await getRoute();
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toMatchObject({
      complianceOpenItems: 2,
      readiness: {
        status: 'not_dispatchable',
        detail: expect.stringContaining('compliance'),
      },
    });
  });
});
