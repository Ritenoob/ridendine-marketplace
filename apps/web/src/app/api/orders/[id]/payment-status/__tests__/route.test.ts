/**
 * @jest-environment node
 */

const mockCreateAdminClient = jest.fn();
const mockGetCustomerActorContext = jest.fn();

jest.mock('@ridendine/db', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

jest.mock('@/lib/engine', () => ({
  getCustomerActorContext: () => mockGetCustomerActorContext(),
  successResponse: (data: unknown, status = 200) =>
    Response.json({ success: true, data }, { status }),
  errorResponse: (code: string, message: string, status = 400) =>
    Response.json({ success: false, code, error: message }, { status }),
}));

import { GET } from '../route';

function buildClient(opts: { order: Record<string, unknown> | null; capturedFilters?: Record<string, string> }) {
  const filters: Record<string, string> = opts.capturedFilters ?? {};
  return {
    from(_table: string) {
      return {
        select: () => {
          const chain = {
            eq: (col: string, value: string) => {
              filters[col] = value;
              return chain;
            },
            maybeSingle: async () => ({ data: opts.order, error: null }),
          };
          return chain;
        },
      };
    },
  };
}

const params = { params: Promise.resolve({ id: 'order-1' }) };

describe('GET /api/orders/[id]/payment-status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCustomerActorContext.mockResolvedValue({
      customerId: 'cust-1',
      actor: { userId: 'user-1', role: 'customer' },
    });
  });

  it('rejects unauthenticated callers with 401', async () => {
    mockGetCustomerActorContext.mockResolvedValueOnce(null);
    const res = await GET(new Request('http://localhost/api/orders/order-1/payment-status'), params);
    expect(res.status).toBe(401);
  });

  it('scopes the order lookup to the calling customer (ownership)', async () => {
    const filters: Record<string, string> = {};
    mockCreateAdminClient.mockReturnValue(buildClient({ order: null, capturedFilters: filters }));

    const res = await GET(new Request('http://localhost/api/orders/order-1/payment-status'), params);
    expect(res.status).toBe(404);
    expect(filters).toMatchObject({ id: 'order-1', customer_id: 'cust-1' });
  });

  it('returns only safe payment fields when the order belongs to the customer', async () => {
    mockCreateAdminClient.mockReturnValue(
      buildClient({
        order: {
          id: 'order-1',
          order_number: 'RD-1',
          payment_status: 'authorized',
          payment_intent_id: 'pi_1',
          total: 27.5,
          engine_status: 'submitted',
          status: 'submitted',
        },
      }),
    );

    const res = await GET(new Request('http://localhost/api/orders/order-1/payment-status'), params);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual({
      orderId: 'order-1',
      orderNumber: 'RD-1',
      paymentStatus: 'authorized',
      paymentIntentId: 'pi_1',
      total: 27.5,
      currency: 'cad',
      engineStatus: 'submitted',
      status: 'submitted',
    });
  });
});
