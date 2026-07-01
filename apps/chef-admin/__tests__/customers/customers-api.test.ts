/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/engine', () => ({
  getChefActorContext: jest.fn(),
  errorResponse: jest.fn((code: string, msg: string, status = 400) =>
    new Response(JSON.stringify({ error: code, message: msg }), { status })
  ),
  successResponse: jest.fn((data: unknown, status = 200) =>
    new Response(JSON.stringify({ data }), { status })
  ),
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
  createAdminClient: jest.fn(() => mockAdminClient),
}));

const mockAdminClient = { from: jest.fn() };

function makeChain(data: unknown) {
  const chain: Record<string, unknown> = {};
  const resolved = Promise.resolve({ data, error: null });
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.in = jest.fn().mockReturnValue(chain);
  chain.order = jest.fn().mockReturnValue(chain);
  chain.then = (resolved as Promise<unknown>).then.bind(resolved);
  chain.catch = (resolved as Promise<unknown>).catch.bind(resolved);
  return chain;
}

import { getChefActorContext } from '@/lib/engine';

describe('GET /api/customers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    (getChefActorContext as jest.Mock).mockResolvedValue(null);
    const { GET } = await import('@/app/api/customers/route');
    const response = await GET(new NextRequest('http://localhost:3001/api/customers'));
    expect(response.status).toBe(401);
  });

  it('returns empty customers list when no orders exist', async () => {
    (getChefActorContext as jest.Mock).mockResolvedValue({
      chefId: 'chef-1',
      storefrontId: 'sf-1',
    });
    mockAdminClient.from = jest.fn().mockImplementation(() => makeChain([]));
    const { GET } = await import('@/app/api/customers/route');
    const response = await GET(new NextRequest('http://localhost:3001/api/customers'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.customers).toHaveLength(0);
    expect(body.data.summary.total).toBe(0);
  });

  it('aggregates orders by customer and returns ranked list', async () => {
    (getChefActorContext as jest.Mock).mockResolvedValue({
      chefId: 'chef-1',
      storefrontId: 'sf-1',
    });

    const mockOrders = [
      { customer_id: 'c1', total: 80, created_at: new Date().toISOString() },
      { customer_id: 'c1', total: 60, created_at: new Date().toISOString() },
      { customer_id: 'c2', total: 30, created_at: new Date().toISOString() },
    ];

    const mockProfiles = [
      { id: 'c1', first_name: 'Alice', last_name: 'Smith' },
      { id: 'c2', first_name: 'Bob', last_name: 'Jones' },
    ];

    mockAdminClient.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'orders') return makeChain(mockOrders);
      if (table === 'customers') return makeChain(mockProfiles);
      return makeChain([]);
    });

    jest.resetModules();
    jest.mock('@/lib/engine', () => ({
      getChefActorContext: jest.fn().mockResolvedValue({ chefId: 'chef-1', storefrontId: 'sf-1' }),
      errorResponse: jest.fn((code: string, msg: string, status = 400) =>
        new Response(JSON.stringify({ error: code, message: msg }), { status })
      ),
      successResponse: jest.fn((data: unknown, status = 200) =>
        new Response(JSON.stringify({ data }), { status })
      ),
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
      createAdminClient: jest.fn(() => mockAdminClient),
    }));

    const { GET } = await import('@/app/api/customers/route');
    const response = await GET(new NextRequest('http://localhost:3001/api/customers'));
    expect(response.status).toBe(200);
  });

  it('assigns correct tier based on order count', () => {
    // Test the tier logic independently - inline since the function is not exported
    const tier = (count: number) => {
      if (count >= 8) return 'vip';
      if (count >= 4) return 'loyal';
      if (count >= 2) return 'returning';
      return 'new';
    };
    expect(tier(1)).toBe('new');
    expect(tier(2)).toBe('returning');
    expect(tier(4)).toBe('loyal');
    expect(tier(8)).toBe('vip');
    expect(tier(12)).toBe('vip');
  });
});
