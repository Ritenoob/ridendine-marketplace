/**
 * @jest-environment node
 */

import { POST } from '../route';

const mockEvaluateRateLimit = jest.fn();
const mockIsAuthorizedPartner = jest.fn();
const mockMaterialize = jest.fn();
const mockRunCheckout = jest.fn();
const mockGetSystemActor = jest.fn();

jest.mock('@ridendine/db', () => ({
  createAdminClient: () => ({ __admin: true }),
}));

jest.mock('@ridendine/utils', () => ({
  RATE_LIMIT_POLICIES: { partnerCheckout: { name: 'partner_checkout' } },
  evaluateRateLimit: (...args: unknown[]) => mockEvaluateRateLimit(...args),
  rateLimitPolicyResponse: () =>
    Response.json({ success: false, code: 'RATE_LIMITED' }, { status: 429 }),
}));

jest.mock('@/lib/engine', () => ({
  getSystemActor: () => mockGetSystemActor(),
  errorResponse: (code: string, message: string, status = 400) =>
    Response.json({ success: false, code, error: message }, { status }),
  successResponse: (data: unknown, status = 200) =>
    Response.json({ success: true, data }, { status }),
}));

jest.mock('@/lib/partner/auth', () => ({
  isAuthorizedPartner: (...args: unknown[]) => mockIsAuthorizedPartner(...args),
}));

// Define the error class INSIDE the factory: jest.mock is hoisted above
// top-level declarations, so an outer `class` would be in the TDZ here.
jest.mock('@/lib/partner/materialize', () => {
  class MaterializeError extends Error {
    code: string;
    publicMessage: string;
    status: number;
    constructor(code: string, publicMessage: string, status = 400) {
      super(publicMessage);
      this.code = code;
      this.publicMessage = publicMessage;
      this.status = status;
    }
  }
  return {
    materializePartnerOrder: (...args: unknown[]) => mockMaterialize(...args),
    MaterializeError,
  };
});

// Pull the mocked class back out for use in test bodies.
const { MaterializeError } = jest.requireMock('@/lib/partner/materialize') as {
  MaterializeError: new (code: string, message: string, status?: number) => Error;
};

jest.mock('@/lib/checkout/run-checkout', () => ({
  runCheckout: (...args: unknown[]) => mockRunCheckout(...args),
}));

const VALID_BODY = {
  storefrontId: '11111111-1111-1111-1111-111111111111',
  customer: { email: 'guest@coop.test', firstName: 'Guest' },
  deliveryAddress: {
    addressLine1: '1 King St',
    city: 'Hamilton',
    state: 'ON',
    postalCode: 'L8P1A1',
  },
  items: [{ menuItemId: '22222222-2222-2222-2222-222222222222', quantity: 2 }],
  tip: 2,
};

function buildRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/partner/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/partner/checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvaluateRateLimit.mockResolvedValue({ allowed: true, remaining: 59, policy: 'partner_checkout' });
    mockIsAuthorizedPartner.mockReturnValue(true);
    mockGetSystemActor.mockReturnValue({ userId: 'system', role: 'system' });
    mockMaterialize.mockResolvedValue({
      customerId: 'cust-guest',
      deliveryAddressId: 'addr-1',
      cartId: 'cart-1',
    });
    mockRunCheckout.mockResolvedValue(
      Response.json(
        { success: true, data: { orderId: 'order-1', clientSecret: 'cs_partner', total: 19.21 } },
        { status: 200 }
      )
    );
  });

  it('returns 429 when rate limited', async () => {
    mockEvaluateRateLimit.mockResolvedValue({ allowed: false });
    const res = await POST(buildRequest(VALID_BODY, { 'x-api-key': 'k' }));
    expect(res.status).toBe(429);
    expect(mockMaterialize).not.toHaveBeenCalled();
  });

  it('rejects requests without a valid partner key', async () => {
    mockIsAuthorizedPartner.mockReturnValue(false);
    const res = await POST(buildRequest(VALID_BODY));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
    expect(mockMaterialize).not.toHaveBeenCalled();
    expect(mockRunCheckout).not.toHaveBeenCalled();
  });

  it('rejects an invalid body before materializing', async () => {
    const res = await POST(buildRequest({ storefrontId: 'not-a-uuid' }, { 'x-api-key': 'k' }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(mockMaterialize).not.toHaveBeenCalled();
  });

  it('surfaces MaterializeError codes/status', async () => {
    mockMaterialize.mockRejectedValue(new MaterializeError('INVALID_ITEMS', 'Menu item(s) not found: x', 400));
    const res = await POST(buildRequest(VALID_BODY, { 'x-api-key': 'k' }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.code).toBe('INVALID_ITEMS');
    expect(mockRunCheckout).not.toHaveBeenCalled();
  });

  it('materializes then runs checkout as the system actor with the external order id idempotency key', async () => {
    const res = await POST(buildRequest(VALID_BODY, { 'x-api-key': 'k', 'Idempotency-Key': 'ext-order-99' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.orderId).toBe('order-1');
    expect(body.data.clientSecret).toBe('cs_partner');

    expect(mockMaterialize).toHaveBeenCalledTimes(1);
    const materializeArg = mockMaterialize.mock.calls[0][1];
    expect(materializeArg).toMatchObject({
      storefrontId: VALID_BODY.storefrontId,
      customer: { email: 'guest@coop.test' },
      items: VALID_BODY.items,
    });

    expect(mockRunCheckout).toHaveBeenCalledTimes(1);
    const runArg = mockRunCheckout.mock.calls[0][0];
    expect(runArg.actor).toEqual({ userId: 'system', role: 'system' });
    expect(runArg.customerId).toBe('cust-guest');
    expect(runArg.input.deliveryAddressId).toBe('addr-1');
    expect(runArg.input.storefrontId).toBe(VALID_BODY.storefrontId);
    expect(runArg.input.tip).toBe(2);
    // The external order id rides on the request's Idempotency-Key header.
    expect(runArg.request.headers.get('Idempotency-Key')).toBe('ext-order-99');
  });
});
