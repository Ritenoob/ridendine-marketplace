'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@ridendine/ui';
import { formatHourRange } from '@/app/api/analytics/utils';

type Period = 'week' | 'month' | 'year';

interface ComparisonData {
  revenueChange: number | null;
  orderChange: number | null;
  avgOrderValueChange: number | null;
  customersChange: number | null;
  prevRevenue: number;
  prevOrderCount: number;
}

interface AnalyticsPayload {
  period: Period;
  revenue: number;
  orderCount: number;
  avgOrderValue: number;
  uniqueCustomers: number;
  repeatCustomerRate: number;
  cancellationRate: number;
  avgRating: number | null;
  peakHour: number;
  peakHourLabel: string;
  comparison: ComparisonData;
  hourlyOrders: Array<{ hour: number; count: number }>;
  dailyRevenue: Array<{ date: string; revenue: number }>;
  topItems: Array<{ name: string; count: number; revenue: number }>;
}

function ChangeIndicator({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-gray-400">N/A vs prev</span>;
  const isPositive = value > 0;
  const isNeutral = value === 0;
  if (isNeutral) return <span className="text-xs text-gray-400">0% vs prev</span>;
  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
      {isPositive ? '▲' : '▼'} {Math.abs(value).toFixed(1)}% vs prev
    </span>
  );
}

function MetricCard({
  label,
  value,
  sub,
  change,
}: {
  label: string;
  value: string;
  sub?: string;
  change?: number | null;
}) {
  return (
    <Card>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-sm text-gray-400">{sub}</p>}
      {change !== undefined && (
        <div className="mt-1">
          <ChangeIndicator value={change} />
        </div>
      )}
    </Card>
  );
}

function BarChart({
  bars,
  color,
  highlightIndex,
}: {
  bars: Array<{ height: number; label: string; isHighlight?: boolean }>;
  color: string;
  highlightIndex?: number;
}) {
  const max = Math.max(...bars.map((b) => b.height), 1);
  return (
    <div className="h-48 flex items-end gap-0.5">
      {bars.map((bar, i) => (
        <div
          key={i}
          className={`flex-1 rounded-t transition-opacity ${
            highlightIndex !== undefined && i === highlightIndex
              ? 'opacity-100 ring-2 ring-offset-1 ring-current'
              : 'opacity-70 hover:opacity-100'
          }`}
          style={{
            height: `${(bar.height / max) * 100}%`,
            minHeight: '2px',
            backgroundColor: color,
          }}
          title={bar.label}
        />
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<Period>('month');

  const fetchAnalytics = useCallback(async (p: Period) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/analytics?period=${p}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  if (loading) return <AnalyticsSkeleton />;

  if (error || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-gray-500">Unable to load analytics. Please try again.</p>
      </div>
    );
  }

  const dailyBars = data.dailyRevenue.map((d) => ({
    height: d.revenue,
    label: `${d.date}: $${d.revenue.toFixed(2)}`,
  }));

  const hourlyBars = data.hourlyOrders.map((h) => ({
    height: h.count,
    label: `${h.hour}:00 — ${h.count} orders`,
    isHighlight: h.hour === data.peakHour,
  }));

  return (
    <div className="space-y-6">
      <PageHeader period={period} onPeriodChange={setPeriod} />

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Revenue"
          value={`$${data.revenue.toFixed(2)}`}
          sub={`${data.orderCount} orders`}
          change={data.comparison.revenueChange}
        />
        <MetricCard
          label="Avg Order Value"
          value={`$${data.avgOrderValue.toFixed(2)}`}
          sub="per order"
          change={data.comparison.avgOrderValueChange}
        />
        <MetricCard
          label="Customers Served"
          value={String(data.uniqueCustomers)}
          sub={`${data.repeatCustomerRate.toFixed(0)}% repeat`}
          change={data.comparison.customersChange}
        />
        <MetricCard
          label="Avg Rating"
          value={data.avgRating !== null ? `${data.avgRating.toFixed(1)} ★` : 'No reviews'}
          sub={`${data.cancellationRate.toFixed(1)}% cancel rate`}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold text-gray-900">
            Revenue — Last {period === 'week' ? '7' : period === 'month' ? '30' : '365'} Days
          </h3>
          <div className="mt-4">
            <BarChart bars={dailyBars} color="#E85D26" />
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>{period === 'week' ? '7 days ago' : period === 'month' ? '30 days ago' : '1 year ago'}</span>
            <span>Today</span>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-900">Orders by Hour</h3>
          {data.peakHourLabel && (
            <p className="mt-1 text-sm text-gray-500">
              Your busiest time: <span className="font-medium text-gray-800">{data.peakHourLabel}</span>
            </p>
          )}
          <div className="mt-4">
            <BarChart
              bars={hourlyBars}
              color="#3B82F6"
              highlightIndex={data.peakHour}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
            <span>11 PM</span>
          </div>
        </Card>
      </div>

      {/* Top Items */}
      <Card>
        <h3 className="font-semibold text-gray-900">Top Selling Items</h3>
        {data.topItems.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No orders yet this period</p>
        ) : (
          <div className="mt-4 space-y-3">
            {data.topItems.map((item, index) => (
              <div key={item.name} className="flex items-center gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-[#E85D26]">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.count} sold &bull; ${item.revenue.toFixed(2)} revenue
                  </p>
                </div>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E85D26]"
                    style={{ width: `${(item.count / (data.topItems[0]?.count || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function PageHeader({
  period,
  onPeriodChange,
}: {
  period: Period;
  onPeriodChange: (p: Period) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-gray-500">Track your performance and revenue</p>
      </div>
      <div className="flex gap-2">
        {(['week', 'month', 'year'] as const).map((p) => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? 'bg-[#E85D26] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="mt-2 h-8 w-16 bg-gray-200 rounded" />
          </Card>
        ))}
      </div>
    </div>
  );
}

// Re-export for use in tests and other modules
export { formatHourRange };
