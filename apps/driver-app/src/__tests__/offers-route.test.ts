/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET, POST } from '../app/api/offers/route';

const respondToOffer = jest.fn();
const mockFrom = jest.fn();
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
