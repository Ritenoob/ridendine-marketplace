/** @jest-environment node */
// Tests for POST /api/orders/[id]/cancel

// ---- Mocks setup (before imports) ----

const mockFrom = jest.fn();
const mockCancelOrder = jest.fn();
const mockGetEngine = jest.fn();
const mockGetCustomerActorContext = jest.fn();
const mockErrorResponse = jest.fn();
const mockSuccessResponse = jest.fn();
const mockEvaluateRateLimit = jest.fn();
const mockRateLimitPolicyResponse = jest.fn();

jest.mock('@/lib/engine', () => ({
  getEngine: (...args: unknown[]) => mockGetEngine(...args),
  getCustomerActorContext: (...args: unknown[]) => mockGetCustomerActorContext(...args),
  errorResponse: (...args: unknown[]) => mockErrorResponse(...args),
  successResponse: (...args: unknown[]) => mockSuccessResponse(...args),
}));

jest.mock('@ridendine/db', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

jest.mock('@ridendine/utils', () => ({
  evaluateRateLimit: (...args: unknown[]) => mockEvaluateRateLimit(...args),
  RATE_LIMIT_POLICIES: { customerWrite: 'customerWrite' },
  rateLimitPolicyResponse: (...args: unknown[]) => mockRateLimitPolicyResponse(...args),
}));

import { POST } from '../../../src/app/api/orders/[id]/cancel/route';

// Helper to build a mock NextRequest
function makeRequest(body?: unknown): Request {
  return {
    json: async () => body ?? {},
    headers: { get: () => null },
  } as unknown as Request;
}

function makeRouteParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const customerContext = {
  actor: { userId: 'user-1', role: 'customer', entityId: 'cust-1' },
  customerId: 'cust-1',
};

function setupDb(orderRow: unknown) {
  const single = jest.fn().mockResolvedValue({ data: orderRow, error: null });
  const eq2 = jest.fn(() => ({ single }));
  const eq1 = jest.fn(() => ({ eq: eq2 }));
  const select = jest.fn(() => ({ eq: eq1 }));
  mockFrom.mockReturnValue({ select });
}

beforeEach(() => {
  jest.clearAllMocks();

  mockEvaluateRateLimit.mockResolvedValue({ allowed: true });
  mockErrorResponse.mockImplementation((code: string, msg: string, status?: number) =>
    new Response(JSON.stringify({ error: { code, message: msg } }), { status: status ?? 400 })
  );
  mockSuccessResponse.mockImplementation((data: unknown) =>
    new Response(JSON.stringify({ data }), { status: 200 })
  );
  mockRateLimitPolicyResponse.mockReturnValue(
    new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 })
  );
});

