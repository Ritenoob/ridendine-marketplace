import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { getOpsActorContext, guardPlatformApi } from '@/lib/engine';
import {
  getPeriodDates,
  getPreviousPeriodDates,
  buildOrdersByStatus,
  calcPercentChange,
  resolvePeriod,
  type AnalyticsPeriod,
} from '@/lib/analytics';

export const dynamic = 'force-dynamic';

interface OrderRow {
  id: string;
  total: number;
  service_fee: number | null;
  status: string;
  customer_id: string;
  created_at: string;
}

interface DeliveryRow {
  created_at: string;
  actual_dropoff_at: string | null;
}

function sumField<T>(rows: T[], key: keyof T): number {
  return rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
}

function calcAvgDeliveryMinutes(deliveries: DeliveryRow[]): number | null {
  const durations = deliveries
    .map((d) => {
      if (!d.actual_dropoff_at) return null;
      const mins =
        (new Date(d.actual_dropoff_at).getTime() - new Date(d.created_at).getTime()) / 60000;
      return Number.isFinite(mins) && mins > 0 ? mins : null;
    })
    .filter((v): v is number => v !== null);

  if (durations.length === 0) return null;
  return Math.round(durations.reduce((s, v) => s + v, 0) / durations.length);
}

async function fetchOrders(client: ReturnType<typeof createAdminClient>, start: Date, end: Date) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('orders')
    .select('id, total, service_fee, status, customer_id, created_at')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());
  return (data ?? []) as OrderRow[];
}

async function fetchActiveChefs(client: ReturnType<typeof createAdminClient>, start: Date, end: Date) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (client as any)
    .from('chef_storefronts')
    .select('id', { count: 'exact', head: true })
    .gte('updated_at', start.toISOString())
    .lte('updated_at', end.toISOString());
  return count ?? 0;
}

async function fetchActiveDrivers(client: ReturnType<typeof createAdminClient>, start: Date, end: Date) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (client as any)
    .from('drivers')
    .select('id', { count: 'exact', head: true })
    .gte('updated_at', start.toISOString())
    .lte('updated_at', end.toISOString());
  return count ?? 0;
}

async function fetchDeliveries(client: ReturnType<typeof createAdminClient>, start: Date, end: Date) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('deliveries')
    .select('created_at, actual_dropoff_at')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());
  return (data ?? []) as DeliveryRow[];
}

function buildMetrics(orders: OrderRow[], period: AnalyticsPeriod) {
  const gmv = sumField(orders, 'total');
  const platformRevenue = sumField(orders, 'service_fee');
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(gmv / totalOrders) : 0;
  const ordersByStatus = buildOrdersByStatus(orders);
  const uniqueCustomers = new Set(orders.map((o) => o.customer_id)).size;

  return { gmv, platformRevenue, totalOrders, avgOrderValue, ordersByStatus, uniqueCustomers, period };
}

export async function GET(request: NextRequest) {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'analytics_read' as never);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const period = resolvePeriod(searchParams.get('period'));
  const { start, end } = getPeriodDates(period);
  const prev = getPreviousPeriodDates(period);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createAdminClient() as any;

  const [orders, prevOrders, activeChefs, activeDrivers, deliveries] = await Promise.all([
    fetchOrders(client, start, end),
    fetchOrders(client, prev.start, prev.end),
    fetchActiveChefs(client, start, end),
    fetchActiveDrivers(client, start, end),
    fetchDeliveries(client, start, end),
  ]);

  const metrics = buildMetrics(orders, period);
  const prevMetrics = buildMetrics(prevOrders, period);

  const changes = {
    gmv: calcPercentChange(metrics.gmv, prevMetrics.gmv),
    totalOrders: calcPercentChange(metrics.totalOrders, prevMetrics.totalOrders),
    avgOrderValue: calcPercentChange(metrics.avgOrderValue, prevMetrics.avgOrderValue),
    platformRevenue: calcPercentChange(metrics.platformRevenue, prevMetrics.platformRevenue),
  };

  const avgDeliveryMinutes = calcAvgDeliveryMinutes(deliveries);

  return NextResponse.json({
    success: true,
    data: {
      ...metrics,
      activeChefs,
      activeDrivers,
      avgDeliveryMinutes,
      changes,
    },
  });
}
