import { type NextRequest, NextResponse } from 'next/server';
import {
  createAdminClient,
  countDriversUpdatedBetween,
  countStorefrontsUpdatedBetween,
  listDeliveryDurationRowsBetween,
  listOrderAnalyticsRows,
  type AnalyticsOrderRow,
  type DeliveryDurationRow,
  type SupabaseClient,
} from '@ridendine/db';
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

function sumField<T>(rows: T[], key: keyof T): number {
  return rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
}

function calcAvgDeliveryMinutes(deliveries: DeliveryDurationRow[]): number | null {
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

function buildMetrics(orders: AnalyticsOrderRow[], period: AnalyticsPeriod) {
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

  const client = createAdminClient() as unknown as SupabaseClient;

  const [orders, prevOrders, activeChefs, activeDrivers, deliveries] = await Promise.all([
    listOrderAnalyticsRows(client, start.toISOString(), end.toISOString()),
    listOrderAnalyticsRows(client, prev.start.toISOString(), prev.end.toISOString()),
    countStorefrontsUpdatedBetween(client, start.toISOString(), end.toISOString()),
    countDriversUpdatedBetween(client, start.toISOString(), end.toISOString()),
    listDeliveryDurationRowsBetween(client, start.toISOString(), end.toISOString()),
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
