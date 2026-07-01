'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Spinner } from '@ridendine/ui';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface CostsOverview {
  today: string;
  orderCount: number;
  sales: number;
  foodCost: number | null;
  packagingCost: number | null;
  laborCost: number | null;
  wasteValue: number | null;
  primeCost: number | null;
  foodCostPct: number | null;
  laborCostPct: number | null;
  primeCostPct: number | null;
  contributionMargin: number | null;
  laborHours: number;
  setup: { foodCostAvailable: boolean; laborTracked: boolean };
}

function money(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}
function pct(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function Tile({ label, value, sub, tone = 'default' }: { label: string; value: string; sub?: string; tone?: 'default' | 'warning' | 'success' }) {
  const valueClass = tone === 'warning' ? 'text-warning' : tone === 'success' ? 'text-success' : 'text-text';
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${valueClass}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-textMuted">{sub}</p> : null}
    </Card>
  );
}

export default function CostsPage() {
  const [data, setData] = useState<CostsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/costs/overview');
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      setData(json.data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Costs &amp; Profitability</h1>
          <p className="mt-1 text-sm text-textMuted">Today&apos;s sales, labour, waste and prime cost. Numbers appear as the data exists — nothing is estimated.</p>
        </div>
        <button
          onClick={fetchData}
          aria-label="Refresh costs"
          className="flex items-center gap-2 rounded-lg bg-surfaceMuted px-3 py-2 text-sm font-medium text-textMuted transition-colors hover:text-text"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-warningSoft px-4 py-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Couldn&apos;t load costs — try refreshing.
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Sales today" value={money(data.sales)} sub={`${data.orderCount} orders`} tone="success" />
            <Tile label="Labour cost" value={money(data.laborCost)} sub={`${data.laborHours}h worked`} />
            <Tile label="Labour %" value={pct(data.laborCostPct)} tone={data.laborCostPct !== null && data.laborCostPct > 0.35 ? 'warning' : 'default'} />
            <Tile label="Waste value" value={money(data.wasteValue)} tone={data.wasteValue && data.wasteValue > 0 ? 'warning' : 'default'} />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Prime cost" value={money(data.primeCost)} sub="food + labour" />
            <Tile label="Prime cost %" value={pct(data.primeCostPct)} />
            <Tile label="Contribution margin" value={money(data.contributionMargin)} />
            <Tile label="Food cost %" value={pct(data.foodCostPct)} />
          </div>

          {!data.setup.foodCostAvailable && (
            <Card className="border-dashed">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
                <div>
                  <p className="font-semibold text-text">Food cost needs recipes</p>
                  <p className="mt-1 text-sm text-textMuted">
                    Attach recipes to your menu items to see food cost, food‑cost %, and true prime cost.
                    Until then, prime cost reflects labour only.
                  </p>
                  <a href="/dashboard/menu" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
                    Go to Menu →
                  </a>
                </div>
              </div>
            </Card>
          )}

          {!data.setup.laborTracked && (
            <Card className="border-dashed">
              <p className="font-semibold text-text">No labour tracked today</p>
              <p className="mt-1 text-sm text-textMuted">
                Clock staff in from the Labour section to see labour cost and prime cost.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
