// SHORTCUT: single hardcoded timezone for weekday bucketing.
// Ceiling: single tz; trigger: per-storefront timezone storage added to DB.
export const KITCHEN_TZ = 'America/Vancouver';

const SAME_WEEKDAY_LOOKBACK = 4;

export interface PrepMenuItem {
  id: string;
  name: string;
  daily_limit: number | null;
  daily_sold: number | null;
  prep_time_minutes: number | null;
  is_available: boolean;
  is_sold_out: boolean;
}

export interface HistoricalOrderForPrep {
  id: string;
  created_at: string;
  order_items: {
    quantity: number;
    menu_item: { id: string } | null;
  }[];
}

export interface ActiveOrder {
  id: string;
  estimated_prep_minutes: number | null;
  order_items: {
    quantity: number;
    special_instructions: string | null;
    menu_item: { id: string; name: string } | null;
  }[];
}

export interface StorefrontForLoad {
  max_queue_size: number | null;
  average_prep_minutes: number | null;
}

export interface PrepPlanItem {
  id: string;
  name: string;
  suggestedQty: number;
  soldToday: number;
  dailyLimit: number | null;
  prepTimeMinutes: number | null;
  basis: 'same-weekday' | 'trailing' | 'limit';
  available: boolean;
}

export interface PrepBoardItem {
  menuItemId: string;
  name: string;
  totalQty: number;
  orderCount: number;
  orders: {
    shortId: string;
    qty: number;
    specialInstructions: string | null;
  }[];
}

export interface KitchenLoad {
  activeCount: number;
  outstandingPrepMinutes: number;
  capacity: number;
  level: 'idle' | 'steady' | 'busy' | 'slammed';
}

function getDateParts(
  date: Date,
  tz: string
): { year: number; month: number; day: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
  };
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function computePrepPlan(
  menuItems: PrepMenuItem[],
  historicalOrders: HistoricalOrderForPrep[],
  now: Date,
  tz: string = KITCHEN_TZ
): PrepPlanItem[] {
  const { weekday: todayWeekday } = getDateParts(now, tz);

  // Build per-day item-quantity map and record each day's weekday.
  const dayItemQty = new Map<string, Map<string, number>>();
  const dayWeekday = new Map<string, number>();

  for (const order of historicalOrders) {
    const { year, month, day, weekday } = getDateParts(new Date(order.created_at), tz);
    const dateKey = toDateKey(year, month, day);

    if (!dayItemQty.has(dateKey)) {
      dayItemQty.set(dateKey, new Map());
      dayWeekday.set(dateKey, weekday);
    }

    const itemMap = dayItemQty.get(dateKey)!;
    for (const oi of order.order_items) {
      if (!oi.menu_item) continue;
      const id = oi.menu_item.id;
      itemMap.set(id, (itemMap.get(id) ?? 0) + oi.quantity);
    }
  }

  // Same-weekday date keys (most recent first, up to lookback limit).
  const sameWeekdayDates = [...dayItemQty.keys()]
    .filter((dk) => dayWeekday.get(dk) === todayWeekday)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, SAME_WEEKDAY_LOOKBACK);

  return menuItems.map((item): PrepPlanItem => {
    const dailyLimit = item.daily_limit;
    const cap = dailyLimit !== null ? dailyLimit : Infinity;
    const dailySold = item.daily_sold ?? 0;
    const isAvailable = !item.is_sold_out && item.is_available;

    if (!isAvailable) {
      return {
        id: item.id,
        name: item.name,
        suggestedQty: 0,
        soldToday: dailySold,
        dailyLimit,
        prepTimeMinutes: item.prep_time_minutes,
        basis: 'limit',
        available: false,
      };
    }

    let demand: number;
    let basis: PrepPlanItem['basis'];

    if (sameWeekdayDates.length > 0) {
      const dailyQtys = sameWeekdayDates.map((dk) => dayItemQty.get(dk)!.get(item.id) ?? 0);
      demand = dailyQtys.reduce((s, q) => s + q, 0) / sameWeekdayDates.length;
      basis = 'same-weekday';
    } else {
      const datesWithItem = [...dayItemQty.keys()].filter(
        (dk) => (dayItemQty.get(dk)!.get(item.id) ?? 0) > 0
      );
      if (datesWithItem.length > 0) {
        const totalQty = datesWithItem.reduce(
          (s, dk) => s + dayItemQty.get(dk)!.get(item.id)!,
          0
        );
        demand = totalQty / datesWithItem.length;
        basis = 'trailing';
      } else {
        demand = dailyLimit ?? 0;
        basis = 'limit';
      }
    }

    const suggestedQty = Math.max(0, Math.floor(Math.min(cap, demand) - dailySold));

    return {
      id: item.id,
      name: item.name,
      suggestedQty,
      soldToday: dailySold,
      dailyLimit,
      prepTimeMinutes: item.prep_time_minutes,
      basis,
      available: true,
    };
  });
}

export function aggregatePrepBoard(activeOrders: ActiveOrder[]): PrepBoardItem[] {
  const map = new Map<string, PrepBoardItem>();
  const seenOrders = new Map<string, Set<string>>();

  for (const order of activeOrders) {
    const shortId = order.id.slice(-6);
    for (const oi of order.order_items) {
      if (!oi.menu_item) continue;
      const { id, name } = oi.menu_item;

      if (!map.has(id)) {
        map.set(id, { menuItemId: id, name, totalQty: 0, orderCount: 0, orders: [] });
        seenOrders.set(id, new Set());
      }

      const entry = map.get(id)!;
      const seen = seenOrders.get(id)!;
      entry.totalQty += oi.quantity;
      if (!seen.has(order.id)) {
        entry.orderCount += 1;
        seen.add(order.id);
      }
      entry.orders.push({
        shortId,
        qty: oi.quantity,
        specialInstructions: oi.special_instructions,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.totalQty - a.totalQty);
}

export function computeKitchenLoad(
  activeOrders: ActiveOrder[],
  storefront: StorefrontForLoad
): KitchenLoad {
  const capacity = storefront.max_queue_size ?? 10;
  const avgPrepMinutes = storefront.average_prep_minutes ?? 20;
  const activeCount = activeOrders.length;

  const outstandingPrepMinutes = activeOrders.reduce(
    (sum, order) => sum + (order.estimated_prep_minutes ?? avgPrepMinutes),
    0
  );

  const ratio = capacity > 0 ? activeCount / capacity : 0;
  const level: KitchenLoad['level'] =
    activeCount === 0 ? 'idle' :
    ratio < 0.5 ? 'steady' :
    ratio < 0.85 ? 'busy' : 'slammed';

  return { activeCount, outstandingPrepMinutes, capacity, level };
}
