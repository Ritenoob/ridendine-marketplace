/**
 * @jest-environment node
 */
import { POST } from '../app/api/deliveries/[id]/proof/route';

const mockGetDriverActorContext = jest.fn();
const mockVerifyDriverOwnsDelivery = jest.fn();
const mockCompleteDeliveredOrder = jest.fn();
const mockUpdateDeliveryStatus = jest.fn();
const mockGetDeliveryById = jest.fn();

jest.mock('@ridendine/db', () => ({
  createAdminClient: () => ({}),
  getDeliveryById: (...args: unknown[]) => mockGetDeliveryById(...args),
}));

jest.mock('@/lib/engine', () => ({
  getDriverActorContext: () => mockGetDriverActorContext(),
  verifyDriverOwnsDelivery: (...args: unknown[]) => mockVerifyDriverOwnsDelivery(...args),
  getEngine: () => ({
    platform: { completeDeliveredOrder: (...args: unknown[]) => mockCompleteDeliveredOrder(...args) },
    dispatch: { updateDeliveryStatus: (...args: unknown[]) => mockUpdateDeliveryStatus(...args) },
  }),
  errorResponse: (code: string, message: string, status = 400) =>
    Response.json({ success: false, code, error: message }, { status }),
  successResponse: (data: unknown, status = 200) =>
    Response.json({ success: true, data }, { status }),
}));

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/deliveries/del-1/proof', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: 'del-1' }) };

describe('POST /api/deliveries/[id]/proof', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDriverActorContext.mockResolvedValue({
      driverId: 'driver-self',
      actor: { userId: 'u1', role: 'driver', entityId: 'driver-self' },
    });
    mockVerifyDriverOwnsDelivery.mockResolvedValue(true);
    mockCompleteDeliveredOrder.mockResolvedValue({ success: true, data: { id: 'del-1', status: 'delivered' } });
    mockUpdateDeliveryStatus.mockResolvedValue({ success: true, data: { id: 'del-1', status: 'picked_up' } });
    mockGetDeliveryById.mockResolvedValue({
      id: 'del-1',
      pickup_lat: 43.2601,
      pickup_lng: -79.8712,
      dropoff_lat: 43.2601,
      dropoff_lng: -79.8712,
    });
  });

  it('rejects unauthenticated callers with 401', async () => {
    mockGetDriverActorContext.mockResolvedValueOnce(null);
    const res = await POST(buildRequest({ eventType: 'dropoff', proofUrl: 'https://example.com/p.jpg' }) as never, params);
    expect(res.status).toBe(401);
  });

  it('rejects drivers who do not own the delivery with 403', async () => {
    mockVerifyDriverOwnsDelivery.mockResolvedValueOnce(false);
    const res = await POST(buildRequest({ eventType: 'dropoff', proofUrl: 'https://example.com/p.jpg' }) as never, params);
    expect(res.status).toBe(403);
  });

  it('rejects partial coordinate metadata', async () => {
    const res = await POST(
      buildRequest({
        eventType: 'dropoff',
        proofUrl: 'https://example.com/p.jpg',
        lat: 43.2601,
      }) as never,
      params,
    );

    expect(res.status).toBe(400);
    expect(mockCompleteDeliveredOrder).not.toHaveBeenCalled();
    expect(mockUpdateDeliveryStatus).not.toHaveBeenCalled();
  });

  it('routes dropoff events to completeDeliveredOrder with proof metadata', async () => {
    const res = await POST(
      buildRequest({
        eventType: 'dropoff',
        proofUrl: 'https://example.com/p.jpg',
        notes: 'Left at door',
        signatureUrl: 'https://example.com/signature.jpg',
        lat: 43.2601,
        lng: -79.8712,
      }) as never,
      params,
    );
    expect(res.status).toBe(200);
    expect(mockCompleteDeliveredOrder).toHaveBeenCalledWith(
      'del-1',
      expect.objectContaining({ role: 'driver' }),
      expect.objectContaining({
        proofUrl: 'https://example.com/p.jpg',
        notes: 'Left at door',
        signatureUrl: 'https://example.com/signature.jpg',
        lat: 43.2601,
        lng: -79.8712,
        distanceFromExpectedKm: 0,
      }),
    );
    expect(mockUpdateDeliveryStatus).not.toHaveBeenCalled();
  });

  it('omits the geofence distance when no coordinates are submitted', async () => {
    const res = await POST(
      buildRequest({ eventType: 'dropoff', proofUrl: 'https://example.com/p.jpg' }) as never,
      params,
    );
    expect(res.status).toBe(200);
    expect(mockGetDeliveryById).not.toHaveBeenCalled();
    expect(mockCompleteDeliveredOrder).toHaveBeenCalledWith(
      'del-1',
      expect.objectContaining({ role: 'driver' }),
      expect.not.objectContaining({ distanceFromExpectedKm: expect.anything() }),
    );
  });

  it('still submits the proof when the geofence lookup fails', async () => {
    mockGetDeliveryById.mockRejectedValueOnce(new Error('db down'));
    const res = await POST(
      buildRequest({
        eventType: 'dropoff',
        proofUrl: 'https://example.com/p.jpg',
        lat: 43.2601,
        lng: -79.8712,
      }) as never,
      params,
    );
    expect(res.status).toBe(200);
    expect(mockCompleteDeliveredOrder).toHaveBeenCalledWith(
      'del-1',
      expect.objectContaining({ role: 'driver' }),
      expect.not.objectContaining({ distanceFromExpectedKm: expect.anything() }),
    );
  });

  it('routes pickup events to updateDeliveryStatus(picked_up) with proof metadata', async () => {
    const res = await POST(
      buildRequest({
        eventType: 'pickup',
        proofUrl: 'https://example.com/p.jpg',
        notes: 'Order matched ticket',
        lat: 43.2601,
        lng: -79.8712,
      }) as never,
      params,
    );
    expect(res.status).toBe(200);
    expect(mockUpdateDeliveryStatus).toHaveBeenCalledWith(
      'del-1',
      'picked_up',
      expect.objectContaining({ role: 'driver' }),
      expect.objectContaining({
        proofUrl: 'https://example.com/p.jpg',
        notes: 'Order matched ticket',
        lat: 43.2601,
        lng: -79.8712,
      }),
    );
    expect(mockCompleteDeliveredOrder).not.toHaveBeenCalled();
  });
});
