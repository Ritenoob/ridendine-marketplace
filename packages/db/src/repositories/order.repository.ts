import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type Order = Tables<'orders'>;
export type OrderItem = Tables<'order_items'>;
export interface OpsOrderListItem extends Order {
  customers: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  chef_storefronts: {
    name: string;
  } | null;
}

export interface OpsOrderDetail extends Order {
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  } | null;
  storefront: {
    id: string;
    name: string;
    slug: string;
    chef: {
      id: string;
      display_name: string | null;
      phone: string | null;
    } | null;
  } | null;
  delivery_address: {
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    postal_code: string;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    menu_item: {
      name: string;
      description: string | null;
    } | null;
  }>;
  delivery: {
    id: string;
    status: string;
    driver_id: string | null;
    driver: {
      first_name: string;
      last_name: string;
      phone: string | null;
    } | null;
  } | null;
}

export async function getOrderById(
  client: SupabaseClient,
  id: string
): Promise<Order | null> {
  const { data, error } = await client
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getOrderByNumber(
  client: SupabaseClient,
  orderNumber: string
): Promise<Order | null> {
  const { data, error } = await client
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getOrdersByCustomer(
  client: SupabaseClient,
  customerId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<Order[]> {
  let query = client
    .from('orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function getOrdersByStorefront(
  client: SupabaseClient,
  storefrontId: string,
  options: { status?: string; page?: number; limit?: number } = {}
): Promise<Order[]> {
  // Always bound the result set — PostgREST silently truncates unbounded
  // queries at 1000 rows, so an explicit limit + range keeps paging honest.
  const page = options.page ?? 1;
  const limit = options.limit ?? 500;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = client
    .from('orders')
    .select('*')
    .eq('storefront_id', storefrontId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function listOpsOrders(
  client: SupabaseClient,
  options: { status?: string; startDate?: string; endDate?: string; page?: number; limit?: number } = {}
): Promise<{ items: OpsOrderListItem[]; total: number }> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let countQuery = client
    .from('orders')
    .select('*', { count: 'exact', head: true });

  let dataQuery = client
    .from('orders')
    .select('*, customers(first_name, last_name, email), chef_storefronts(name)')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options.status) {
    countQuery = countQuery.eq('status', options.status);
    dataQuery = dataQuery.eq('status', options.status);
  }

  if (options.startDate) {
    countQuery = countQuery.gte('created_at', options.startDate);
    dataQuery = dataQuery.gte('created_at', options.startDate);
  }

  if (options.endDate) {
    countQuery = countQuery.lte('created_at', options.endDate);
    dataQuery = dataQuery.lte('created_at', options.endDate);
  }

  const [{ count, error: countError }, { data, error }] = await Promise.all([countQuery, dataQuery]);

  if (countError) throw countError;
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0 };
}

export async function getOpsOrderDetail(
  client: SupabaseClient,
  orderId: string
): Promise<OpsOrderDetail | null> {
  const { data, error } = await client
    .from('orders')
    .select(`
      *,
      customer:customers (
        id, first_name, last_name, email, phone
      ),
      storefront:chef_storefronts (
        id, name, slug,
        chef:chef_profiles (id, display_name, phone)
      ),
      delivery_address:customer_addresses (
        id, label, address_line1, address_line2, city, state, postal_code, country, lat, lng, delivery_instructions, is_default
      ),
      items:order_items (
        id, quantity, unit_price, total_price,
        menu_item:menu_items (name, description)
      ),
      delivery:deliveries (
        id, status, driver_id,
        driver:drivers (first_name, last_name, phone)
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const order = data as unknown as OpsOrderDetail & {
    delivery_address:
      | (OpsOrderDetail['delivery_address'] & { street_address?: string | null })
      | null;
  };

  if (order.delivery_address) {
    order.delivery_address = {
      ...order.delivery_address,
      address_line1:
        order.delivery_address.address_line1 ??
        order.delivery_address.street_address ??
        '',
      address_line2: order.delivery_address.address_line2 ?? null,
    };
  }

  return order;
}

export async function createOrder(
  client: SupabaseClient,
  order: Omit<Order, 'id' | 'created_at' | 'updated_at'>
): Promise<Order> {
  const { data, error } = await client
    .from('orders')
    .insert(order)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export class InvalidOrderTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid order status transition: '${from}' -> '${to}'`);
    this.name = 'InvalidOrderTransitionError';
  }
}

/**
 * Thrown when the order's status changed between the transition validation
 * read and the conditional UPDATE (lost the optimistic-concurrency race).
 * Callers can catch this specifically and retry or surface a conflict.
 */
export class OrderTransitionConflictError extends Error {
  constructor(orderId: string, expectedStatus: string, attemptedStatus: string) {
    super(
      `Order ${orderId} status changed concurrently: expected '${expectedStatus}' while transitioning to '${attemptedStatus}'`
    );
    this.name = 'OrderTransitionConflictError';
  }
}

const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending:          ['accepted', 'rejected', 'cancelled'],
  scheduled:        ['accepted', 'cancelled'],
  accepted:         ['preparing', 'cancelled'],
  rejected:         [],
  preparing:        ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['picked_up', 'cancelled'],
  picked_up:        ['in_transit'],
  in_transit:       ['delivered'],
  delivered:        ['completed', 'refunded'],
  completed:        ['refunded'],
  cancelled:        [],
  refunded:         [],
};

async function fetchCurrentStatus(client: SupabaseClient, id: string): Promise<string> {
  const { data, error } = await client
    .from('orders')
    .select('status')
    .eq('id', id)
    .single();
  if (error) throw error;
  return (data as { status: string }).status;
}

export async function updateOrderStatus(
  client: SupabaseClient,
  id: string,
  status: string
): Promise<Order> {
  const currentStatus = await fetchCurrentStatus(client, id);
  const allowed = VALID_ORDER_TRANSITIONS[currentStatus] ?? [];

  if (!allowed.includes(status)) {
    throw new InvalidOrderTransitionError(currentStatus, status);
  }

  const updates: Partial<Order> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'ready_for_pickup') {
    updates.actual_ready_at = new Date().toISOString();
  }

  // Optimistic concurrency: only update if the status is still the one we
  // validated against (closes the read-validate-update TOCTOU race).
  const { data, error } = await client
    .from('orders')
    .update(updates)
    .eq('id', id)
    .eq('status', currentStatus)
    .select();

  if (error) throw error;

  const updated = (data as Order[] | null)?.[0];
  if (!updated) {
    // 0 affected rows — someone else transitioned the order first.
    throw new OrderTransitionConflictError(id, currentStatus, status);
  }

  return updated;
}

export async function getActiveOrdersForChef(
  client: SupabaseClient,
  storefrontId: string
): Promise<Order[]> {
  const { data, error } = await client
    .from('orders')
    .select('*')
    .eq('storefront_id', storefrontId)
    .in('status', ['pending', 'accepted', 'preparing', 'ready_for_pickup'])
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function createOrderItem(
  client: SupabaseClient,
  item: Omit<OrderItem, 'id' | 'created_at' | 'updated_at'>
): Promise<OrderItem> {
  const { data, error } = await client
    .from('order_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createOrderItems(
  client: SupabaseClient,
  items: Omit<OrderItem, 'id' | 'created_at' | 'updated_at'>[]
): Promise<OrderItem[]> {
  const { data, error } = await client
    .from('order_items')
    .insert(items)
    .select();

  if (error) throw error;
  return data;
}
