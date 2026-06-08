/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockFrom = jest.fn();
const mockGetDriverActorContext = jest.fn();
const mockMaybeSingle = jest.fn();
const mockSingle = jest.fn();
const mockUpsert = jest.fn();

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

const defaultPreferences = {
  new_order: { email: true, sms: true },
  order_accepted: { email: true, sms: true },
  order_ready: { email: true, sms: true },
  delivery_offer: { email: true, sms: true },
  delivery_assigned: { email: true, sms: true },
  payment_received: { email: true, sms: true },
};

function request(body: unknown) {
  return new NextRequest('http://localhost/api/driver/notification-preferences', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

function preferenceChain() {
  const chain: Record<string, jest.Mock> & PromiseLike<{ data: unknown; error: unknown }> = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
    upsert: mockUpsert,
    then: (resolve, reject) => Promise.resolve({ data: null, error: null }).then(resolve, reject),
  };
  mockUpsert.mockReturnValue(chain);
  return chain;
}

async function getRoute() {
  return import('../app/api/driver/notification-preferences/route');
}

describe('/api/driver/notification-preferences', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGetDriverActorContext.mockResolvedValue({
      driverId: 'driver-1',
      actor: { userId: 'user-1', role: 'driver', entityId: 'driver-1' },
    });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({ data: { preferences: defaultPreferences }, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'driver_notification_preferences') {
        return preferenceChain();
      }

      throw new Error(`Unexpected table ${table}`);
    });
  });

  it('returns 401 when no driver session exists', async () => {
    mockGetDriverActorContext.mockResolvedValueOnce(null);

    const { GET } = await getRoute();
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toMatchObject({ code: 'UNAUTHORIZED' });
    expect(mockGetDriverActorContext).toHaveBeenCalledWith({ requireApproved: false });
  });

  it('returns default preferences when no database row exists', async () => {
    const { GET } = await getRoute();
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toMatchObject({
      preferences: defaultPreferences,
      source: 'default',
    });
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it('returns default preferences when the database preferences table is not available', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'PGRST205',
        message: "Could not find the table 'public.driver_notification_preferences' in the schema cache",
      },
    });

    const { GET } = await getRoute();
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toMatchObject({
      preferences: defaultPreferences,
      source: 'default',
      persistence: 'unavailable',
    });
  });

  it('rejects unknown notification events or channels', async () => {
    const { PATCH } = await getRoute();
    const response = await PATCH(
      request({
        preferences: {
          ...defaultPreferences,
          delivery_offer: { email: true, sms: true, push: true },
        },
      })
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('stores preferences for the current driver only', async () => {
    const preferences = {
      ...defaultPreferences,
      delivery_offer: { email: true, sms: false },
    };

    const { PATCH } = await getRoute();
    const response = await PATCH(request({ preferences }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.preferences.delivery_offer).toEqual({ email: true, sms: false });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        driver_id: 'driver-1',
        preferences,
      }),
      { onConflict: 'driver_id' }
    );
    expect(mockUpsert.mock.calls[0][0]).not.toHaveProperty('driverId');
  });
});
