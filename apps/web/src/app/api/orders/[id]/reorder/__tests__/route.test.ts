/**
 * @jest-environment node
 */

const mockCreateAdminClient = jest.fn();
const mockGetCustomerActorContext = jest.fn();
const mockGetCartByCustomer = jest.fn();
const mockCreateCart = jest.fn();
const mockAddCartItem = jest.fn();

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
  getCartByCustomer: (...args: unknown[]) => mockGetCartByCustomer(...args),
  createCart: (...args: unknown[]) => mockCreateCart(...args),
  addCartItem: (...args: unknown[]) => mockAddCartItem(...args),
}));

jest.mock('@/lib/engine', () => ({
  getCustomerActorContext: () => mockGetCustomerActorContext(),
  successResponse: (data: unknown, status = 200) =>
    Response.json({ success: true, data }, { status }),
  errorResponse: (code: string, message: string, status = 400) =>
    Response.json({ success: false, code, error: message }, { status }),
}));

import { POST } from '../route';

type OrderRow = {
  id: string;
  storefront_id: string;
  customer_id: string;
  items: Array<{ menu_item_id: string; quantity: number; special_instructions?: string }>;
};

type MenuRow = {
  id: string;
  price: number;
  is_available: boolean;
  is_sold_out: boolean;
  storefront_id: string;
};

function buildClient(opts: {
  order: OrderRow | null;
  menuItems?: MenuRow[];
  capturedFilters?: Record<string, string>;
}) {
  const filters = opts.capturedFilters ?? {};
  return {
    from(table: string) {
      if (table === 'orders') {
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
      }
      if (table === 'menu_items') {
        return {
          select: () => ({
            in: async () => ({ data: opts.menuItems ?? [], error: null }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
    },
  };
}

const params = { params: Promise.resolve({ id: 'order-1' }) };

describe('POST /api/orders/[id]/reorder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCustomerActorContext.mockResolvedValue({
      customerId: 'cust-1',
      actor: { userId: 'user-1', role: 'customer' },
    });
    mockGetCartByCustomer.mockResolvedValue(null);
    mockCreateCart.mockResolvedValue({ id: 'cart-new' });
    mockAddCartItem.mockResolvedValue({ id: 'item-1' });
  });

  it('rejects unauthenticated callers with 401', async () => {
    mockGetCustomerActorContext.mockResolvedValueOnce(null);
    const res = await POST(new Request('http://localhost/api/orders/order-1/reorder', { method: 'POST' }), params);
    expect(res.status).toBe(401);
  });

  it('scopes the order lookup to the calling customer (ownership)', async () => {
    const filters: Record<string, string> = {};
    mockCreateAdminClient.mockReturnValue(buildClient({ order: null, capturedFilters: filters }));

    const res = await POST(new Request('http://localhost/api/orders/order-1/reorder', { method: 'POST' }), params);
    expect(res.status).toBe(404);
    expect(filters).toMatchObject({ id: 'order-1', customer_id: 'cust-1' });
    expect(mockAddCartItem).not.toHaveBeenCalled();
  });

  it('rejects with MENU_ITEM_UNAVAILABLE when an item is sold out', async () => {
    mockCreateAdminClient.mockReturnValue(
      buildClient({
        order: {
          id: 'order-1',
          storefront_id: 'sf-1',
          customer_id: 'cust-1',
          items: [{ menu_item_id: 'menu-1', quantity: 2 }],
        },
        menuItems: [
          { id: 'menu-1', price: 10, is_available: true, is_sold_out: true, storefront_id: 'sf-1' },
        ],
      }),
    );

    const res = await POST(new Request('http://localhost/api/orders/order-1/reorder', { method: 'POST' }), params);
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.code).toBe('MENU_ITEM_UNAVAILABLE');
    expect(mockAddCartItem).not.toHaveBeenCalled();
  });

  it('creates the cart and re-adds available items with current database prices', async () => {
    mockCreateAdminClient.mockReturnValue(
      buildClient({
        order: {
          id: 'order-1',
          storefront_id: 'sf-1',
          customer_id: 'cust-1',
          items: [{ menu_item_id: 'menu-1', quantity: 2, special_instructions: 'no onions' }],
        },
        menuItems: [
          { id: 'menu-1', price: 12.5, is_available: true, is_sold_out: false, storefront_id: 'sf-1' },
        ],
      }),
    );

    const res = await POST(new Request('http://localhost/api/orders/order-1/reorder', { method: 'POST' }), params);
    expect(res.status).toBe(201);
    expect(mockCreateCart).toHaveBeenCalledWith(expect.anything(), {
      customer_id: 'cust-1',
      storefront_id: 'sf-1',
    });
    expect(mockAddCartItem).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        cart_id: 'cart-new',
        menu_item_id: 'menu-1',
        quantity: 2,
        unit_price: 12.5,
        special_instructions: 'no onions',
      }),
    );
  });
});
