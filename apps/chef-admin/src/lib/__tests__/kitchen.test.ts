/**
 * @jest-environment node
 */
import {
  computePrepPlan,
  aggregatePrepBoard,
  computeKitchenLoad,
  mapActiveOrdersToTickets,
  KITCHEN_TZ,
  type ActiveOrder,
} from '../kitchen';

// June 19 2026 is a Friday.
// 10:00 UTC = 03:00 PDT (UTC-7 in summer) -> today is Friday in Vancouver.
const FRIDAY_NOW = new Date('2026-06-19T10:00:00Z');

const ITEM_BASE = {
  id: 'item-1',
  name: 'Butter Chicken',
  daily_limit: 20,
  daily_sold: 0,
  prep_time_minutes: 15,
  is_available: true,
  is_sold_out: false,
};

function fridayOrder(id: string, dateStr: string, qty: number) {
  return {
    id,
    created_at: dateStr,
    order_items: [{ quantity: qty, menu_item: { id: 'item-1' } }],
  };
}

// ============================================================
// computePrepPlan
// ============================================================

describe('computePrepPlan', () => {
  it('uses same-weekday average capped at daily_limit', () => {
    // 4 previous Fridays: 8, 12, 9, 11 units -> avg = 10. daily_limit=12 -> min(12,10)=10. daily_sold=0 -> 10.
    const item = { ...ITEM_BASE, daily_limit: 12 };
    const orders = [
      fridayOrder('a', '2026-06-12T07:01:00Z', 8),  // Friday PDT
      fridayOrder('b', '2026-06-05T07:01:00Z', 12), // Friday PDT
      fridayOrder('c', '2026-05-29T07:01:00Z', 9),  // Friday PDT
      fridayOrder('d', '2026-05-22T07:01:00Z', 11), // Friday PDT
    ];
    const [result] = computePrepPlan([item], orders, FRIDAY_NOW, KITCHEN_TZ);
    expect(result.suggestedQty).toBe(10);
    expect(result.basis).toBe('same-weekday');
  });

  it('caps same-weekday average at daily_limit', () => {
    // avg = 10, but daily_limit=8 -> min(8,10)=8
    const item = { ...ITEM_BASE, daily_limit: 8 };
    const orders = [
      fridayOrder('a', '2026-06-12T07:01:00Z', 10),
      fridayOrder('b', '2026-06-05T07:01:00Z', 10),
    ];
    const [result] = computePrepPlan([item], orders, FRIDAY_NOW, KITCHEN_TZ);
    expect(result.suggestedQty).toBe(8);
  });

  it('subtracts daily_sold from suggested qty', () => {
    // avg=10, daily_limit=20, daily_sold=4 -> max(0, min(20,10)-4)=6
    const item = { ...ITEM_BASE, daily_sold: 4 };
    const orders = [fridayOrder('a', '2026-06-12T07:01:00Z', 10)];
    const [result] = computePrepPlan([item], orders, FRIDAY_NOW, KITCHEN_TZ);
    expect(result.suggestedQty).toBe(6);
  });

  it('clamps to 0 when daily_sold >= suggested demand', () => {
    // daily_limit=10, daily_sold=10 -> max(0, min(10, avg)-10)=0
    const item = { ...ITEM_BASE, daily_limit: 10, daily_sold: 10 };
    const orders = [fridayOrder('a', '2026-06-12T07:01:00Z', 8)];
    const [result] = computePrepPlan([item], orders, FRIDAY_NOW, KITCHEN_TZ);
    expect(result.suggestedQty).toBe(0);
  });

  it('falls back to trailing average when no same-weekday orders exist', () => {
    // All orders are Thursdays (PDT). June 18 7:01am UTC = 12:01am PDT Thu. June 11 same.
    // 2 Thursday orders: 4 + 4 = 8 total, 2 distinct days -> avg = 4.
    // daily_limit=20 -> min(20,4)=4. daily_sold=0 -> 4.
    const item = { ...ITEM_BASE, daily_limit: 20 };
    const thursdayOrders = [
      { id: 'a', created_at: '2026-06-18T07:01:00Z', order_items: [{ quantity: 4, menu_item: { id: 'item-1' } }] },
      { id: 'b', created_at: '2026-06-11T07:01:00Z', order_items: [{ quantity: 4, menu_item: { id: 'item-1' } }] },
    ];
    const [result] = computePrepPlan([item], thursdayOrders, FRIDAY_NOW, KITCHEN_TZ);
    expect(result.suggestedQty).toBe(4);
    expect(result.basis).toBe('trailing');
  });

  it('falls back to daily_limit when there are no historical orders', () => {
    const item = { ...ITEM_BASE, daily_limit: 7 };
    const [result] = computePrepPlan([item], [], FRIDAY_NOW, KITCHEN_TZ);
    expect(result.suggestedQty).toBe(7);
    expect(result.basis).toBe('limit');
  });

  it('returns suggestedQty=0 and available=false for sold-out items', () => {
    const item = { ...ITEM_BASE, is_sold_out: true };
    const orders = [fridayOrder('a', '2026-06-12T07:01:00Z', 10)];
    const [result] = computePrepPlan([item], orders, FRIDAY_NOW, KITCHEN_TZ);
    expect(result.suggestedQty).toBe(0);
    expect(result.available).toBe(false);
  });

  it('returns suggestedQty=0 and available=false for unavailable items', () => {
    const item = { ...ITEM_BASE, is_available: false };
    const orders = [fridayOrder('a', '2026-06-12T07:01:00Z', 10)];
    const [result] = computePrepPlan([item], orders, FRIDAY_NOW, KITCHEN_TZ);
    expect(result.suggestedQty).toBe(0);
    expect(result.available).toBe(false);
  });

  it('treats null daily_limit as no cap and uses demand directly', () => {
    // null daily_limit -> cap = Infinity -> suggestedQty = demand - 0
    const item = { ...ITEM_BASE, daily_limit: null };
    const orders = [fridayOrder('a', '2026-06-12T07:01:00Z', 12)];
    const [result] = computePrepPlan([item], orders, FRIDAY_NOW, KITCHEN_TZ);
    expect(result.suggestedQty).toBe(12);
    expect(result.dailyLimit).toBeNull();
    expect(result.basis).toBe('same-weekday');
  });

  it('buckets midnight-boundary orders to the intended weekday in KITCHEN_TZ', () => {
    // 2026-06-19T06:59:00Z = 23:59 Thursday June 18 PDT -> Thursday, NOT Friday
    // 2026-06-12T07:01:00Z = 00:01 Friday June 12 PDT -> Friday
    const item = { ...ITEM_BASE, daily_limit: 20 };
    const orders = [
      { id: 'thu', created_at: '2026-06-19T06:59:00Z', order_items: [{ quantity: 10, menu_item: { id: 'item-1' } }] },
      { id: 'fri', created_at: '2026-06-12T07:01:00Z', order_items: [{ quantity: 5, menu_item: { id: 'item-1' } }] },
    ];
    // Only the Friday order should count. avg=5. net daily_sold=0 -> 5.
    const [result] = computePrepPlan([item], orders, FRIDAY_NOW, KITCHEN_TZ);
    expect(result.suggestedQty).toBe(5);
    expect(result.basis).toBe('same-weekday');
  });
});

