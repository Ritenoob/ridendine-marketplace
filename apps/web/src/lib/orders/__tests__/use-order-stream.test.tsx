/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react';

type SubCb = (status: string) => void;
type BroadcastCb = (msg: { payload?: Record<string, unknown> }) => void;

const orderHandlers: Record<string, BroadcastCb[]> = {};

const mockSubscribe = jest.fn((cb: SubCb) => {
  queueMicrotask(() => cb('SUBSCRIBED'));
  return {};
});

const mockSupabase = {
  channel: jest.fn(() => {
    const ch = {
      on: jest.fn((_type: string, opts: { event: string }, cb: BroadcastCb) => {
        const ev = opts?.event ?? '';
        if (!orderHandlers[ev]) orderHandlers[ev] = [];
        orderHandlers[ev].push(cb);
        return ch;
      }),
      subscribe: mockSubscribe,
    };
    return ch;
  }),
  removeChannel: jest.fn(),
};

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
  createBrowserClient: () => mockSupabase,
  orderChannel: (id: string) => `order:${id}`,
}));

import { useOrderStream } from '../use-order-stream';

describe('useOrderStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const k of Object.keys(orderHandlers)) delete orderHandlers[k];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          tracking: { public_stage: 'cooking' },
        },
      }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    delete (global as { fetch?: unknown }).fetch;
  });

  it('subscribes to order:{orderId} and applies order_update payload', async () => {
    const { result } = renderHook(() =>
      useOrderStream({
        orderId: 'o-1',
        initialPublicStage: 'placed',
      })
    );

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith('order:o-1');
    });

    act(() => {
      for (const cb of orderHandlers['order_update'] ?? []) {
        cb({
          payload: {
            public_stage: 'on_the_way',
            route_progress_pct: 33,
            route_remaining_seconds: 900,
            route_to_dropoff_polyline: 'enc',
            eta_dropoff_at: '2026-06-01T12:00:00.000Z',
          },
        });
      }
    });

    expect(result.current.stage).toBe('on_the_way');
    expect(result.current.progressPct).toBe(33);
    expect(result.current.remainingSeconds).toBe(900);
    expect(result.current.routePolyline).toBe('enc');
    expect(result.current.etaDropoffAt).toBe('2026-06-01T12:00:00.000Z');
    expect(result.current.isLive).toBe(true);
  });

  it('does not poll on interval while subscribed', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockClear();

    renderHook(() =>
      useOrderStream({
        orderId: 'o-2',
        initialPublicStage: 'placed',
        pollIntervalMs: 100,
      })
    );

    await waitFor(() => expect(mockSubscribe).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 400));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
