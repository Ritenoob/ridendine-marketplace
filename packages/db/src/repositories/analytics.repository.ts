import type { SupabaseClient } from '../client/types';

// ==========================================
// ANALYTICS REPOSITORY
// Read models for ops-admin analytics dashboards, trend charts and
// lightweight order ticker widgets. All functions take the caller's
// Supabase client (admin, server or browser) as the first parameter so
// RLS behaviour is decided at the call site, never in here.
// ==========================================

export interface AnalyticsOrderRow {
  id: string;
  total: number;
  service_fee: number | null;
  status: string;
  customer_id: string;
  created_at: string;
}

export interface OrderTrendRow {
  id: string;
  total: number;
  status: string;
  payment_status: string | null;
  created_at: string;
}

export interface PaidOrderRevenueRow {
  total: number | null;
  service_fee: number | null;
}

export interface PaidOrderRevenueByDateRow {
  total: number;
  created_at: string;
}

export interface OrderCreatedAtRow {
  created_at: string;
}

export interface OrderTickerRow {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
}

export interface AnalyticsEventNameRow {
  event_name: string;
}

/** Orders created within [start, end] with the columns the GMV metrics need. */
export async function listOrderAnalyticsRows(
  client: SupabaseClient,
  startIso: string,
  endIso: string
): Promise<AnalyticsOrderRow[]> {
  const { data, error } = await client
    .from('orders')
    .select('id, total, service_fee, status, customer_id, created_at')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (error) throw error;
  return (data ?? []) as unknown as AnalyticsOrderRow[];
}

/** Orders created within [start, end], oldest first, for daily trend buckets. */
export async function listOrderTrendRows(
  client: SupabaseClient,
  startIso: string,
  endIso: string
): Promise<OrderTrendRow[]> {
  const { data, error } = await client
    .from('orders')
    .select('id, total, status, payment_status, created_at')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as OrderTrendRow[];
}

/** Exact count of orders created since `sinceIso` (optionally before `beforeIso`). */
export async function countOrdersCreatedBetween(
  client: SupabaseClient,
  sinceIso: string,
  beforeIso?: string
): Promise<number> {
  let query = client
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sinceIso);
  if (beforeIso) query = query.lt('created_at', beforeIso);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** Exact count of orders created since `sinceIso` with the given status. */
export async function countOrdersCreatedSinceWithStatus(
  client: SupabaseClient,
  sinceIso: string,
  status: string
): Promise<number> {
  const { count, error } = await client
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sinceIso)
    .eq('status', status as never);

  if (error) throw error;
  return count ?? 0;
}

/** `total, service_fee` for payment-completed orders since `sinceIso`. */
export async function listPaidOrderRevenueRowsSince(
  client: SupabaseClient,
  sinceIso: string
): Promise<PaidOrderRevenueRow[]> {
  const { data, error } = await client
    .from('orders')
    .select('total, service_fee')
    .gte('created_at', sinceIso)
    .eq('payment_status', 'completed');

  if (error) throw error;
  return (data ?? []) as unknown as PaidOrderRevenueRow[];
}

/** `total` for payment-completed orders in [since, before). `beforeIso` optional. */
export async function listPaidOrderTotalsBetween(
  client: SupabaseClient,
  sinceIso: string,
  beforeIso?: string
): Promise<Array<{ total: number }>> {
  let query = client.from('orders').select('total').gte('created_at', sinceIso);
  if (beforeIso) query = query.lt('created_at', beforeIso);

  const { data, error } = await query.eq('payment_status', 'completed');
  if (error) throw error;
  return (data ?? []) as unknown as Array<{ total: number }>;
}

/** `total, created_at` for payment-completed orders since `sinceIso` (revenue chart). */
export async function listPaidOrderRevenueByDateSince(
  client: SupabaseClient,
  sinceIso: string
): Promise<PaidOrderRevenueByDateRow[]> {
  const { data, error } = await client
    .from('orders')
    .select('total, created_at')
    .gte('created_at', sinceIso)
    .eq('payment_status', 'completed');

  if (error) throw error;
  return (data ?? []) as unknown as PaidOrderRevenueByDateRow[];
}

/** `created_at` of all orders since `sinceIso` (hour-of-day heatmap). */
export async function listOrderCreatedTimesSince(
  client: SupabaseClient,
  sinceIso: string
): Promise<OrderCreatedAtRow[]> {
  const { data, error } = await client
    .from('orders')
    .select('created_at')
    .gte('created_at', sinceIso);

  if (error) throw error;
  return (data ?? []) as unknown as OrderCreatedAtRow[];
}

/** Most recent orders since `sinceIso`, newest first (real-time ticker). */
export async function listRecentOrderTickerRows(
  client: SupabaseClient,
  sinceIso: string,
  limit = 10
): Promise<OrderTickerRow[]> {
  const { data, error } = await client
    .from('orders')
    .select('id, order_number, total, status, created_at')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as OrderTickerRow[];
}

/** `event_name` of analytics events since `sinceIso` (event metric counts). */
export async function listAnalyticsEventNamesSince(
  client: SupabaseClient,
  sinceIso: string
): Promise<AnalyticsEventNameRow[]> {
  const { data, error } = await client
    .from('analytics_events')
    .select('event_name')
    .gte('created_at', sinceIso);

  if (error) throw error;
  return (data ?? []) as unknown as AnalyticsEventNameRow[];
}
