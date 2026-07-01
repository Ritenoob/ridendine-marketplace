/**
 * @jest-environment node
 *
 * Focused on the Task 4 additions: `tickets` + `storefrontId` in the response
 * and a single batched customer query. Pure-function coverage lives in kitchen.test.ts.
 */

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { 'content-type': 'application/json' },
      }),
  },
}));

// ---- Supabase admin client mock ----

const mockCustomersIn = jest.fn().mockResolvedValue({ data: [
  { id: 'c-1', first_name: 'Amy', last_name: 'Chen' },
], error: null });

const mockCustomersSelect = jest.fn(() => ({ in: mockCustomersIn }));

// Each from() call returns a builder whose final method resolves to { data, error }.
// We need to distinguish which table is being queried.
const mockFrom = jest.fn((table: string) => {
  if (table === 'customers') {
    return { select: mockCustomersSelect };
  }
  if (table === 'chef_storefronts') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: { is_paused: false, is_active: true, max_queue_size: 10, average_prep_minutes: 20 },
            error: null,
          }),
        })),
      })),
    };
  }
  if (table === 'menu_items') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    };
  }
  // 'orders' queries (active + historical)
  return {
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        in: jest.fn(() => ({
          gte: jest.fn().mockResolvedValue({ data: [], error: null }),
          // Active orders query (no .gte)
          then: undefined,
          // Make it a thenable for the active query (no .gte call)
        })),
        // When there is no .in chained (shouldn't happen, but safety)
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
  };
});

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
    from: mockFrom,
  })),
}));

jest.mock('@/lib/engine', () => ({
  getChefActorContext: jest.fn().mockResolvedValue({
    storefrontId: 'sf-1',
    chefId: 'chef-1',
    userId: 'user-1',
    actor: { userId: 'user-1', role: 'chef_user', entityId: 'chef-1' },
  }),
  errorResponse: jest.fn(
    (code: string, msg: string, status = 400) =>
      new Response(JSON.stringify({ error: msg }), { status })
  ),
  successResponse: jest.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), { status: 200 })
  ),
}));

// Must import AFTER all jest.mock() calls
import { createAdminClient } from '@ridendine/db';
import { errorResponse, getChefActorContext, successResponse } from '@/lib/engine';
import { GET } from '../route';

describe('GET /api/kitchen/overview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-wire mockFrom after clearAllMocks resets call counts but keeps impl
    jest.mocked(createAdminClient).mockReturnValue({
      from: (table: string) => {
        if (table === 'customers') {
          return { select: jest.fn(() => ({ in: jest.fn().mockResolvedValue({ data: [], error: null }) })) };
        }
        if (table === 'chef_storefronts') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { is_paused: false, is_active: true, max_queue_size: 10, average_prep_minutes: 20 },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'menu_items') {
          return { select: jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) })) };
        }
        // orders: needs to be awaitable AND have .gte
        const inResult = Object.assign(
          Promise.resolve({ data: [], error: null }),
          { gte: jest.fn().mockResolvedValue({ data: [], error: null }) }
        );
        // Active query chains eq().neq('is_test').in(); historical chains
        // eq().in().gte(). Support both off the same eq() builder.
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              neq: jest.fn(() => ({ in: jest.fn(() => inResult) })),
              in: jest.fn(() => inResult),
            })),
          })),
        };
      },
    });
    jest.mocked(getChefActorContext).mockResolvedValue({
      storefrontId: 'sf-1',
      chefId: 'chef-1',
      userId: 'user-1',
    });
    jest.mocked(successResponse).mockImplementation(
      (data: unknown) =>
        new Response(JSON.stringify({ success: true, data }), { status: 200 })
    );
    jest.mocked(errorResponse).mockImplementation(
      (code: string, msg: string, status = 400) =>
        new Response(JSON.stringify({ error: msg }), { status })
    );
  });

  it('includes tickets array and storefrontId in the response payload', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    const data = body.data ?? body;
    // Existing fields unchanged
    expect(data).toHaveProperty('load');
    expect(data).toHaveProperty('prepPlan');
    expect(data).toHaveProperty('prepBoard');
    expect(data).toHaveProperty('service');
    // New additive fields
    expect(data).toHaveProperty('tickets');
    expect(Array.isArray(data.tickets)).toBe(true);
    expect(data).toHaveProperty('storefrontId', 'sf-1');
  });

  it('returns 401 when chef context is missing', async () => {
    jest.mocked(getChefActorContext).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
