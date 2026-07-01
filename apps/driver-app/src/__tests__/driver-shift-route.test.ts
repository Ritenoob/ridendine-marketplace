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
  createDriverShift: (_client: unknown, driverId: string, timestamp: string) =>
    mockFrom('driver_shifts')
      .insert({
        driver_id: driverId,
        started_at: timestamp,
        updated_at: timestamp,
      })
      .select('id,started_at,ended_at,total_deliveries,total_earnings,total_distance_km')
      .single(),
  endDriverShift: (_client: unknown, driverId: string, shiftId: string, timestamp: string) =>
    mockFrom('driver_shifts')
      .update({
        ended_at: timestamp,
        updated_at: timestamp,
      })
      .eq('id', shiftId)
      .eq('driver_id', driverId)
      .is('ended_at', null)
      .select('id,started_at,ended_at,total_deliveries,total_earnings,total_distance_km')
      .single(),
  getDeliveryHistory: (...args: unknown[]) => mockGetDeliveryHistory(...args),
  getDriverShiftById: (_client: unknown, driverId: string, shiftId: string) =>
    mockFrom('driver_shifts')
      .select('id,started_at,ended_at,total_deliveries,total_earnings,total_distance_km')
      .eq('id', shiftId)
      .eq('driver_id', driverId)
      .maybeSingle(),
  getDriverShiftPresence: (_client: unknown, driverId: string) =>
    mockFrom('driver_presence')
      .select('status,current_shift_id,last_location_at,last_location_update')
      .eq('driver_id', driverId)
      .maybeSingle(),
  listDriverShiftActiveDeliveries: (_client: unknown, driverId: string) =>
    mockFrom('deliveries')
      .select('id,status,updated_at,estimated_dropoff_at')
      .eq('driver_id', driverId)
      .in('status', expect.any(Array))
      .order('updated_at', { ascending: false }),
  upsertDriverShiftPresence: (_client: unknown, payload: Record<string, unknown>) =>
    mockFrom('driver_presence')
      .upsert(payload, { onConflict: 'driver_id' })
      .select('status,current_shift_id,last_location_at,last_location_update')
      .single(),
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
  insertedShift?: Record<string, unknown> | null;
  endedShift?: Record<string, unknown> | null;
  upsertedPresence?: Record<string, unknown> | null;
  presenceError?: Record<string, unknown> | null;
  activeDeliveriesError?: Record<string, unknown> | null;
  shiftError?: Record<string, unknown> | null;
  insertShiftError?: Record<string, unknown> | null;
  updateShiftError?: Record<string, unknown> | null;
  upsertPresenceError?: Record<string, unknown> | null;
};

const dbWrites = {
  insertShift: jest.fn(),
  updateShift: jest.fn(),
  upsertPresence: jest.fn(),
};

function tableResultChain(
  table: string,
  fixture: ShiftFixture
) {
  let mutation: 'insert' | 'update' | 'upsert' | null = null;
  let mutationPayload: unknown;

  function readResult() {
    if (table === 'driver_presence') {
      return { data: fixture.presence, error: fixture.presenceError ?? null };
    }

    if (table === 'deliveries') {
      return { data: fixture.activeDeliveries, error: fixture.activeDeliveriesError ?? null };
    }

    if (table === 'driver_shifts') {
      return { data: fixture.shift, error: fixture.shiftError ?? null };
    }

    return { data: null, error: null };
  }

  function singleResult() {
    if (table === 'driver_shifts' && mutation === 'insert') {
      return {
        data: fixture.insertedShift ?? fixture.shift,
        error: fixture.insertShiftError ?? null,
      };
    }

    if (table === 'driver_shifts' && mutation === 'update') {
      return {
        data: fixture.endedShift ?? fixture.shift,
        error: fixture.updateShiftError ?? null,
      };
    }

    if (table === 'driver_presence' && mutation === 'upsert') {
      return {
        data: fixture.upsertedPresence ?? mutationPayload,
        error: fixture.upsertPresenceError ?? null,
      };
    }

    return readResult();
  }

  const chain: Record<string, jest.Mock> & PromiseLike<{ data: unknown; error: unknown }> = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    is: jest.fn(() => chain),
    in: jest.fn(() => chain),
    order: jest.fn(() => chain),
    insert: jest.fn((payload: unknown) => {
      mutation = 'insert';
      mutationPayload = payload;
      dbWrites.insertShift(payload);
      return chain;
    }),
    update: jest.fn((payload: unknown) => {
      mutation = 'update';
      mutationPayload = payload;
      dbWrites.updateShift(payload);
      return chain;
    }),
    upsert: jest.fn((payload: unknown, options?: unknown) => {
      mutation = 'upsert';
      mutationPayload = payload;
      dbWrites.upsertPresence(payload, options);
      return chain;
    }),
    maybeSingle: jest.fn(() => Promise.resolve(readResult())),
    single: jest.fn(() => Promise.resolve(singleResult())),
    then: (resolve, reject) => Promise.resolve(readResult()).then(resolve, reject),
  };
  return chain;
}

