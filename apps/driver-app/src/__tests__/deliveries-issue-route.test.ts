/**
 * @jest-environment node
 */
import { POST } from '../app/api/deliveries/[id]/issue/route';

const mockGetDriverActorContext = jest.fn();
const mockVerifyDriverOwnsDelivery = jest.fn();
const mockCreateAdminClient = jest.fn();

jest.mock('@ridendine/db', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

jest.mock('@/lib/engine', () => ({
  getDriverActorContext: () => mockGetDriverActorContext(),
  verifyDriverOwnsDelivery: (...args: unknown[]) => mockVerifyDriverOwnsDelivery(...args),
  errorResponse: (code: string, message: string, status = 400) =>
    Response.json({ success: false, code, error: message }, { status }),
  successResponse: (data: unknown, status = 200) =>
    Response.json({ success: true, data }, { status }),
}));

type StubInsert = {
  table?: string;
  payload?: Record<string, unknown>;
};

function buildAdminClientMock(opts: { delivery: { id: string; order_id: string } | null }) {
  const inserted: StubInsert = {};
  return {
    __inserted: inserted,
    from(table: string) {
      if (table === 'deliveries') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: opts.delivery, error: null }),
            }),
          }),
        };
      }
      if (table === 'order_exceptions') {
        return {
          insert: (payload: Record<string, unknown>) => {
            inserted.table = table;
            inserted.payload = payload;
            return {
              select: () => ({
                single: async () => ({ data: { id: 'exc-1', ...payload }, error: null }),
              }),
            };
          },
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    },
  };
}

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/deliveries/del-1/issue', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: 'del-1' }) };

describe('POST /api/deliveries/[id]/issue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDriverActorContext.mockResolvedValue({
      driverId: 'driver-self',
      actor: { userId: 'u1', role: 'driver', entityId: 'driver-self' },
    });
    mockVerifyDriverOwnsDelivery.mockResolvedValue(true);
  });

  it('rejects drivers who do not own the delivery with 403', async () => {
    mockVerifyDriverOwnsDelivery.mockResolvedValueOnce(false);
    mockCreateAdminClient.mockReturnValue(buildAdminClientMock({ delivery: { id: 'del-1', order_id: 'ord-1' } }));

    const res = await POST(
      buildRequest({ issueType: 'customer_unavailable', notes: 'No answer at door' }) as never,
      params,
    );
    expect(res.status).toBe(403);
  });

  it('inserts an order_exception with driver context for valid issues', async () => {
    const admin = buildAdminClientMock({ delivery: { id: 'del-1', order_id: 'ord-1' } });
    mockCreateAdminClient.mockReturnValue(admin);

    const res = await POST(
      buildRequest({ issueType: 'damaged_package', notes: 'Box crushed during transit' }) as never,
      params,
    );

    expect(res.status).toBe(201);
    expect(admin.__inserted.payload).toMatchObject({
      exception_type: 'delivery_damaged_package',
      delivery_id: 'del-1',
      order_id: 'ord-1',
      driver_id: 'driver-self',
      title: 'Driver reported: Damaged package',
      description: 'Box crushed during transit',
    });
  });

  it('returns 404 when the delivery row cannot be found', async () => {
    mockCreateAdminClient.mockReturnValue(buildAdminClientMock({ delivery: null }));

    const res = await POST(
      buildRequest({ issueType: 'unsafe_route', notes: 'Road closed' }) as never,
      params,
    );
    expect(res.status).toBe(404);
  });
});
