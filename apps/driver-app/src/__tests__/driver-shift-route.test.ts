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

type ShiftFixture = {
  presence: Record<string, unknown> | null;
  activeDeliveries: Record<string, unknown>[];
  shift: Record<string, unknown> | null;
  presenceError?: Record<string, unknown> | null;
  activeDeliveriesError?: Record<string, unknown> | null;
  shiftError?: Record<string, unknown> | null;
};

function resultChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> & PromiseLike<{ data: unknown; error: unknown }> = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    order: jest.fn(() => chain),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    single: jest.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

function mockDb(fixture: ShiftFixture) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'driver_presence') {
      return resultChain({ data: fixture.presence, error: fixture.presenceError ?? null });
    }

    if (table === 'deliveries') {
      return resultChain({ data: fixture.activeDeliveries, error: fixture.activeDeliveriesError ?? null });
    }

    if (table === 'driver_shifts') {
      return resultChain({ data: fixture.shift, error: fixture.shiftError ?? null });
    }

    return resultChain({ data: null, error: null });
  });
}

describe('GET /api/driver/shift', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-06-08T18:15:00.000Z'));
    mockGetDriverActorContext.mockResolvedValue({
      driverId: 'driver-1',
      actor: { userId: 'user-1', role: 'driver', entityId: 'driver-1' },
    });
    mockGetDeliveryHistory.mockResolvedValue([
      {
        id: 'delivery-today-1',
        status: 'delivered',
        actual_dropoff_at: '2026-06-08T17:00:00.000Z',
        driver_payout: 12.5,
      },
      {
        id: 'delivery-old',
        status: 'delivered',
        actual_dropoff_at: '2026-06-07T17:00:00.000Z',
        driver_payout: 8,
      },
    ]);
    mockDb({
      presence: {
        driver_id: 'driver-1',
        status: 'online',
        current_shift_id: 'shift-1',
        last_location_at: '2026-06-08T18:14:30.000Z',
        last_location_update: null,
        current_lat: 43.1,
        current_lng: -79.1,
      },
      shift: {
        id: 'shift-1',
        started_at: '2026-06-08T16:00:00.000Z',
        ended_at: null,
        total_deliveries: 1,
        total_earnings: 12.5,
        total_distance_km: 7.4,
      },
      activeDeliveries: [
        {
          id: 'delivery-active',
          status: 'picked_up',
          updated_at: '2026-06-08T18:10:00.000Z',
          estimated_dropoff_at: '2026-06-08T18:30:00.000Z',
        },
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 401 when no approved driver session exists', async () => {
    mockGetDriverActorContext.mockResolvedValueOnce(null);

    const { GET } = await import('../app/api/driver/shift/route');
    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockGetDriverActorContext).toHaveBeenCalledWith();
  });

  it('returns current shift, active work, location freshness, and today earnings without raw coordinates', async () => {
    const { GET } = await import('../app/api/driver/shift/route');

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetDeliveryHistory).toHaveBeenCalledWith(expect.anything(), 'driver-1', { limit: 1000 });
    expect(json.data).toMatchObject({
      driverId: 'driver-1',
      presenceStatus: 'online',
      currentShiftId: 'shift-1',
      isOnShift: true,
      shiftStartedAt: '2026-06-08T16:00:00.000Z',
      shiftEndedAt: null,
      lastLocationAt: '2026-06-08T18:14:30.000Z',
      activeDeliveryCount: 1,
      activeDeliveries: [
        {
          id: 'delivery-active',
          status: 'picked_up',
          updatedAt: '2026-06-08T18:10:00.000Z',
          estimatedDropoffAt: '2026-06-08T18:30:00.000Z',
        },
      ],
      currentShift: {
        totalDeliveries: 1,
        totalEarnings: 12.5,
        totalDistanceKm: 7.4,
      },
      today: {
        completedDeliveries: 1,
        earnings: 12.5,
      },
    });
    expect(JSON.stringify(json.data)).not.toContain('current_lat');
    expect(JSON.stringify(json.data)).not.toContain('current_lng');
  });

  it('defaults to an offline no-shift summary for new approved drivers', async () => {
    mockGetDeliveryHistory.mockResolvedValueOnce([]);
    mockDb({
      presence: null,
      shift: null,
      activeDeliveries: [],
    });

    const { GET } = await import('../app/api/driver/shift/route');
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toMatchObject({
      driverId: 'driver-1',
      presenceStatus: 'offline',
      currentShiftId: null,
      isOnShift: false,
      lastLocationAt: null,
      activeDeliveryCount: 0,
      activeDeliveries: [],
      currentShift: null,
      today: {
        completedDeliveries: 0,
        earnings: 0,
      },
    });
  });

  it('returns a clear error when shift source queries fail', async () => {
    mockDb({
      presence: null,
      shift: null,
      activeDeliveries: [],
      presenceError: { message: 'presence read failed' },
    });

    const { GET } = await import('../app/api/driver/shift/route');
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toMatchObject({
      code: 'SHIFT_QUERY_ERROR',
      message: expect.stringContaining('shift'),
    });
  });
});
