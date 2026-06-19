import type { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

const PERIODS = 8;

interface OrderRow {
  total: number | null;
  created_at: string;
  customer_id: string | null;
}

interface Bucket {
  start: Date;
  end: Date;
  label: string;
}

function buildWeeklyBuckets(now: Date): Bucket[] {
  const buckets: Bucket[] = [];
  for (let i = PERIODS - 1; i >= 0; i--) {
    const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const label =
      i === 0 ? 'This week' : i === 1 ? 'Last week' : `${i}w ago`;
    buckets.push({ start, end, label });
  }
  return buckets;
}

function buildMonthlyBuckets(now: Date): Bucket[] {
  const buckets: Bucket[] = [];
  for (let i = PERIODS - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const label =
      i === 0
        ? 'This month'
        : start.toLocaleString('default', { month: 'short' });
    buckets.push({ start, end, label });
  }
  return buckets;
}

function pct(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export async function GET(request: NextRequest) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const { searchParams } = new URL(request.url);
    const rawWindow = searchParams.get('window');
    const window = rawWindow === 'months' ? 'months' : 'weeks';

    const { storefrontId } = chefContext;
    const adminClient = createAdminClient();
    const now = new Date();

    const buckets = window === 'weeks' ? buildWeeklyBuckets(now) : buildMonthlyBuckets(now);
    const rangeStart = buckets[0]!.start;

    const { data: orders } = await adminClient
      .from('orders')
      .select('total, created_at, customer_id')
      .eq('storefront_id', storefrontId)
      .in('status', ['delivered', 'completed'])
      .gte('created_at', rangeStart.toISOString());

    const rows = (orders ?? []) as OrderRow[];

    // Bucket the orders
    const periods = buckets.map((bucket) => {
      const bucketOrders = rows.filter((o) => {
        const d = new Date(o.created_at);
        return d >= bucket.start && d <= bucket.end;
      });
      const revenue = bucketOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const orderCount = bucketOrders.length;
      const uniqueCustomers = new Set(
        bucketOrders.map((o) => o.customer_id).filter(Boolean)
      ).size;
      return { label: bucket.label, revenue, orderCount, uniqueCustomers };
    });

    const current = periods[PERIODS - 1]!;
    const previous = periods[PERIODS - 2]!;
    const revenueGrowth = pct(current.revenue, previous.revenue);
    const orderGrowth = pct(current.orderCount, previous.orderCount);

    // Project current period to full length
    let projectedRevenue: number | null = null;
    if (window === 'weeks') {
      const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
      projectedRevenue = dayOfWeek > 0 ? (current.revenue / dayOfWeek) * 7 : null;
    } else {
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      projectedRevenue = dayOfMonth > 0 ? (current.revenue / dayOfMonth) * daysInMonth : null;
    }

    // Best period
    const bestPeriod = periods.reduce(
      (best, p) => (p.revenue > best.revenue ? p : best),
      periods[0]!
    );

    return successResponse({
      window,
      periods,
      revenueGrowth,
      orderGrowth,
      projectedRevenue,
      currentRevenue: current.revenue,
      previousRevenue: previous.revenue,
      currentOrders: current.orderCount,
      previousOrders: previous.orderCount,
      bestPeriodLabel: bestPeriod.label,
      bestPeriodRevenue: bestPeriod.revenue,
    });
  } catch (err) {
    console.error('Error fetching growth:', err);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
