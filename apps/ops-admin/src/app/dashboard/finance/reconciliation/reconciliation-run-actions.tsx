'use client';

import { useState } from 'react';
import { Button } from '@ridendine/ui';

type ReconciliationSummary = {
  date?: string;
  examined?: number;
  matched?: number;
  unmatched?: number;
  disputed?: number;
  persistFailed?: number;
};

type ReconciliationResponse = {
  success?: boolean;
  data?: ReconciliationSummary;
  error?: string | { message?: string };
};

function getErrorMessage(payload: ReconciliationResponse, fallback: string) {
  if (typeof payload.error === 'string') return payload.error;
  if (payload.error?.message) return payload.error.message;
  return fallback;
}

export function ReconciliationRunActions() {
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [error, setError] = useState('');

  async function runReconciliation() {
    setRunning(true);
    setSummary(null);
    setError('');

    try {
      const response = await fetch('/api/engine/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_daily',
          date: new Date().toISOString().slice(0, 10),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as ReconciliationResponse;
      if (!response.ok || payload.success === false) {
        throw new Error(getErrorMessage(payload, 'Reconciliation failed'));
      }
      setSummary(payload.data ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reconciliation failed');
    } finally {
      setRunning(false);
    }
  }

  const hasDiscrepancies = Boolean((summary?.unmatched ?? 0) + (summary?.disputed ?? 0));

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Daily Reconciliation</h2>
          <p className="mt-1 text-xs text-textMuted">
            Run the Stripe-to-ledger reconciliation job for today.
          </p>
        </div>
        <Button
          size="sm"
          className="bg-primary text-white hover:bg-primaryHover"
          disabled={running}
          onClick={() => void runReconciliation()}
        >
          {running ? 'Running...' : 'Run reconciliation'}
        </Button>
      </div>
      {summary && (
        <p className={hasDiscrepancies ? 'mt-3 text-sm text-warning' : 'mt-3 text-sm text-success'}>
          {hasDiscrepancies
            ? `Reconciliation completed: ${summary.unmatched ?? 0} unmatched, ${summary.disputed ?? 0} disputed.`
            : `Reconciliation clean: zero discrepancies across ${summary.examined ?? 0} examined events.`}
        </p>
      )}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