// ============================================================
// aggregatePrepBoard
// ============================================================

describe('aggregatePrepBoard', () => {
  it('aggregates items across multiple orders and sorts by totalQty desc', () => {
    const orders = [
      {
        id: 'ord-1',
        estimated_prep_minutes: 15,
        order_items: [
          { quantity: 2, special_instructions: null, menu_item: { id: 'item-a', name: 'Naan' } },
          { quantity: 3, special_instructions: 'no salt', menu_item: { id: 'item-b', name: 'Rice' } },
        ],
      },
      {
        id: 'ord-2',
        estimated_prep_minutes: 20,
        order_items: [
          { quantity: 5, special_instructions: null, menu_item: { id: 'item-a', name: 'Naan' } },
        ],
      },
    ];

    const board = aggregatePrepBoard(orders);

    // Naan: 2+5=7 across 2 orders. Rice: 3 across 1 order.
    expect(board).toHaveLength(2);
    expect(board[0].name).toBe('Naan');
    expect(board[0].totalQty).toBe(7);
    expect(board[0].orderCount).toBe(2);
    expect(board[0].orders).toHaveLength(2);
    expect(board[1].name).toBe('Rice');
    expect(board[1].totalQty).toBe(3);
  });

  it('includes short order ID and special instructions per order', () => {
    const orders = [
      {
        id: 'ord-abc123',
        estimated_prep_minutes: null,
        order_items: [{ quantity: 4, special_instructions: 'extra spicy', menu_item: { id: 'item-1', name: 'Curry' } }],
      },
    ];
    const [item] = aggregatePrepBoard(orders);
    expect(item.orders[0].qty).toBe(4);
    expect(item.orders[0].specialInstructions).toBe('extra spicy');
    expect(item.orders[0].shortId).toBe('abc123');
  });

  it('counts distinct orders containing a menu item, not individual order_items', () => {
    // One order with two order_items for the same menu item.
    const order = {
      id: 'ord-1',
      estimated_prep_minutes: 15,
      order_items: [
        { quantity: 2, special_instructions: null, menu_item: { id: 'item-a', name: 'Naan' } },
        { quantity: 1, special_instructions: 'toasted', menu_item: { id: 'item-a', name: 'Naan' } },
      ],
    };
    const [item] = aggregatePrepBoard([order]);
    expect(item.orderCount).toBe(1);
    expect(item.totalQty).toBe(3);
  });

  it('returns empty array for no active orders', () => {
    expect(aggregatePrepBoard([])).toEqual([]);
  });

  it('skips order_items with null menu_item', () => {
    const orders = [
      {
        id: 'ord-1',
        estimated_prep_minutes: 10,
        order_items: [
          { quantity: 2, special_instructions: null, menu_item: null },
          { quantity: 3, special_instructions: null, menu_item: { id: 'item-a', name: 'Naan' } },
        ],
      },
    ];
    const board = aggregatePrepBoard(orders);
    expect(board).toHaveLength(1);
    expect(board[0].name).toBe('Naan');
  });
});

