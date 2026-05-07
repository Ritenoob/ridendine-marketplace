'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@ridendine/ui';
import { formatCents, formatNumber, type AnalyticsPeriod } from '@/lib/analytics';
import { KpiCard } from './kpi-card';
import { OrdersByStatus } from './orders-by-status';

type Period = AnalyticsPeriod;

interface AnalyticsData {
  period: Period;
  gmv: number;
  totalOrders: number;
  avgOrderValue: number;
  platformRevenue: number;
  ordersByStatus: Record<string, number>;
  uniqueCustomers: number;
  activeChefs: number;
  activeDrivers: number;
  avgDeliveryMinutes: number | null;
  changes: {
    gmv: number;
    totalOrders: number;
    avgOrderValue: number;
    platformRevenue: number;
  };
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
};

function PeriodSelector({
  period,
  onSelect,
}: {
  period: Period;
  onSelect: (p: Period) => void;
}) {
  return (
    <div className="flex gap-1">
      {(['today', 'week', 'month', 'year'] as const).map((p) => (
        <button
          key={p}
          onClick={() => onSelect(p)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            period === p
              ? 'bg-[#E85D26] text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-gray-800 bg-opsPanel p-4 animate-pulse">
      <div className="h-3 w-24 bg-gray-700 rounded mb-3" />
      <div className="h-7 w-16 bg-gray-700 rounded mb-2" />
      <div className="h-3 w-12 bg-gray-700 rounded" />
    </div>
  );
}

function OperationalStats({ data }: { data: AnalyticsData }) {
  return (
    <Card className="border-gray-800 bg-opsPanel p-6">
      <h3 className="text-base font-semibold text-white mb-4">Operational Stats</h3>
      <dl className="space-y-3">
        <div className="flex justify-between text-sm">
          <dt className="text-gray-400">Unique Customers</dt>
          <dd className="font-medium text-white">{formatNumber(data.uniqueCustomers)}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-400">Active Chefs</dt>
          <dd className="font-medium text-white">{formatNumber(data.activeChefs)}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-400">Active Drivers</dt>
          <dd className="font-medium text-white">{formatNumber(data.activeDrivers)}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-400">Avg Delivery Time</dt>
          <dd className="font-medium text-white">
            {data.avgDeliveryMinutes != null
              ? `${data.avgDeliveryMinutes} min`
              : '—'}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

export function PlatformMetricsClient() {
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics?period=${p}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Unknown error');
      setData(json.data as AnalyticsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">Platform-wide metrics for the selected period.</p>
        <PeriodSelector period={period} onSelect={setPeriod} />
      </div>

      {/* KPI Row */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-400">
          {error}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="GMV"
              value={formatCents(data.gmv)}
              change={data.changes.gmv}
              subtitle="vs previous period"
            />
            <KpiCard
              label="Total Orders"
              value={formatNumber(data.totalOrders)}
              change={data.changes.totalOrders}
            />
            <KpiCard
              label="Avg Order Value"
              value={formatCents(data.avgOrderValue)}
              change={data.changes.avgOrderValue}
            />
            <KpiCard
              label="Platform Revenue"
              value={formatCents(data.platformRevenue)}
              change={data.changes.platformRevenue}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <OrdersByStatus
              ordersByStatus={data.ordersByStatus}
              totalOrders={data.totalOrders}
            />
            <OperationalStats data={data} />
          </div>
        </>
      ) : null}
    </div>
  );
}
