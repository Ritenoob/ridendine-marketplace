'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@ridendine/ui';
import type { Driver } from '@ridendine/db';
import { NotificationPreferences } from '@/components/settings/notification-preferences';

type Props = {
  driver: Driver;
  balanceCents: number;
  currency?: string;
};

function normalizeCurrency(currency: string): string {
  const normalized = currency.trim().toUpperCase();
  if (!normalized) return 'CAD';

  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency: normalized }).format(0);
    return normalized;
  } catch {
    return 'CAD';
  }
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
  }).format(amount);
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border border-divider bg-surface p-4 shadow-sm">
      <p className="text-[12px] font-semibold uppercase text-textMuted">{label}</p>
      <p className="mt-2 text-xl font-bold text-text">{value}</p>
      <p className="mt-1 text-[13px] text-textMuted">{detail}</p>
    </Card>
  );
}

export default function SettingsClient({ driver, balanceCents, currency = 'CAD' }: Props) {
  const router = useRouter();
  const displayCurrency = normalizeCurrency(currency);
  const [enabled, setEnabled] = useState(
    Boolean((driver as { instant_payouts_enabled?: boolean }).instant_payouts_enabled)
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const balance = formatMoney(balanceCents / 100, displayCurrency);
  const payoutState = enabled ? 'Available' : 'Off';

  async function saveToggle(next: boolean) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/driver', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instant_payouts_enabled: next }),
      });
      if (!res.ok) throw new Error('update failed');
      setEnabled(next);
      router.refresh();
    } catch {
      setMessage('Could not update preference. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-primary">
          Driver controls
        </p>
        <h1 className="mt-1 text-2xl font-bold text-text">Driver settings command center</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-textMuted">
          Payout controls, notification delivery, and account preferences for active driver work.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Payable balance"
          value={balance}
          detail={`Ledger currency ${displayCurrency}`}
        />
        <SummaryCard
          label="Instant payouts"
          value={payoutState}
          detail={enabled ? 'On-demand requests enabled' : 'On-demand requests disabled'}
        />
        <SummaryCard
          label="Notification sync"
          value="DB-backed"
          detail="Preferences sync with this account"
        />
        <SummaryCard
          label="Account controls"
          value={driver.status ? String(driver.status) : 'Driver'}
          detail={driver.email || 'Driver email unavailable'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <Card className="border border-divider bg-surface p-5 shadow-sm">
            <h2 className="text-[17px] font-semibold text-text">Payout balance</h2>
            <p className="mt-1 text-sm text-textMuted">
              Ledger-derived balance available before pending holds and instant payout requests.
            </p>
            <div className="mt-4 rounded-lg bg-surfaceMuted p-4">
              <p className="text-[13px] font-medium text-textMuted">Available driver payable balance</p>
              <p className="mt-2 text-[32px] font-bold text-success">{balance}</p>
              <p className="mt-1 text-[13px] text-textMuted">Ledger currency: {displayCurrency}</p>
            </div>
          </Card>

          <Card className="border border-divider bg-surface p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[17px] font-semibold text-text">Instant payout access</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-textMuted">
                  When enabled, you can request an on-demand payout from Earnings. Ridendine
                  charges a <span className="font-semibold text-text">1.5%</span> fee on each
                  instant payout; the fee is recorded on your ledger before funds move.
                </p>
              </div>
              <Button
                type="button"
                variant={enabled ? 'secondary' : 'default'}
                disabled={saving}
                onClick={() => void saveToggle(!enabled)}
              >
                {saving ? 'Saving...' : enabled ? 'Turn off' : 'Turn on'}
              </Button>
            </div>
            {message ? <p className="mt-3 text-sm text-danger">{message}</p> : null}
          </Card>

          <Link
            href="/earnings"
            className="flex items-center justify-between rounded-lg border border-divider bg-surface px-4 py-3 text-[15px] font-semibold text-text shadow-sm hover:border-primary/30"
          >
            <span>Open earnings</span>
            <span className="text-primary">Review payouts</span>
          </Link>
        </div>

        <Card className="border border-divider bg-surface p-5 shadow-sm">
          <h2 className="text-[17px] font-semibold text-text">Notification delivery</h2>
          <p className="mt-1 text-sm text-textMuted">
            Control which driver events can reach you by email or SMS.
          </p>
          <NotificationPreferences />
        </Card>
      </div>
    </div>
  );
}
