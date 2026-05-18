/**
 * @jest-environment node
 */
import { POST } from '../app/api/deliveries/[id]/proof/route';

const mockGetDriverActorContext = jest.fn();
const mockVerifyDriverOwnsDelivery = jest.fn();
const mockCompleteDeliveredOrder = jest.fn();
const mockUpdateDeliveryStatus = jest.fn();

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

  it('routes dropoff events to completeDeliveredOrder', async () => {
    const res = await POST(
      buildRequest({ eventType: 'dropoff', proofUrl: 'https://example.com/p.jpg', notes: 'Left at door' }) as never,
      params,
    );
    expect(res.status).toBe(200);
    expect(mockCompleteDeliveredOrder).toHaveBeenCalledWith(
      'del-1',
      expect.objectContaining({ role: 'driver' }),
      expect.objectContaining({ proofUrl: 'https://example.com/p.jpg', notes: 'Left at door' }),
    );
    expect(mockUpdateDeliveryStatus).not.toHaveBeenCalled();
  });

  it('routes pickup events to updateDeliveryStatus(picked_up)', async () => {
    const res = await POST(
      buildRequest({ eventType: 'pickup', proofUrl: 'https://example.com/p.jpg' }) as never,
      params,
    );
    expect(res.status).toBe(200);
    expect(mockUpdateDeliveryStatus).toHaveBeenCalledWith(
      'del-1',
      'picked_up',
      expect.objectContaining({ role: 'driver' }),
      expect.any(Object),
    );
    expect(mockCompleteDeliveredOrder).not.toHaveBeenCalled();
  });
});
