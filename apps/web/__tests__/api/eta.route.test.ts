/**
 * @jest-environment node
 */

import type { PreOrderEta } from '@ridendine/routing';

const mockEstimatePreOrder = jest.fn<Promise<PreOrderEta>, [string, string]>();
const mockGetCustomerActorContext = jest.fn();
const mockAddressMaybeSingle = jest.fn();

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
  createAdminClient: jest.fn(() => ({
    from: (table: string) => {
      if (table === 'customer_addresses') {
        const chain = {
          select: () => chain,
          eq: () => chain,
          maybeSingle: () => mockAddressMaybeSingle(),
        };
        return chain;
      }
      return {};
    },
  })),
}));

jest.mock('@ridendine/routing', () => ({
  OsrmProvider: jest.fn(() => ({})),
  EtaService: jest.fn(() => ({
    estimatePreOrder: mockEstimatePreOrder,
  })),
}));

jest.mock('@/lib/engine', () => ({
  getCustomerActorContext: () => mockGetCustomerActorContext(),
}));

describe('GET /api/eta', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGetCustomerActorContext.mockResolvedValue({
      customerId: 'cust-1',
      actor: { userId: 'user-1', role: 'customer', entityId: 'cust-1' },
    });
    mockAddressMaybeSingle.mockResolvedValue({ data: { id: 'addr1' }, error: null });
  });

  it('returns 400 when storefrontId is missing', async () => {
    const { GET } = await import('../../src/app/api/eta/route');
    const req = new Request('http://localhost/api/eta?addressId=addr1');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('returns 400 when addressId is missing', async () => {
    const { GET } = await import('../../src/app/api/eta/route');
    const req = new Request('http://localhost/api/eta?storefrontId=sf1');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('returns 401 when there is no authenticated customer session', async () => {
    mockGetCustomerActorContext.mockResolvedValue(null);

    const { GET } = await import('../../src/app/api/eta/route');
    const req = new Request('http://localhost/api/eta?storefrontId=sf1&addressId=addr1');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBeDefined();
    expect(mockEstimatePreOrder).not.toHaveBeenCalled();
  });

  it('returns 404 when the address does not belong to the caller', async () => {
    mockAddressMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { GET } = await import('../../src/app/api/eta/route');
    const req = new Request('http://localhost/api/eta?storefrontId=sf1&addressId=someone-elses');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBeDefined();
    expect(mockEstimatePreOrder).not.toHaveBeenCalled();
  });

  it('returns ETA data when both params are provided', async () => {
    mockEstimatePreOrder.mockResolvedValue({
      minMinutes: 25,
      maxMinutes: 35,
      prepTime: 20,
      driveTime: 10,
    });

    const { GET } = await import('../../src/app/api/eta/route');
    const req = new Request('http://localhost/api/eta?storefrontId=sf1&addressId=addr1');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.minMinutes).toBe(25);
    expect(body.maxMinutes).toBe(35);
    expect(body.prepTime).toBe(20);
    expect(body.driveTime).toBe(10);
  });

  it('returns fallback ETA when service throws', async () => {
    mockEstimatePreOrder.mockRejectedValue(new Error('Routing unavailable'));

    const { GET } = await import('../../src/app/api/eta/route');
    const req = new Request('http://localhost/api/eta?storefrontId=sf1&addressId=addr1');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.minMinutes).toBe(30);
    expect(body.maxMinutes).toBe(45);
  });
});