function mockDb(fixture: ShiftFixture) {
  mockFrom.mockImplementation((table: string) => {
    return tableResultChain(table, fixture);
  });
}

describe('GET /api/driver/shift', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    dbWrites.insertShift.mockClear();
    dbWrites.updateShift.mockClear();
    dbWrites.upsertPresence.mockClear();
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

  it('starts a new shift and links driver presence online', async () => {
    mockGetDeliveryHistory.mockResolvedValueOnce([]);
    mockDb({
      presence: {
        driver_id: 'driver-1',
        status: 'offline',
        current_shift_id: null,
        last_location_at: null,
        last_location_update: null,
      },
      shift: null,
      insertedShift: {
        id: 'shift-started',
        started_at: '2026-06-08T18:15:00.000Z',
        ended_at: null,
        total_deliveries: 0,
        total_earnings: 0,
        total_distance_km: null,
      },
      upsertedPresence: {
        driver_id: 'driver-1',
        status: 'online',
        current_shift_id: 'shift-started',
        last_location_at: null,
        last_location_update: null,
      },
      activeDeliveries: [],
    });

    const route = await import('../app/api/driver/shift/route');
    expect(route.POST).toEqual(expect.any(Function));

    const response = await route.POST();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(dbWrites.insertShift).toHaveBeenCalledWith(
      expect.objectContaining({
        driver_id: 'driver-1',
      })
    );
    expect(dbWrites.upsertPresence).toHaveBeenCalledWith(
      expect.objectContaining({
        driver_id: 'driver-1',
        status: 'online',
        current_shift_id: 'shift-started',
      }),
      { onConflict: 'driver_id' }
    );
    expect(json.data).toMatchObject({
      driverId: 'driver-1',
      presenceStatus: 'online',
      currentShiftId: 'shift-started',
      isOnShift: true,
      shiftStartedAt: '2026-06-08T18:15:00.000Z',
      activeDeliveryCount: 0,
      currentShift: {
        totalDeliveries: 0,
        totalEarnings: 0,
        totalDistanceKm: null,
      },
    });
  });

  it('returns the existing open shift instead of creating a duplicate', async () => {
    const { POST } = await import('../app/api/driver/shift/route');
    expect(POST).toEqual(expect.any(Function));

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(dbWrites.insertShift).not.toHaveBeenCalled();
    expect(json.data).toMatchObject({
      currentShiftId: 'shift-1',
      isOnShift: true,
      shiftStartedAt: '2026-06-08T16:00:00.000Z',
    });
  });

  it('blocks ending a shift while active deliveries are still assigned', async () => {
    const route = await import('../app/api/driver/shift/route');
    expect(route.DELETE).toEqual(expect.any(Function));

    const response = await route.DELETE();
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toMatchObject({
      code: 'ACTIVE_DELIVERY_BLOCK',
      message: expect.stringContaining('active delivery'),
    });
    expect(dbWrites.updateShift).not.toHaveBeenCalled();
    expect(dbWrites.upsertPresence).not.toHaveBeenCalled();
  });

  it('ends an open shift and clears driver presence', async () => {
    mockGetDeliveryHistory.mockResolvedValueOnce([]);
    mockDb({
      presence: {
        driver_id: 'driver-1',
        status: 'online',
        current_shift_id: 'shift-1',
        last_location_at: '2026-06-08T18:14:30.000Z',
        last_location_update: null,
      },
      shift: {
        id: 'shift-1',
        started_at: '2026-06-08T16:00:00.000Z',
        ended_at: null,
        total_deliveries: 2,
        total_earnings: 27.75,
        total_distance_km: 18.2,
      },
      endedShift: {
        id: 'shift-1',
        started_at: '2026-06-08T16:00:00.000Z',
        ended_at: '2026-06-08T18:15:00.000Z',
        total_deliveries: 2,
        total_earnings: 27.75,
        total_distance_km: 18.2,
      },
      upsertedPresence: {
        driver_id: 'driver-1',
        status: 'offline',
        current_shift_id: null,
        last_location_at: '2026-06-08T18:14:30.000Z',
        last_location_update: null,
      },
      activeDeliveries: [],
    });

    const { DELETE } = await import('../app/api/driver/shift/route');
    expect(DELETE).toEqual(expect.any(Function));

    const response = await DELETE();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(dbWrites.updateShift).toHaveBeenCalledWith(
      expect.objectContaining({
        ended_at: '2026-06-08T18:15:00.000Z',
      })
    );
    expect(dbWrites.upsertPresence).toHaveBeenCalledWith(
      expect.objectContaining({
        driver_id: 'driver-1',
        status: 'offline',
        current_shift_id: null,
      }),
      { onConflict: 'driver_id' }
    );
    expect(json.data).toMatchObject({
      driverId: 'driver-1',
      presenceStatus: 'offline',
      currentShiftId: null,
      isOnShift: false,
      shiftStartedAt: '2026-06-08T16:00:00.000Z',
      shiftEndedAt: '2026-06-08T18:15:00.000Z',
      currentShift: {
        totalDeliveries: 2,
        totalEarnings: 27.75,
        totalDistanceKm: 18.2,
      },
    });
  });
});
