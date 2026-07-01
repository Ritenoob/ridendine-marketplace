/**
 * @jest-environment node
 */

const mockLimit = jest.fn();
const mockSelect = jest.fn(() => ({ limit: mockLimit }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));
const mockCreateAdminClient = jest.fn(() => ({ from: mockFrom }));

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
  createAdminClient: mockCreateAdminClient,
}));

describe('GET /api/health', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
    mockLimit.mockResolvedValue({ data: [{ id: '1' }], error: null });
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('reports degraded readiness when distributed rate limit provider is missing in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.STRIPE_SECRET_KEY = 'sk_live_secret_should_not_leak';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_should_not_leak';
    process.env.HEALTH_CHECK_TOKEN = 'test-health-token';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { GET } = await import('../../src/app/api/health/route');
    const response = await GET(
      new Request('https://web.ridendine.ca/api/health', {
        headers: { 'x-health-token': 'test-health-token' },
      })
    );
    const payload = await response.json();
    const payloadString = JSON.stringify(payload);

    expect(response.status).toBe(200);
    expect(payload.data.readiness).toBe('degraded');
    expect(payload.data.checks.rateLimit).toBe('degraded');
    expect(payload.data.details.rateLimitProvider).toBe('memory');
    expect(payloadString).not.toContain('sk_live_secret_should_not_leak');
    expect(payloadString).not.toContain('whsec_should_not_leak');
  });
});