// ============================================================
// computeKitchenLoad
// ============================================================

describe('computeKitchenLoad', () => {
  const storefront = { max_queue_size: 10, average_prep_minutes: 20 };

  it('returns idle when there are no active orders', () => {
    const result = computeKitchenLoad([], storefront);
    expect(result.level).toBe('idle');
    expect(result.activeCount).toBe(0);
    expect(result.outstandingPrepMinutes).toBe(0);
  });

  it('returns steady for <50% queue fill', () => {
    const orders = Array.from({ length: 4 }, (_, i) => ({
      id: `ord-${i}`,
      estimated_prep_minutes: 15,
      order_items: [],
    }));
    // 4/10 = 0.4 -> steady
    expect(computeKitchenLoad(orders, storefront).level).toBe('steady');
  });

  it('returns busy for >=50% and <85% queue fill', () => {
    const orders = Array.from({ length: 8 }, (_, i) => ({
      id: `ord-${i}`,
      estimated_prep_minutes: 15,
      order_items: [],
    }));
    // 8/10 = 0.8 -> busy
    expect(computeKitchenLoad(orders, storefront).level).toBe('busy');
  });

  it('returns slammed at >=85% queue fill', () => {
    const orders = Array.from({ length: 9 }, (_, i) => ({
      id: `ord-${i}`,
      estimated_prep_minutes: 15,
      order_items: [],
    }));
    // 9/10 = 0.9 -> slammed
    expect(computeKitchenLoad(orders, storefront).level).toBe('slammed');
  });

  it('uses storefront average_prep_minutes fallback when order prep time is null', () => {
    const orders = [
      { id: 'ord-1', estimated_prep_minutes: null, order_items: [] },
      { id: 'ord-2', estimated_prep_minutes: null, order_items: [] },
    ];
    // 2 * average_prep_minutes(20) = 40
    const result = computeKitchenLoad(orders, storefront);
    expect(result.outstandingPrepMinutes).toBe(40);
  });

  it('sums actual estimated_prep_minutes when present', () => {
    const orders = [
      { id: 'ord-1', estimated_prep_minutes: 10, order_items: [] },
      { id: 'ord-2', estimated_prep_minutes: 25, order_items: [] },
    ];
    expect(computeKitchenLoad(orders, storefront).outstandingPrepMinutes).toBe(35);
  });

  it('defaults max_queue_size to 10 when null', () => {
    const orders = Array.from({ length: 9 }, (_, i) => ({
      id: `ord-${i}`,
      estimated_prep_minutes: 5,
      order_items: [],
    }));
    // 9/10 (default) -> slammed
    expect(computeKitchenLoad(orders, { max_queue_size: null, average_prep_minutes: 20 }).level).toBe('slammed');
  });

  it('exposes capacity (max_queue_size)', () => {
    const result = computeKitchenLoad([], { max_queue_size: 12, average_prep_minutes: 20 });
    expect(result.capacity).toBe(12);
  });
});

