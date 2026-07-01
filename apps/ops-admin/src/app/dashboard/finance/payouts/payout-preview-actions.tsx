'use client';

import { useState } from 'react';
import { Button } from '@ridendine/ui';

type PreviewType = 'chef' | 'driver';

type PreviewLine = {
  amountCents?: number;
};

type PreviewResponse = {
  success?: boolean;
  data?: {
    type?: PreviewType;
    lines?: PreviewLine[];
    currency?: string;
  };
  error?: string | { message?: string };
};

function getErrorMessage(payload: PreviewResponse, fallback: string) {
  if (typeof payload.error === 'string') return payload.error;
  if (payload.error?.message) return payload.error.message;
  return fallback;
}

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

export function PayoutPreviewActions() {
  const [running, setRunning] = useState<PreviewType | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function runPreview(type: PreviewType) {
    setRunning(type);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/engine/payouts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const payload = (await response.json().catch(() => ({}))) as PreviewResponse;
      if (!response.ok || payload.success === false) {
        throw new Error(getErrorMessage(payload, 'Payout preview failed'));
      }

      const lines = payload.data?.lines ?? [];
      const currency = payload.data?.currency ?? 'CAD';
      const totalCents = lines.reduce((sum, line) => sum + (line.amountCents ?? 0), 0);
      setMessage(
        `${type === 'chef' ? 'Chef' : 'Driver'} payout preview: ${lines.length} lines, total ${formatCents(totalCents, currency)}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payout preview failed');
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Payout Preview</h2>
          <p className="mt-1 text-xs text-textMuted">
            Calculate current chef or driver payable lines before executing a run.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="bg-primary text-white hover:bg-primaryHover"
            disabled={running !== null}
            onClick={() => void runPreview('chef')}
          >
            {running === 'chef' ? 'Previewing...' : 'Run preview'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={running !== null}
            onClick={() => void runPreview('driver')}
          >
            Driver preview
          </Button>
        </div>
      </div>
      {message && <p className="mt-3 text-sm text-success">{message}</p>}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
