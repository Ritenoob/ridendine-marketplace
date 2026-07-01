'use client';

import { useState } from 'react';
import { Button, Modal } from '@ridendine/ui';

type ServiceState = 'open' | 'slow_mode' | 'paused' | 'closed';

const STATES: { value: ServiceState; label: string; activeClass: string }[] = [
  { value: 'open', label: 'Open', activeClass: 'bg-success text-white' },
  { value: 'slow_mode', label: 'Slow mode', activeClass: 'bg-warning text-white' },
  { value: 'paused', label: 'Pause', activeClass: 'bg-danger text-white' },
  { value: 'closed', label: 'Close', activeClass: 'bg-text text-white' },
];

interface DaySummary {
  orders_completed: number;
  gross_sales: number;
  labor_cost: number | null;
  waste_value: number | null;
  prime_cost: number | null;
  avg_prep_minutes: number | null;
  late_tickets: number;
  top_sellers: { name: string; quantity: number }[];
}

function money(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}

export function ServiceControls({ initialState = 'open' }: { initialState?: ServiceState }) {
  const [state, setState] = useState<ServiceState>(initialState);
  const [setting, setSetting] = useState<ServiceState | null>(null);
  const [closing, setClosing] = useState(false);
  const [summary, setSummary] = useState<DaySummary | null>(null);

  const setServiceMode = async (next: ServiceState) => {
    setSetting(next);
    const prev = state;
    setState(next); // optimistic
    try {
      const res = await fetch('/api/kitchen/service-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: next }),
      });
      if (!res.ok) setState(prev);
    } catch {
      setState(prev);
    } finally {
      setSetting(null);
    }
  };

  const closeDay = async () => {
    if (closing) return;
    setClosing(true);
    try {
      const res = await fetch('/api/kitchen/close-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) setSummary((await res.json()).data?.summary ?? null);
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="rounded-xl border border-divider bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-text">Service control</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {STATES.map((s) => (
              <button
                key={s.value}
                onClick={() => setServiceMode(s.value)}
                disabled={setting !== null}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  state === s.value ? s.activeClass : 'bg-surfaceMuted text-textMuted hover:text-text'
                }`}
              >
                {setting === s.value ? '…' : s.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-textMuted">
            Paused and closed stop new customer checkouts. Slow mode keeps you open with a longer wait.
          </p>
        </div>
        <Button variant="outline" onClick={closeDay} disabled={closing}>
          {closing ? 'Closing…' : 'Close day'}
        </Button>
      </div>

      {summary && (
        <Modal isOpen onClose={() => setSummary(null)} title="Close of day" size="md">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Orders" value={String(summary.orders_completed)} />
            <Stat label="Gross sales" value={money(summary.gross_sales)} />
            <Stat label="Labour cost" value={money(summary.labor_cost)} />
            <Stat label="Prime cost" value={money(summary.prime_cost)} />
            <Stat label="Waste value" value={money(summary.waste_value)} />
            <Stat label="Avg prep" value={summary.avg_prep_minutes != null ? `${summary.avg_prep_minutes}m` : '—'} />
            <Stat label="Late tickets" value={String(summary.late_tickets)} />
          </div>
          {summary.top_sellers?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Top sellers</p>
              <p className="mt-1 text-sm text-text">
                {summary.top_sellers.map((t) => `${t.name} (${t.quantity})`).join(', ')}
              </p>
            </div>
          )}
          <p className="mt-3 text-xs text-textMuted">Saved. You can reopen and re-close the day if numbers change.</p>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surfaceMuted p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">{label}</p>
      <p className="mt-1 text-lg font-bold text-text">{value}</p>
    </div>
  );
}