describe('KITCHEN_TZ', () => {
  it('is set to Americas timezone', () => {
    expect(KITCHEN_TZ).toMatch(/America\//);
  });
});

// ============================================================
// mapActiveOrdersToTickets
// ============================================================

describe('mapActiveOrdersToTickets', () => {
  const customersById = new Map([
    ['c-1', { first_name: 'Amy', last_name: 'Chen' }],
  ]);

  const fullOrder: ActiveOrder = {
    id: 'ord-1',
    order_number: 'RD-1001',
    status: 'preparing',
    created_at: '2026-06-19T12:00:00Z',
    estimated_prep_minutes: 20,
    prep_started_at: '2026-06-19T11:55:00Z',
    estimated_ready_at: null,
    special_instructions: 'extra spicy',
    customer_id: 'c-1',
    order_items: [
      { quantity: 2, special_instructions: 'no onion', menu_item: { id: 'mi-1', name: 'Butter Chicken' } },
      { quantity: 1, special_instructions: null, menu_item: { id: 'mi-2', name: 'Naan' } },
    ],
  };

  it('maps fields, sums totalQty, and attaches customer name', () => {
    const [t] = mapActiveOrdersToTickets([fullOrder], customersById);
    expect(t.id).toBe('ord-1');
    expect(t.orderNumber).toBe('RD-1001');
    expect(t.status).toBe('preparing');
    expect(t.createdAt).toBe('2026-06-19T12:00:00Z');
    expect(t.prepStartedAt).toBe('2026-06-19T11:55:00Z');
    expect(t.estimatedPrepMinutes).toBe(20);
    expect(t.estimatedReadyAt).toBeNull();
    expect(t.specialInstructions).toBe('extra spicy');
    expect(t.customerName).toBe('Amy Chen');
    expect(t.items).toHaveLength(2);
    expect(t.totalQty).toBe(3); // 2 + 1
  });

  it('returns null customerName when customer not in map', () => {
    const order: ActiveOrder = {
      ...fullOrder,
      id: 'ord-2',
      customer_id: 'c-unknown',
    };
    const [t] = mapActiveOrdersToTickets([order], customersById);
    expect(t.customerName).toBeNull();
  });

  it('skips order_items with null menu_item', () => {
    const order: ActiveOrder = {
      ...fullOrder,
      id: 'ord-3',
      order_items: [
        { quantity: 1, special_instructions: null, menu_item: null },
        { quantity: 3, special_instructions: null, menu_item: { id: 'mi-1', name: 'Naan' } },
      ],
    };
    const [t] = mapActiveOrdersToTickets([order], customersById);
    expect(t.items).toHaveLength(1);
    expect(t.items[0].name).toBe('Naan');
    expect(t.totalQty).toBe(3);
  });
});
