'use client';

import { formatCurrency } from '@ridendine/utils';
import { AlertTriangle, Clock, Flame } from 'lucide-react';
import type { ServiceMetrics } from '@/lib/kitchen';

// ---------------------------------------------------------------------------
// Kitchen Command header (Stage 2)
//
// Single glanceable strip answering: am I open / overloaded? what needs
// attention? what's late? what sold out? what did I make today? Food/labour/
// prime cost are shown as honest "needs setup" cards — never fabricated —
// until recipes (Stage 6) and labour (Stage 10) exist.
// ---------------------------------------------------------------------------

type LoadLevel = 'idle' | 'steady' | 'busy' | 'slammed';

interface KitchenLoad {
  activeCount: number;
  outstandingPrepMinutes: number;
  capacity: number;
  level: LoadLevel;
}

const LEVEL_CONFIG: Record<LoadLevel, { label: string; badge: string; dot: string }> = {
  idle: { label: 'Idle', badge: 'bg-surfaceMuted text-textMuted', dot: 'bg-textSubtle' },
  steady: { label: 'Steady', badge: 'bg-successSoft text-success', dot: 'bg-success' },
  busy: { label: 'Busy', badge: 'bg-warningSoft text-warning', dot: 'bg-warning' },
  slammed: { label: 'Slammed', badge: 'bg-dangerSoft text-danger', dot: 'bg-danger' },
};

function MetricTile({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-danger/40 bg-dangerSoft'
      : tone === 'warning'
        ? 'border-warning/40 bg-warningSoft'
        : tone === 'success'
          ? 'border-success/40 bg-successSoft'
          : 'border-divider bg-white';
  const valueClass =
    tone === 'danger'
      ? 'text-danger'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'success'
          ? 'text-success'
          : 'text-text';
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${valueClass}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-textMuted">{sub}</p> : null}
    </div>
  );
}

function NeedsSetupCard({
  label,
  href,
  cta,
  reason,
}: {
  label: string;
  href: string;
  cta: string;
  reason: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-borderStrong bg-surfaceMuted p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">{label}</p>
      <p className="mt-1 text-sm font-medium text-textMuted">Needs setup</p>
      <p className="mt-1 text-xs text-textSubtle">{reason}</p>
      <a href={href} className="mt-2 inline-block text-xs font-semibold text-primary hover:underline">
        {cta}
      </a>
    </div>
  );
}

export function KitchenCommandHeader({
  metrics,
  load,
}: {
  metrics: ServiceMetrics;
  load: KitchenLoad;
}) {
  const level = LEVEL_CONFIG[load.level];
  const fillPct =
    load.capacity > 0 ? Math.min(100, Math.round((load.activeCount / load.capacity) * 100)) : 0;
  const estWaitMin = load.outstandingPrepMinutes;
  const blockers = [...metrics.soldOutItems, ...metrics.atLimitItems];

  return (
    <div className="space-y-4">
      {/* Status + capacity bar */}
      <div className="rounded-xl border border-divider bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Flame className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-bold text-text">Service load</h2>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${level.badge}`}
                >
                  <span className={`h-2 w-2 rounded-full ${level.dot}`} />
                  {level.label}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-surfaceMuted">
                    <div className={`h-full rounded-full ${level.dot}`} style={{ width: `${fillPct}%` }} />
                  </div>
                  <span className="whitespace-nowrap text-xs text-textMuted">
                    {load.activeCount}/{load.capacity} orders
                  </span>
                </div>
              </div>
            </div>
          </div>
          {estWaitMin > 0 ? (
            <span className="flex items-center gap-1.5 self-start rounded-lg bg-surfaceMuted px-3 py-2 text-sm text-textMuted">
              <Clock className="h-4 w-4" />~{estWaitMin} min of prep queued
            </span>
          ) : null}
        </div>
      </div>

      {/* Live attention metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricTile label="New" value={metrics.newWaiting} tone={metrics.newWaiting > 0 ? 'warning' : 'default'} sub="awaiting accept" />
        <MetricTile label="In prep" value={metrics.inPrep} />
        <MetricTile label="Ready" value={metrics.ready} tone={metrics.ready > 0 ? 'success' : 'default'} sub="for pickup" />
        <MetricTile label="Late" value={metrics.late} tone={metrics.late > 0 ? 'danger' : 'default'} />
        <MetricTile
          label="Avg prep"
          value={metrics.avgPrepMinutes != null ? `${metrics.avgPrepMinutes}m` : '—'}
          sub="today, actual"
        />
        <MetricTile label="Active" value={metrics.activeCount} />
      </div>

      {/* Today's business + blockers + honest cost placeholders */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Sales today"
          value={formatCurrency(metrics.salesToday)}
          sub={`${metrics.completedToday} completed`}
          tone="success"
        />

        <div className="rounded-xl border border-divider bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Stock blockers</p>
          {blockers.length === 0 ? (
            <p className="mt-1 text-sm text-textMuted">Nothing 86&apos;d</p>
          ) : (
            <div className="mt-1 flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
              <p className="text-sm text-text">
                <span className="font-bold">{blockers.length}</span> item
                {blockers.length === 1 ? '' : 's'}:{' '}
                <span className="text-textMuted">{blockers.slice(0, 3).join(', ')}</span>
                {blockers.length > 3 ? ` +${blockers.length - 3}` : ''}
              </p>
            </div>
          )}
        </div>

        <NeedsSetupCard
          label="Food cost"
          href="/dashboard/menu"
          cta="Add recipes →"
          reason="Attach recipes to menu items to track food cost & margin."
        />
        <NeedsSetupCard
          label="Labour / prime cost"
          href="/dashboard/settings"
          cta="Set up labour →"
          reason="Track staff time to see labour % and prime cost."
        />
      </div>
    </div>
  );
}
