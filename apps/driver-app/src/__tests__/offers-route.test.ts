/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET, POST } from '../app/api/offers/route';

const respondToOffer = jest.fn();
const mockFrom = jest.fn();
const mockListPendingAssignmentOffersForDriver = jest.fn(
  async (_client, driverId: string, nowIso: string) =>
    mockFrom('assignment_attempts')
      .select(`
        id,
        delivery_id,
        expires_at,
        delivery:deliveries (
          id,
          pickup_address,
          pickup_lat,
          pickup_lng,
          dropoff_address,
          dropoff_lat,
          dropoff_lng,
          distance_km,
          route_to_dropoff_seconds,
          driver_payout,
          orders (
            order_number,
            total,
            tip,
            storefront:chef_storefronts (name)
          )
        )
      `)
      .eq('driver_id', driverId)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
      .order('expires_at', { ascending: true })
);
let lastOfferSelect = '';

jest.mock('@/lib/engine', () => ({
  getDriverActorContext: jest.fn().mockResolvedValue({
    driverId: 'driver-self',
    actor: { userId: 'u1', role: 'driver', entityId: 'driver-self' },
  }),
  getEngine: jest.fn(() => ({
    dispatch: { respondToOffer },
  })),
  errorResponse: (code: string, message: string, status = 400) =>
    new Response(JSON.stringify({ success: false, error: { code, message } }), { status }),
  successResponse: (data: unknown, status = 200) =>
    new Response(JSON.stringify({ success: true, data }), { status }),
}));

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => ({
    from: mockFrom,
  })),
  listPendingAssignmentOffersForDriver: (...args: unknown[]) =>
    mockListPendingAssignmentOffersForDriver(...args),
}));

describe('GET /api/offers', () => {
  beforeEach(() => {
    lastOfferSelect = '';
    mockFrom.mockReset();
  });

  it('queries pending offers using the deployed deliveries schema', async () => {
    const order = jest.fn().mockResolvedValue({ data: [], error: null });
    const gt = jest.fn().mockReturnValue({ order });
    const eqResponse = { eq: jest.fn().mockReturnValue({ gt }) };
    const select = jest.fn((columns: string) => {
      lastOfferSelect = columns;
      return { eq: jest.fn().mockReturnValue(eqResponse) };
    });
    mockFrom.mockReturnValue({ select });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('assignment_attempts');
    expect(lastOfferSelect).toContain('distance_km');
    expect(lastOfferSelect).not.toContain('estimated_distance_km');
    expect(lastOfferSelect).not.toContain('estimated_duration_minutes');
  });

  it('returns a driver-safe offer payload with decision support fields', async () => {
    const expiresAt = new Date(Date.now() + 45_000).toISOString();
    const dbOffer = {
      id: 'att-1',
      delivery_id: 'del-1',
      driver_id: 'driver-self',
      expires_at: expiresAt,
      delivery: {
        id: 'del-1',
        pickup_address: '123 King St W, Hamilton',
        pickup_lat: 43.255,
        pickup_lng: -79.871,
        dropoff_address: '500 Main St E, Hamilton',
        dropoff_lat: 43.26,
        dropoff_lng: -79.86,
        distance_km: 4.2,
        route_to_dropoff_seconds: 930,
        driver_payout: 11.75,
        orders: {
          order_number: 'RD-1007',
          total: 42.5,
          tip: 3.25,
          storefront: { name: 'Every Bite Yum' },
        },
      },
    };
    const order = jest.fn().mockResolvedValue({ data: [dbOffer], error: null });
    const gt = jest.fn().mockReturnValue({ order });
    const eqResponse = { eq: jest.fn().mockReturnValue({ gt }) };
    const select = jest.fn((columns: string) => {
      lastOfferSelect = columns;
      return { eq: jest.fn().mockReturnValue(eqResponse) };
    });
    mockFrom.mockReturnValue({ select });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.offers).toEqual([
      expect.objectContaining({
        attemptId: 'att-1',
        deliveryId: 'del-1',
        pickupAddress: '123 King St W, Hamilton',
        dropoffAddress: '500 Main St E, Hamilton',
        estimatedDistanceKm: 4.2,
        estimatedRouteSeconds: 930,
        estimatedPayout: 11.75,
        customerTip: 3.25,
        orderNumber: 'RD-1007',
        storefrontName: 'Every Bite Yum',
        expiresAt,
      }),
    ]);
    const serialized = JSON.stringify(body.data.offers[0]);
    expect(serialized).not.toMatch(/pickup_lat|pickup_lng|dropoff_lat|dropoff_lng/i);
    expect(serialized).not.toMatch(/"lat"|"lng"|latitude|longitude/i);
    expect(lastOfferSelect).toContain('route_to_dropoff_seconds');
    expect(lastOfferSelect).toContain('driver_payout');
    expect(lastOfferSelect).toContain('tip');
    expect(lastOfferSelect).toContain('storefront:chef_storefronts');
  });
});

describe('POST /api/offers', () => {
  beforeEach(() => {
    respondToOffer.mockReset();
  });

  it('delegates accept to dispatch.respondToOffer (no polling contract)', async () => {
    respondToOffer.mockResolvedValue({ success: true, data: { id: 'del-1' } });
    const req = new NextRequest('http://localhost/api/offers', {
      method: 'POST',
      body: JSON.stringify({
        attemptId: 'att-1',
        driverId: 'driver-self',
        action: 'accept',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(respondToOffer).toHaveBeenCalledWith(
      'att-1',
      'accept',
      'driver-self',
      expect.objectContaining({ role: 'driver' })
    );
  });

  it('surfaces engine errors for expired or already-taken offers', async () => {
    respondToOffer.mockResolvedValue({
      success: false,
      error: { code: 'OFFER_EXPIRED', message: 'This offer has expired' },
    });
    const req = new NextRequest('http://localhost/api/offers', {
      method: 'POST',
      body: JSON.stringify({
        attemptId: 'att-expired',
        driverId: 'driver-self',
        action: 'accept',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('OFFER_EXPIRED');
  });
});
