/**
 * @jest-environment node
 */

import { POST } from '../route';

const mockEvaluateRateLimit = jest.fn();
const mockResolvePartner = jest.fn();
const mockMaterialize = jest.fn();
const mockRunCheckout = jest.fn();
const mockGetSystemActor = jest.fn();

jest.mock('@ridendine/db', () => ({
  ordersTable: jest.fn((client) => client.from('orders')),
  orderItemsTable: jest.fn((client) => client.from('order_items')),
  orderStatusHistoryTable: jest.fn((client) => client.from('order_status_history')),
  checkoutIdempotencyKeysTable: jest.fn((client) => client.from('checkout_idempotency_keys')),
  menuItemsTable: jest.fn((client) => client.from('menu_items')),
  menuItemOptionsTable: jest.fn((client) => client.from('menu_item_options')),
  menuItemOptionValuesTable: jest.fn((client) => client.from('menu_item_option_values')),
  chefStorefrontsTable: jest.fn((client) => client.from('chef_storefronts')),
  chefKitchensTable: jest.fn((client) => client.from('chef_kitchens')),
  chefAvailabilityTable: jest.fn((client) => client.from('chef_availability')),
  chefProfilesTable: jest.fn((client) => client.from('chef_profiles')),
  customersTable: jest.fn((client) => client.from('customers')),
  customerAddressesTable: jest.fn((client) => client.from('customer_addresses')),
  favoritesTable: jest.fn((client) => client.from('favorites')),
  loyaltyTransactionsTable: jest.fn((client) => client.from('loyalty_transactions')),
  cartItemsTable: jest.fn((client) => client.from('cart_items')),
  chefPayoutAccountsTable: jest.fn((client) => client.from('chef_payout_accounts')),
  chefPayoutsTable: jest.fn((client) => client.from('chef_payouts')),
  notificationsTable: jest.fn((client) => client.from('notifications')),
  pushSubscriptionsTable: jest.fn((client) => client.from('push_subscriptions')),
  reviewsTable: jest.fn((client) => client.from('reviews')),
  promoCodesTable: jest.fn((client) => client.from('promo_codes')),
  serviceAreasTable: jest.fn((client) => client.from('service_areas')),
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
  resolvePartnerContext: (...args: unknown[]) => mockResolvePartner(...args),
  partnerHasScope: (ctx: { scopes: string[] }, scope: string) => ctx.scopes.includes(scope),
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
    mockResolvePartner.mockResolvedValue({
      partnerId: 'p1', partnerName: 'Hoang Gia Pho', testMode: false, scopes: ['quote', 'checkout'], keyId: 'k1', rateLimitPerMin: 120,
    });
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

  it('returns 429 when the per-partner rate limit is exceeded', async () => {
    // Pre-auth IP limit passes; the per-partner limit (2nd call) denies.
    mockEvaluateRateLimit
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: false });
    const res = await POST(buildRequest(VALID_BODY, { 'x-api-key': 'k' }));
    expect(res.status).toBe(429);
    expect(mockMaterialize).not.toHaveBeenCalled();
    expect(mockRunCheckout).not.toHaveBeenCalled();
  });

  it('rejects requests without a valid partner key', async () => {
    mockResolvePartner.mockResolvedValue(null);
    const res = await POST(buildRequest(VALID_BODY));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
    expect(mockMaterialize).not.toHaveBeenCalled();
    expect(mockRunCheckout).not.toHaveBeenCalled();
  });

  it('rejects a key without the checkout scope (403)', async () => {
    mockResolvePartner.mockResolvedValue({
      partnerId: 'p1', partnerName: 'X', testMode: false, scopes: ['quote'], keyId: 'k1',
    });
    const res = await POST(buildRequest(VALID_BODY, { 'x-api-key': 'k' }));
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN_SCOPE');
    expect(mockMaterialize).not.toHaveBeenCalled();
    expect(mockRunCheckout).not.toHaveBeenCalled();
  });

  it('passes partnerId and test_mode through to runCheckout', async () => {
    mockResolvePartner.mockResolvedValue({
      partnerId: 'p-sandbox', partnerName: 'Sandbox', testMode: true, scopes: ['quote', 'checkout'], keyId: 'k9',
    });
    await POST(buildRequest(VALID_BODY, { 'x-api-key': 'k' }));
    const runArg = mockRunCheckout.mock.calls[0][0];
    expect(runArg.partnerId).toBe('p-sandbox');
    expect(runArg.isTest).toBe(true);
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
    expect(runArg.partnerId).toBe('p1');
    expect(runArg.isTest).toBe(false);
    // The external order id rides on the request's Idempotency-Key header.
    expect(runArg.request.headers.get('Idempotency-Key')).toBe('ext-order-99');
  });
});
