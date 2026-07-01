/**
 * @jest-environment node
 */

const mockCreateAdminClient = jest.fn();
const mockGetCustomerActorContext = jest.fn();

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