describe('POST /api/orders/[id]/cancel', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetCustomerActorContext.mockResolvedValue(null);

    await POST(makeRequest(), makeRouteParams('order-1'));

    expect(mockErrorResponse).toHaveBeenCalledWith('UNAUTHORIZED', 'Not authenticated', 401);
  });

  it('returns 429 when rate limited', async () => {
    mockGetCustomerActorContext.mockResolvedValue(customerContext);
    mockEvaluateRateLimit.mockResolvedValue({ allowed: false });

    const response = await POST(makeRequest(), makeRouteParams('order-1'));

    expect(mockRateLimitPolicyResponse).toHaveBeenCalled();
    expect(response.status).toBe(429);
  });

  it('returns 404 when order not found', async () => {
    mockGetCustomerActorContext.mockResolvedValue(customerContext);
    setupDb(null);

    await POST(makeRequest(), makeRouteParams('order-1'));

    expect(mockErrorResponse).toHaveBeenCalledWith('NOT_FOUND', 'Order not found', 404);
  });

  it('returns 404 when order belongs to different customer', async () => {
    mockGetCustomerActorContext.mockResolvedValue(customerContext);
    setupDb({ id: 'order-1', customer_id: 'other-cust', engine_status: 'pending' });

    await POST(makeRequest(), makeRouteParams('order-1'));

    expect(mockErrorResponse).toHaveBeenCalledWith('NOT_FOUND', 'Order not found', 404);
  });

  it('returns 400 when order is already accepted (contact support)', async () => {
    mockGetCustomerActorContext.mockResolvedValue(customerContext);
    setupDb({ id: 'order-1', customer_id: 'cust-1', engine_status: 'accepted' });

    await POST(makeRequest(), makeRouteParams('order-1'));

    expect(mockErrorResponse).toHaveBeenCalledWith(
      'CANCEL_NOT_ALLOWED',
      'Contact support to cancel',
      400
    );
  });

  it('returns 400 when order is in preparing state', async () => {
    mockGetCustomerActorContext.mockResolvedValue(customerContext);
    setupDb({ id: 'order-1', customer_id: 'cust-1', engine_status: 'preparing' });

    await POST(makeRequest(), makeRouteParams('order-1'));

    expect(mockErrorResponse).toHaveBeenCalledWith(
      'CANCEL_NOT_ALLOWED',
      'Contact support to cancel',
      400
    );
  });

  it('returns 400 when order is ready state', async () => {
    mockGetCustomerActorContext.mockResolvedValue(customerContext);
    setupDb({ id: 'order-1', customer_id: 'cust-1', engine_status: 'ready' });

    await POST(makeRequest(), makeRouteParams('order-1'));

    expect(mockErrorResponse).toHaveBeenCalledWith(
      'CANCEL_NOT_ALLOWED',
      'Contact support to cancel',
      400
    );
  });

  it('cancels a pending order successfully', async () => {
    mockGetCustomerActorContext.mockResolvedValue(customerContext);
    setupDb({ id: 'order-1', customer_id: 'cust-1', engine_status: 'pending' });

    mockCancelOrder.mockResolvedValue({
      success: true,
      order: { id: 'order-1', engine_status: 'cancelled', status: 'cancelled' },
    });
    mockGetEngine.mockReturnValue({ orders: { cancelOrder: mockCancelOrder } });

    await POST(makeRequest(), makeRouteParams('order-1'));

    expect(mockCancelOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        actorId: 'user-1',
        actorType: 'customer',
        actorRole: 'customer',
        reason: 'customer_requested',
      })
    );
    expect(mockSuccessResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        message: expect.stringContaining('refund'),
      })
    );
  });

  it('also cancels payment_authorized orders', async () => {
    mockGetCustomerActorContext.mockResolvedValue(customerContext);
    setupDb({ id: 'order-2', customer_id: 'cust-1', engine_status: 'payment_authorized' });

    mockCancelOrder.mockResolvedValue({
      success: true,
      order: { id: 'order-2', engine_status: 'cancelled', status: 'cancelled' },
    });
    mockGetEngine.mockReturnValue({ orders: { cancelOrder: mockCancelOrder } });

    await POST(makeRequest(), makeRouteParams('order-2'));

    expect(mockCancelOrder).toHaveBeenCalled();
    expect(mockSuccessResponse).toHaveBeenCalled();
  });

  it('returns 500 when engine cancel fails', async () => {
    mockGetCustomerActorContext.mockResolvedValue(customerContext);
    setupDb({ id: 'order-1', customer_id: 'cust-1', engine_status: 'pending' });

    mockCancelOrder.mockResolvedValue({ success: false, error: 'Transition failed' });
    mockGetEngine.mockReturnValue({ orders: { cancelOrder: mockCancelOrder } });

    await POST(makeRequest(), makeRouteParams('order-1'));

    expect(mockErrorResponse).toHaveBeenCalledWith('CANCEL_FAILED', expect.any(String), 500);
  });

  it('returns 500 on unexpected error', async () => {
    mockGetCustomerActorContext.mockRejectedValue(new Error('db exploded'));

    await POST(makeRequest(), makeRouteParams('order-1'));

    expect(mockErrorResponse).toHaveBeenCalledWith('INTERNAL_ERROR', 'Internal server error', 500);
  });
});
