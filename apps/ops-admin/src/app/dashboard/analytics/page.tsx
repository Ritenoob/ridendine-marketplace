import {
  createAdminClient,
  countDriverPresenceByStatus,
  countDriversByStatus,
  countOrdersCreatedBetween,
  countOrdersCreatedSinceWithStatus,
  listPaidOrderRevenueRowsSince,
  type SupabaseClient,
} from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { KpiTile, PageHeader } from '@ridendine/ui';
import { EventMetrics } from './components/event-metrics';
import { TrendCharts } from './components/trend-charts';
import { PlatformMetricsClient } from './components/platform-metrics-client';

export const dynamic = 'force-dynamic';

async function getLiveStats() {
  const supabase = createAdminClient() as unknown as SupabaseClient;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    const [
      totalOrders,
      completedOrders,
      revenueData,
      approvedDrivers,
      onlineDrivers,
    ] = await Promise.all([
      countOrdersCreatedBetween(supabase, thirtyDaysAgo.toISOString()),
      countOrdersCreatedSinceWithStatus(supabase, thirtyDaysAgo.toISOString(), 'delivered'),
      listPaidOrderRevenueRowsSince(supabase, thirtyDaysAgo.toISOString()),
      countDriversByStatus(supabase, 'approved'),
      countDriverPresenceByStatus(supabase, 'online'),
    ]);

    const totalRevenue = revenueData.reduce((sum, order) => sum + (order.total ?? 0), 0);
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    return {
      totalOrders,
      completedOrders,
      totalRevenue,
      completionRate,
      approvedDrivers,
      onlineDrivers,
    };
  } catch {
    return {
      totalOrders: 0, completedOrders: 0, totalRevenue: 0,
      completionRate: 0, approvedDrivers: 0, onlineDrivers: 0,
    };
  }
}

export default async function AnalyticsPage() {
  const stats = await getLiveStats();

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-8">
        <PageHeader
          title="Analytics"
          subtitle="Platform-wide metrics, revenue analysis, and operational reporting."
        />

        {/* 30-day snapshot KPIs (server-rendered) */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-textMuted">
            30-Day Snapshot
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              label="Total Revenue (30d)"
              value={`$${(stats.totalRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              className="border-border bg-surface"
            />
            <KpiTile
              label="Order Volume (30d)"
              value={stats.totalOrders.toLocaleString()}
              className="border-border bg-surface"
            />
            <KpiTile
              label="Completion Rate"
              value={`${stats.completionRate.toFixed(1)}%`}
              className="border-border bg-surface"
            />
            <KpiTile
              label="Drivers Online"
              value={`${stats.onlineDrivers}/${stats.approvedDrivers}`}
              className="border-border bg-surface"
            />
          </div>
        </section>

        {/* Interactive platform metrics with period selector */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-textMuted">
            Platform Metrics
          </h2>
          <PlatformMetricsClient />
        </section>

        {/* Trend charts */}
        <TrendCharts />

        {/* Event metrics */}
        <EventMetrics />

        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-textMuted">
            Platform metrics report live operational counts, financial totals, and historical
            trends. Cohort analysis and deep forecasting are not yet implemented.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
