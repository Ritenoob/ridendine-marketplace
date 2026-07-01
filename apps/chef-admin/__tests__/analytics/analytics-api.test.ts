/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

// Mock the engine module
jest.mock('@/lib/engine', () => ({
  getChefActorContext: jest.fn(),
  errorResponse: jest.fn((code: string, msg: string, status = 400) =>
    new Response(JSON.stringify({ error: code, message: msg }), { status })
  ),
  successResponse: jest.fn((data: unknown, status = 200) =>
    new Response(JSON.stringify({ data }), { status })
  ),
}));

// Mock createAdminClient
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

const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockGte = jest.fn();
const mockLte = jest.fn();
const mockIn = jest.fn();
const mockSingle = jest.fn();

const mockAdminClient = {
  from: mockFrom,
};

// Chain helpers
const chainWith = (result: unknown) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue(result),
  then: undefined,
});

const chainWithData = (data: unknown) => {
  const chain: Record<string, jest.Mock> = {};
  const resolved = Promise.resolve({ data, error: null });
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.gte = jest.fn().mockReturnValue(chain);
  chain.lte = jest.fn().mockReturnValue(chain);
  chain.in = jest.fn().mockReturnValue(chain);
  chain.single = jest.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error: null });
  // Make the chain itself thenable
  chain.then = resolved.then.bind(resolved);
  chain.catch = resolved.catch.bind(resolved);
  return chain;
};

import { getChefActorContext } from '@/lib/engine';

describe('GET /api/analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    (getChefActorContext as jest.Mock).mockResolvedValue(null);

    const { GET } = await import('@/app/api/analytics/route');
    const request = new NextRequest('http://localhost:3001/api/analytics?period=month');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('returns 200 with analytics data for authenticated chef', async () => {
    (getChefActorContext as jest.Mock).mockResolvedValue({
      actor: { userId: 'user-1', role: 'chef_user', entityId: 'chef-1' },
      chefId: 'chef-1',
      storefrontId: 'sf-1',
    });

    // Mock orders query
    const mockOrders = [
      { id: 'o1', total: 50, status: 'delivered', created_at: new Date().toISOString(), customer_id: 'c1' },
      { id: 'o2', total: 30, status: 'completed', created_at: new Date().toISOString(), customer_id: 'c2' },
      { id: 'o3', total: 20, status: 'cancelled', created_at: new Date().toISOString(), customer_id: 'c1' },
    ];

    const mockPrevOrders = [
      { id: 'o4', total: 40, status: 'delivered', created_at: new Date(Date.now() - 40 * 86400000).toISOString(), customer_id: 'c3' },
    ];

    const mockOrderItems = [
      { quantity: 2, unit_price: 15, menu_items: { name: 'Pizza' } },
      { quantity: 1, unit_price: 20, menu_items: { name: 'Pasta' } },
    ];

    const mockReviews = [
      { rating: 5 },
      { rating: 4 },
    ];

    let callCount = 0;
    mockAdminClient.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'orders') {
        callCount++;
        const orders = callCount === 1 ? mockOrders : mockPrevOrders;
        const chain: Record<string, unknown> = {};
        const resolved = Promise.resolve({ data: orders, error: null });
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.gte = jest.fn().mockReturnValue(chain);
        chain.lte = jest.fn().mockReturnValue(chain);
        chain.in = jest.fn().mockReturnValue(chain);
        chain.then = (resolved as Promise<unknown>).then.bind(resolved);
        chain.catch = (resolved as Promise<unknown>).catch.bind(resolved);
        return chain;
      }
      if (table === 'order_items') {
        const chain: Record<string, unknown> = {};
        const resolved = Promise.resolve({ data: mockOrderItems, error: null });
        chain.select = jest.fn().mockReturnValue(chain);
        chain.in = jest.fn().mockReturnValue(chain);
        chain.then = (resolved as Promise<unknown>).then.bind(resolved);
        chain.catch = (resolved as Promise<unknown>).catch.bind(resolved);
        return chain;
      }
      if (table === 'reviews') {
        const chain: Record<string, unknown> = {};
        const resolved = Promise.resolve({ data: mockReviews, error: null });
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.then = (resolved as Promise<unknown>).then.bind(resolved);
        chain.catch = (resolved as Promise<unknown>).catch.bind(resolved);
        return chain;
      }
      // Default
      const chain: Record<string, unknown> = {};
      const resolved = Promise.resolve({ data: [], error: null });
      chain.select = jest.fn().mockReturnValue(chain);
      chain.eq = jest.fn().mockReturnValue(chain);
      chain.gte = jest.fn().mockReturnValue(chain);
      chain.lte = jest.fn().mockReturnValue(chain);
      chain.in = jest.fn().mockReturnValue(chain);
      chain.then = (resolved as Promise<unknown>).then.bind(resolved);
      chain.catch = (resolved as Promise<unknown>).catch.bind(resolved);
      return chain;
    });

    jest.resetModules();
    jest.mock('@/lib/engine', () => ({
      getChefActorContext: jest.fn().mockResolvedValue({
        actor: { userId: 'user-1', role: 'chef_user', entityId: 'chef-1' },
        chefId: 'chef-1',
        storefrontId: 'sf-1',
      }),
      errorResponse: jest.fn((code: string, msg: string, status = 400) =>
        new Response(JSON.stringify({ error: code, message: msg }), { status })
      ),
      successResponse: jest.fn((data: unknown, status = 200) =>
        new Response(JSON.stringify({ data }), { status })
      ),
    }));

    const { GET } = await import('@/app/api/analytics/route');
    const request = new NextRequest('http://localhost:3001/api/analytics?period=month');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
  });

  it('accepts week, month, year period params', async () => {
    (getChefActorContext as jest.Mock).mockResolvedValue({
      actor: { userId: 'user-1', role: 'chef_user', entityId: 'chef-1' },
      chefId: 'chef-1',
      storefrontId: 'sf-1',
    });

    mockAdminClient.from = jest.fn().mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      const resolved = Promise.resolve({ data: [], error: null });
      chain.select = jest.fn().mockReturnValue(chain);
      chain.eq = jest.fn().mockReturnValue(chain);
      chain.gte = jest.fn().mockReturnValue(chain);
      chain.lte = jest.fn().mockReturnValue(chain);
      chain.in = jest.fn().mockReturnValue(chain);
      chain.then = (resolved as Promise<unknown>).then.bind(resolved);
      chain.catch = (resolved as Promise<unknown>).catch.bind(resolved);
      return chain;
    });

    const { GET } = await import('@/app/api/analytics/route');

    for (const period of ['week', 'month', 'year']) {
      const request = new NextRequest(`http://localhost:3001/api/analytics?period=${period}`);
      const response = await GET(request);
      expect(response.status).toBe(200);
    }
  });
});

