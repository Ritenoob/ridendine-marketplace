// ==========================================
// DISPATCH SERVICE TESTS
// Driver assignment, delivery creation, release
// ==========================================

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  dispatchOrder,
  releaseDriver,
  getPendingDeliveries,
} from './dispatch.service';
import { DRIVER_PAYOUT_PERCENT } from '../constants';

// ==========================================
// FIXTURES
// ==========================================

const ORDER_ID = '00000000-0000-0000-0002-000000000001';
const DELIVERY_ID = '00000000-0000-0000-0003-000000000001';
const DRIVER_A_ID = '00000000-0000-0000-0001-000000000001';
const DRIVER_B_ID = '00000000-0000-0000-0001-000000000002';
const DRIVER_USER_ID = '00000000-0000-0000-0004-000000000001';

// Kitchen near downtown Hamilton ON
const KITCHEN_LAT = 43.26;
const KITCHEN_LNG = -79.87;

function makeKitchen(overrides: Record<string, unknown> = {}) {
  return {
    id: 'kitchen-1',
    address_line1: '123 Main St',
    city: 'Hamilton',
    state: 'ON',
    postal_code: 'L8P 1A1',
    lat: KITCHEN_LAT,
    lng: KITCHEN_LNG,
    ...overrides,
  };
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    delivery_fee: 599,
    chef_storefronts: {
      id: 'storefront-1',
      name: "Maria's Kitchen",
      chef_kitchens: [makeKitchen()],
    },
    customer_addresses: {
      id: 'addr-1',
      address_line1: '456 King St',
      city: 'Hamilton',
      state: 'ON',
      postal_code: 'L8P 2B2',
      lat: 43.25,
      lng: -79.85,
    },
    ...overrides,
  };
}

function makeOnlineDriver(
  driverId: string,
  lat: number | null,
  lng: number | null
) {
  return { driver_id: driverId, current_lat: lat, current_lng: lng };
}

interface MockClientOptions {
  order?: Record<string, unknown> | null;
  orderError?: { message: string } | null;
  existingDelivery?: { id: string } | null;
  onlineDrivers?: unknown[] | null;
  insertedDelivery?: { id: string } | null;
  deliveryInsertError?: { message: string } | null;
  driverUser?: { user_id: string | null } | null;
  driversLookupThrows?: boolean;
  pendingOrders?: unknown[] | null;
  pendingError?: { message: string } | null;
}

/**
 * Builds a mock Supabase client covering every table/chain dispatchOrder,
 * releaseDriver, and getPendingDeliveries touch. Records inserts/updates
 * so tests can assert on payloads.
 */
