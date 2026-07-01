/**
 * @jest-environment node
 */

import { POST } from '../route';

const mockBuildCheckoutQuote = jest.fn();
const mockCreateAdminClient = jest.fn();
const mockGetCustomerActorContext = jest.fn();
const mockEvaluateRateLimit = jest.fn();

jest.mock('@/lib/checkout/quote', () => ({
  buildCheckoutQuote: (...args: unknown[]) => mockBuildCheckoutQuote(...args),
}));

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
  createAdminClient: () => mockCreateAdminClient(),
}));

jest.mock('@/lib/engine', () => ({
  getCustomerActorContext: () => mockGetCustomerActorContext(),
  errorResponse: (code: string, message: string, status = 400) =>
    Response.json({ success: false, code, error: message }, { status }),
  successResponse: (data: unknown, status = 200) =>
    Response.json({ success: true, data }, { status }),
}));

jest.mock('@ridendine/utils', () => ({
  RATE_LIMIT_POLICIES: { checkout: { name: 'checkout' } },
  evaluateRateLimit: (...args: unknown[]) => mockEvaluateRateLimit(...args),
  rateLimitPolicyResponse: () =>
    Response.json({ success: false, code: 'RATE_LIMITED' }, { status: 429 }),
}));

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/checkout/quote', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/checkout/quote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvaluateRateLimit.mockResolvedValue({ allowed: true, remaining: 2, policy: 'checkout' });
    mockGetCustomerActorContext.mockResolvedValue({
      customerId: 'cust-1',
      actor: { userId: 'user-1', role: 'customer', entityId: 'cust-1' },
    });
    mockCreateAdminClient.mockReturnValue({ id: 'admin-client' });
    mockBuildCheckoutQuote.mockResolvedValue({
      ok: true,
      value: {
        quote: {
          subtotal: 24,
          deliveryFee: 5,
          serviceFee: 1.92,
          tax: 4.02,
          tip: 3,
          discount: 0,
          total: 37.94,
        },
        promoCodeId: null,
        deliveryDistanceKm: 1.2,
        deliverySurgeMultiplier: 1,
        cart: { id: 'cart-1', cart_items: [] },
        menuIds: ['menu-1'],
        items: [],
      },
    });
  });

  it('returns the canonical server quote without creating an order or payment intent', async () => {
    const res = await POST(
      buildRequest({
        storefrontId: '11111111-1111-1111-1111-111111111111',
        deliveryAddressId: '22222222-2222-2222-2222-222222222222',
        tip: 3,
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        currency: 'cad',
        breakdown: {
          subtotal: 24,
          deliveryFee: 5,
          serviceFee: 1.92,
          tax: 4.02,
          tip: 3,
          discount: 0,
          total: 37.94,
          deliveryDistanceKm: 1.2,
          surgeMultiplier: 1,
          surgeActive: false,
        },
      },
    });
    expect(mockBuildCheckoutQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
        storefrontId: '11111111-1111-1111-1111-111111111111',
        deliveryAddressId: '22222222-2222-2222-2222-222222222222',
        tip: 3,
      })
    );
  });

  it('returns a clear address ownership error from the quote service', async () => {
    mockBuildCheckoutQuote.mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'ADDRESS_NOT_FOUND',
        message: 'Delivery address was not found for this customer',
        status: 400,
      },
    });

    const res = await POST(
      buildRequest({
        storefrontId: '11111111-1111-1111-1111-111111111111',
        deliveryAddressId: '33333333-3333-3333-3333-333333333333',
      })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe('ADDRESS_NOT_FOUND');
  });

  it('surfaces VALIDATION_ERROR when client totals are stale or items unavailable', async () => {
    mockBuildCheckoutQuote.mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Client totals mismatch server quote',
        status: 400,
      },
    });

    const res = await POST(
      buildRequest({
        storefrontId: '11111111-1111-1111-1111-111111111111',
        deliveryAddressId: '22222222-2222-2222-2222-222222222222',
        clientTotal: 1,
      })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.error).toBe('Client totals mismatch server quote');
  });
});
