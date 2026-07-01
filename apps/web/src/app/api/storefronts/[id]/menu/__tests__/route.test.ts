/**
 * @jest-environment node
 */

const mockCreateAdminClient = jest.fn();
const mockGetStorefrontMenu = jest.fn();

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
  getStorefrontMenu: (...args: unknown[]) => mockGetStorefrontMenu(...args),
}));

jest.mock('@/lib/engine', () => ({
  successResponse: (data: unknown, status = 200) =>
    Response.json({ success: true, data }, { status }),
  errorResponse: (code: string, message: string, status = 400) =>
    Response.json({ success: false, code, error: message }, { status }),
}));

import { GET } from '../route';

function buildClient(opts: {
  storefrontExists: boolean;
  optionsRows?: Array<Record<string, unknown>>;
  menuItemRows?: Array<{ id: string }>;
}) {
  return {
    from(table: string) {
      if (table === 'chef_storefronts') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: opts.storefrontExists ? { id: 'sf-1' } : null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'menu_items') {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({ data: opts.menuItemRows ?? [] }),
            }),
          }),
        };
      }
      if (table === 'menu_item_options') {
        return {
          select: () => ({
            in: async () => ({ data: opts.optionsRows ?? [] }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
    },
  };
}

describe('GET /api/storefronts/[id]/menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when the storefront is inactive or missing', async () => {
    mockCreateAdminClient.mockReturnValue(buildClient({ storefrontExists: false }));
    const params = { params: Promise.resolve({ id: 'sf-1' }) };
    const res = await GET(new Request('http://localhost/api/storefronts/sf-1/menu'), params);
    expect(res.status).toBe(404);
  });

  it('groups options under each menu item and propagates soldOut', async () => {
    mockCreateAdminClient.mockReturnValue(
      buildClient({
        storefrontExists: true,
        menuItemRows: [{ id: 'menu-1' }],
        optionsRows: [
          {
            id: 'opt-1',
            menu_item_id: 'menu-1',
            name: 'Spice',
            menu_item_option_values: [{ id: 'v-1', name: 'Hot', price_adjustment: 2 }],
          },
        ],
      }),
    );
    mockGetStorefrontMenu.mockResolvedValue([
      {
        id: 'cat-1',
        name: 'Mains',
        items: [{ id: 'menu-1', name: 'Pad Thai', is_sold_out: true }],
      },
    ]);

    const params = { params: Promise.resolve({ id: 'sf-1' }) };
    const res = await GET(new Request('http://localhost/api/storefronts/sf-1/menu'), params);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.categories[0].items[0]).toEqual(
      expect.objectContaining({
        id: 'menu-1',
        soldOut: true,
        options: expect.arrayContaining([
          expect.objectContaining({ id: 'opt-1', name: 'Spice' }),
        ]),
      }),
    );
    expect(mockGetStorefrontMenu).toHaveBeenCalledWith(
      expect.any(Object),
      'sf-1',
      expect.objectContaining({ includeUnavailable: false }),
    );
  });
});