function buildMockClient(opts: MockClientOptions = {}) {
  const calls = {
    deliveryInserts: [] as Array<Record<string, unknown>>,
    notificationInserts: [] as Array<Record<string, unknown>>,
    orderUpdates: [] as Array<{ payload: Record<string, unknown>; eq: [string, string] }>,
    presenceUpdates: [] as Array<{ payload: Record<string, unknown>; eq: [string, string] }>,
  };

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              // dispatchOrder path: .eq('id', orderId).single()
              single: vi.fn().mockResolvedValue({
                data: opts.order ?? null,
                error:
                  opts.orderError ??
                  (opts.order ? null : { message: 'not found' }),
              }),
              // getPendingDeliveries path: .eq('status', ...).is('driver_id', null)
              is: vi.fn().mockResolvedValue({
                data: opts.pendingOrders ?? null,
                error: opts.pendingError ?? null,
              }),
            }),
          }),
          update: vi.fn((payload: Record<string, unknown>) => ({
            eq: vi.fn((col: string, val: string) => {
              calls.orderUpdates.push({ payload, eq: [col, val] });
              return Promise.resolve({ data: null, error: null });
            }),
          })),
        };
      }

      if (table === 'deliveries') {
        return {
          // existing-delivery check: .select('id').eq('order_id', ...).single()
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: opts.existingDelivery ?? null,
                error: opts.existingDelivery ? null : { message: 'not found' },
              }),
            }),
          }),
          insert: vi.fn((payload: Record<string, unknown>) => {
            calls.deliveryInserts.push(payload);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: opts.deliveryInsertError
                    ? null
                    : opts.insertedDelivery ?? { id: DELIVERY_ID },
                  error: opts.deliveryInsertError ?? null,
                }),
              }),
            };
          }),
        };
      }

      if (table === 'driver_presence') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: opts.onlineDrivers ?? [],
                error: null,
              }),
            }),
          }),
          update: vi.fn((payload: Record<string, unknown>) => ({
            eq: vi.fn((col: string, val: string) => {
              calls.presenceUpdates.push({ payload, eq: [col, val] });
              return Promise.resolve({ data: null, error: null });
            }),
          })),
        };
      }

      if (table === 'drivers') {
        if (opts.driversLookupThrows) {
          throw new Error('drivers lookup failed');
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: opts.driverUser ?? null,
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'notifications') {
        return {
          insert: vi.fn((payload: Record<string, unknown>) => {
            calls.notificationInserts.push(payload);
            return Promise.resolve({ data: null, error: null });
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { client, calls };
}

beforeEach(() => {
  vi.restoreAllMocks();
  // dispatchOrder logs in failure / non-fatal paths — keep test output clean
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// ==========================================
// dispatchOrder — guard / failure paths
// ==========================================

describe('dispatchOrder failure paths', () => {
  it('returns "Order not found" when the order fetch errors', async () => {
    const { client } = buildMockClient({ order: null });

    const result = await dispatchOrder(client as any, ORDER_ID);

    expect(result).toEqual({ success: false, error: 'Order not found' });
  });

  it('returns "Delivery already exists" when a delivery row exists for the order (idempotency guard)', async () => {
    const { client, calls } = buildMockClient({
      order: makeOrder(),
      existingDelivery: { id: DELIVERY_ID },
    });

    const result = await dispatchOrder(client as any, ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Delivery already exists for this order');
    expect(calls.deliveryInserts).toHaveLength(0);
  });

  it('returns "No kitchen location found" when the storefront has no kitchens', async () => {
    const order = makeOrder({
      chef_storefronts: {
        id: 'storefront-1',
        name: "Maria's Kitchen",
        chef_kitchens: [],
      },
    });
    const { client } = buildMockClient({ order });

    const result = await dispatchOrder(client as any, ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('No kitchen location found for order');
  });

  it('returns "No available drivers" when the online-driver query returns an empty list', async () => {
    const { client, calls } = buildMockClient({
      order: makeOrder(),
      onlineDrivers: [],
    });

    const result = await dispatchOrder(client as any, ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('No available drivers');
    expect(calls.deliveryInserts).toHaveLength(0);
    expect(calls.orderUpdates).toHaveLength(0);
  });

  it('returns "No available drivers" when the online-driver query returns null data', async () => {
    const { client } = buildMockClient({
      order: makeOrder(),
      onlineDrivers: null,
    });

    const result = await dispatchOrder(client as any, ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('No available drivers');
  });

  it('propagates the insert error message when delivery creation fails', async () => {
    const { client, calls } = buildMockClient({
      order: makeOrder(),
      onlineDrivers: [makeOnlineDriver(DRIVER_A_ID, 43.27, -79.88)],
      deliveryInsertError: { message: 'unique constraint violation' },
    });

    const result = await dispatchOrder(client as any, ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('unique constraint violation');
    // Order must NOT be advanced when delivery creation failed
    expect(calls.orderUpdates).toHaveLength(0);
    expect(calls.presenceUpdates).toHaveLength(0);
  });

  it('catches unexpected exceptions and returns them as an error result', async () => {
    const client = {
      from: vi.fn(() => {
        throw new Error('connection lost');
      }),
    };

    const result = await dispatchOrder(client as any, ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('connection lost');
  });

  it('returns "Unknown dispatch error" for non-Error throwables', async () => {
    const client = {
      from: vi.fn(() => {
        // eslint-disable-next-line no-throw-literal
        throw 'string failure';
      }),
    };

    const result = await dispatchOrder(client as any, ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown dispatch error');
  });
});

// ==========================================
// dispatchOrder — happy path
// ==========================================

describe('dispatchOrder happy path', () => {
  it('assigns a driver, creates the delivery, and returns ids', async () => {
    const { client, calls } = buildMockClient({
      order: makeOrder(),
      onlineDrivers: [makeOnlineDriver(DRIVER_A_ID, 43.27, -79.88)],
      driverUser: { user_id: DRIVER_USER_ID },
    });

    const result = await dispatchOrder(client as any, ORDER_ID);

    expect(result).toEqual({
      success: true,
      deliveryId: DELIVERY_ID,
      driverId: DRIVER_A_ID,
    });
  });

  it('creates the delivery row with correct payload (addresses, fee, payout, status)', async () => {
    const { client, calls } = buildMockClient({
      order: makeOrder({ delivery_fee: 599 }),
      onlineDrivers: [makeOnlineDriver(DRIVER_A_ID, 43.27, -79.88)],
      driverUser: { user_id: DRIVER_USER_ID },
    });

    await dispatchOrder(client as any, ORDER_ID);

    expect(calls.deliveryInserts).toHaveLength(1);
    const insert = calls.deliveryInserts[0]!;
    expect(insert).toMatchObject({
      order_id: ORDER_ID,
      driver_id: DRIVER_A_ID,
      status: 'assigned',
      pickup_address: '123 Main St, Hamilton, ON L8P 1A1',
      pickup_lat: KITCHEN_LAT,
      pickup_lng: KITCHEN_LNG,
      dropoff_address: '456 King St, Hamilton, ON L8P 2B2',
      dropoff_lat: 43.25,
      dropoff_lng: -79.85,
      delivery_fee: 599,
      // 80% of 599 = 479.2 → rounds to 479
      driver_payout: Math.round(599 * (DRIVER_PAYOUT_PERCENT / 100)),
    });
    expect(insert.driver_payout).toBe(479);
    expect(typeof insert.estimated_pickup_at).toBe('string');
    expect(typeof insert.estimated_dropoff_at).toBe('string');
  });

  it('updates the order status to driver_assigned', async () => {
    const { client, calls } = buildMockClient({
      order: makeOrder(),
      onlineDrivers: [makeOnlineDriver(DRIVER_A_ID, 43.27, -79.88)],
      driverUser: { user_id: DRIVER_USER_ID },
    });

    await dispatchOrder(client as any, ORDER_ID);

    expect(calls.orderUpdates).toHaveLength(1);
    expect(calls.orderUpdates[0]!.payload.status).toBe('driver_assigned');
    expect(calls.orderUpdates[0]!.eq).toEqual(['id', ORDER_ID]);
  });

  it('marks the assigned driver as busy', async () => {
    const { client, calls } = buildMockClient({
      order: makeOrder(),
      onlineDrivers: [makeOnlineDriver(DRIVER_A_ID, 43.27, -79.88)],
      driverUser: { user_id: DRIVER_USER_ID },
    });

    await dispatchOrder(client as any, ORDER_ID);

    expect(calls.presenceUpdates).toHaveLength(1);
    expect(calls.presenceUpdates[0]!.payload).toEqual({ status: 'busy' });
    expect(calls.presenceUpdates[0]!.eq).toEqual(['driver_id', DRIVER_A_ID]);
  });

  it('sends a delivery_offer notification to the driver user', async () => {
    const { client, calls } = buildMockClient({
      order: makeOrder(),
      onlineDrivers: [makeOnlineDriver(DRIVER_A_ID, 43.27, -79.88)],
      driverUser: { user_id: DRIVER_USER_ID },
    });

    await dispatchOrder(client as any, ORDER_ID);

    expect(calls.notificationInserts).toHaveLength(1);
    expect(calls.notificationInserts[0]).toMatchObject({
      user_id: DRIVER_USER_ID,
      type: 'delivery_offer',
      read: false,
      data: { delivery_id: DELIVERY_ID, order_id: ORDER_ID },
    });
    expect(String(calls.notificationInserts[0]!.body)).toContain("Maria's Kitchen");
  });

  it('skips the notification (but still succeeds) when the driver has no user_id', async () => {
    const { client, calls } = buildMockClient({
      order: makeOrder(),
      onlineDrivers: [makeOnlineDriver(DRIVER_A_ID, 43.27, -79.88)],
      driverUser: null,
    });

    const result = await dispatchOrder(client as any, ORDER_ID);

    expect(result.success).toBe(true);
    expect(calls.notificationInserts).toHaveLength(0);
  });

  it('treats notification failures as non-fatal (dispatch still succeeds)', async () => {
    const { client, calls } = buildMockClient({
      order: makeOrder(),
      onlineDrivers: [makeOnlineDriver(DRIVER_A_ID, 43.27, -79.88)],
      driversLookupThrows: true,
    });

    const result = await dispatchOrder(client as any, ORDER_ID);

    expect(result.success).toBe(true);
    expect(result.deliveryId).toBe(DELIVERY_ID);
    // Driver still marked busy even though the notification step failed
    expect(calls.presenceUpdates).toHaveLength(1);
  });
});

// ==========================================
// dispatchOrder — driver selection
// ==========================================

describe('dispatchOrder driver selection', () => {
  it('picks the nearest driver when multiple online drivers have coordinates', async () => {
    const { client } = buildMockClient({
      order: makeOrder(),
      onlineDrivers: [
        // listed first but ~80 km away
        makeOnlineDriver(DRIVER_B_ID, 44.0, -79.87),
        // ~1 km from the kitchen
        makeOnlineDriver(DRIVER_A_ID, 43.27, -79.87),
      ],
      driverUser: { user_id: DRIVER_USER_ID },
    });

    const result = await dispatchOrder(client as any, ORDER_ID);

    expect(result.success).toBe(true);
    expect(result.driverId).toBe(DRIVER_A_ID);
  });

  it('falls back to the first online driver when no driver has coordinates', async () => {
    const { client } = buildMockClient({
      order: makeOrder(),
      onlineDrivers: [
        makeOnlineDriver(DRIVER_B_ID, null, null),
        makeOnlineDriver(DRIVER_A_ID, null, null),
      ],
      driverUser: { user_id: DRIVER_USER_ID },
    });

    const result = await dispatchOrder(client as any, ORDER_ID);

    expect(result.success).toBe(true);
    expect(result.driverId).toBe(DRIVER_B_ID);
  });

  it('uses the first online driver (no distance sort) when the kitchen has no coordinates', async () => {
    const order = makeOrder({
      chef_storefronts: {
        id: 'storefront-1',
        name: "Maria's Kitchen",
        chef_kitchens: [makeKitchen({ lat: null, lng: null })],
      },
    });
    const { client, calls } = buildMockClient({
      order,
      onlineDrivers: [
        makeOnlineDriver(DRIVER_B_ID, 44.0, -79.87),
        makeOnlineDriver(DRIVER_A_ID, 43.27, -79.87),
      ],
      driverUser: { user_id: DRIVER_USER_ID },
    });

    const result = await dispatchOrder(client as any, ORDER_ID);

    expect(result.success).toBe(true);
    expect(result.driverId).toBe(DRIVER_B_ID);
    expect(calls.deliveryInserts[0]).toMatchObject({
      pickup_lat: null,
      pickup_lng: null,
    });
  });

  it('KNOWN BUG (documented): a kitchen at lat 0 (equator) is treated as having no coordinates', async () => {
    // `if (kitchen.lat && kitchen.lng)` uses truthiness, so a legitimate
    // coordinate of exactly 0 disables distance sorting and the FIRST online
    // driver wins even when another driver is far closer. The same falsy-zero
    // filter applies to drivers (`d.current_lat && d.current_lng`).
    // Compare with driver-matching.service, which handles 0 correctly.
    const order = makeOrder({
      chef_storefronts: {
        id: 'storefront-1',
        name: "Maria's Kitchen",
        chef_kitchens: [makeKitchen({ lat: 0, lng: -79.87 })],
      },
    });
    const { client } = buildMockClient({
      order,
      onlineDrivers: [
        makeOnlineDriver(DRIVER_B_ID, 10.0, -79.87), // ~1100 km away
        makeOnlineDriver(DRIVER_A_ID, 0.01, -79.87), // ~1 km away
      ],
      driverUser: { user_id: DRIVER_USER_ID },
    });

    const result = await dispatchOrder(client as any, ORDER_ID);

    // Current (buggy) behavior: the far driver listed first is assigned.
    expect(result.driverId).toBe(DRIVER_B_ID);
  });
});

// ==========================================
// dispatchOrder — address fallbacks
// ==========================================

describe('dispatchOrder address fallbacks', () => {
  it('falls back to the storefront name for pickup when the kitchen has no street address', async () => {
    const order = makeOrder({
      chef_storefronts: {
        id: 'storefront-1',
        name: "Maria's Kitchen",
        chef_kitchens: [makeKitchen({ address_line1: null })],
      },
    });
    const { client, calls } = buildMockClient({
      order,
      onlineDrivers: [makeOnlineDriver(DRIVER_A_ID, 43.27, -79.88)],
      driverUser: { user_id: DRIVER_USER_ID },
    });

    await dispatchOrder(client as any, ORDER_ID);

    expect(calls.deliveryInserts[0]!.pickup_address).toBe("Maria's Kitchen");
  });

  it('falls back to "Delivery location" when the order has no customer address', async () => {
    const order = makeOrder({ customer_addresses: null });
    const { client, calls } = buildMockClient({
      order,
      onlineDrivers: [makeOnlineDriver(DRIVER_A_ID, 43.27, -79.88)],
      driverUser: { user_id: DRIVER_USER_ID },
    });

    const result = await dispatchOrder(client as any, ORDER_ID);

    expect(result.success).toBe(true);
    expect(calls.deliveryInserts[0]).toMatchObject({
      dropoff_address: 'Delivery location',
      dropoff_lat: null,
      dropoff_lng: null,
    });
  });
});

// ==========================================
// releaseDriver
// ==========================================

describe('releaseDriver', () => {
  it('sets the driver presence back to online', async () => {
    const { client, calls } = buildMockClient();

    await releaseDriver(client as any, DRIVER_A_ID);

    expect(client.from).toHaveBeenCalledWith('driver_presence');
    expect(calls.presenceUpdates).toHaveLength(1);
    expect(calls.presenceUpdates[0]!.payload).toEqual({ status: 'online' });
    expect(calls.presenceUpdates[0]!.eq).toEqual(['driver_id', DRIVER_A_ID]);
  });
});

// ==========================================
// getPendingDeliveries
// ==========================================

describe('getPendingDeliveries', () => {
  it('returns the rows for ready_for_pickup orders without a driver', async () => {
    const pending = [
      { id: ORDER_ID, order_number: 'RD-1001', status: 'ready_for_pickup', delivery_fee: 599 },
    ];
    const { client } = buildMockClient({ pendingOrders: pending });

    const result = await getPendingDeliveries(client as any);

    expect(result).toEqual(pending);
    expect(client.from).toHaveBeenCalledWith('orders');
  });

  it('returns an empty array when the query yields null data', async () => {
    const { client } = buildMockClient({ pendingOrders: null });

    const result = await getPendingDeliveries(client as any);

    expect(result).toEqual([]);
  });

  it('throws when the query returns an error', async () => {
    const { client } = buildMockClient({
      pendingError: { message: 'permission denied' },
    });

    await expect(getPendingDeliveries(client as any)).rejects.toEqual({
      message: 'permission denied',
    });
  });
});