describe('Analytics utility functions', () => {
  it('calculates comparison percentage correctly', () => {
    const { calculateComparison } = require('@/app/api/analytics/utils');
    expect(calculateComparison(120, 100)).toBeCloseTo(20);
    expect(calculateComparison(80, 100)).toBeCloseTo(-20);
    expect(calculateComparison(100, 0)).toBe(null);
    expect(calculateComparison(0, 0)).toBe(0);
  });

  it('gets period date range for week', () => {
    const { getPeriodDateRange } = require('@/app/api/analytics/utils');
    const { start, end, days } = getPeriodDateRange('week');
    expect(days).toBe(7);
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });

  it('gets period date range for month', () => {
    const { getPeriodDateRange } = require('@/app/api/analytics/utils');
    const { days } = getPeriodDateRange('month');
    expect(days).toBe(30);
  });

  it('gets period date range for year', () => {
    const { getPeriodDateRange } = require('@/app/api/analytics/utils');
    const { days } = getPeriodDateRange('year');
    expect(days).toBe(365);
  });

  it('finds peak hour from hourly order data', () => {
    const { findPeakHour } = require('@/app/api/analytics/utils');
    const hourlyOrders = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hour === 18 ? 15 : Math.floor(Math.random() * 5),
    }));
    hourlyOrders[18]!.count = 15;
    const peak = findPeakHour(hourlyOrders);
    expect(peak).toBe(18);
  });

  it('calculates repeat customer rate', () => {
    const { calculateRepeatCustomerRate } = require('@/app/api/analytics/utils');
    const customerIds = ['c1', 'c1', 'c2', 'c3', 'c3', 'c3'];
    const rate = calculateRepeatCustomerRate(customerIds);
    // c1 and c3 are repeat customers (2 out of 3 unique)
    expect(rate).toBeCloseTo(66.67, 0);
  });
});
