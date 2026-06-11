'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, Badge, Button } from '@ridendine/ui';
import type { Delivery } from '@ridendine/db';
import { formatCurrency } from '@ridendine/utils';

interface EarningsViewProps {
  deliveries: Delivery[];
  /** Ledger-derived driver_payable balance (cents). */
  availableBalanceCents?: number;
  currency?: string;
  instantPayoutsEnabled?: boolean;
  pendingInstantPayoutRequests?: PendingInstantPayoutRequest[];
  payoutAccountStatus?: PayoutAccountStatus;
}

type DeliveryWithEarningDetails = Delivery & {
  base_amount?: number | null;
  baseAmount?: number | null;
  base_delivery_pay?: number | null;
  baseDeliveryPay?: number | null;
  tip_amount?: number | null;
  tipAmount?: number | null;
  bonus_amount?: number | null;
  bonusAmount?: number | null;
  adjustment_amount?: number | null;
  adjustmentAmount?: number | null;
  adjustment_cents?: number | null;
  orders?: { tip?: number | null } | null;
};

type PendingInstantPayoutRequest = {
  id: string;
  amountCents: number;
  feeCents: number;
  status: string;
  requestedAt: string | null;
};

type PayoutAccountStatus = {
  connected: boolean;
  status: string;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  onboardingCompletedAt: string | null;
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

function centsToMajor(cents: number): number {
  return cents / 100;
}

function getNumericField(delivery: DeliveryWithEarningDetails, fields: Array<keyof DeliveryWithEarningDetails>) {
  for (const field of fields) {
    const value = delivery[field];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return 0;
}

function getEarningsBreakdown(deliveries: Delivery[]) {
  return deliveries.reduce(
    (breakdown, delivery) => {
      const detailed = delivery as DeliveryWithEarningDetails;
      const tip = getNumericField(detailed, ['tip_amount', 'tipAmount']) + (detailed.orders?.tip ?? 0);
      const bonus = getNumericField(detailed, ['bonus_amount', 'bonusAmount']);
      const adjustment =
        getNumericField(detailed, ['adjustment_amount', 'adjustmentAmount']) +
        centsToMajor(getNumericField(detailed, ['adjustment_cents']));
      const explicitBase = getNumericField(detailed, [
        'base_amount',
        'baseAmount',
        'base_delivery_pay',
        'baseDeliveryPay',
      ]);
      const base = explicitBase || Math.max(delivery.driver_payout - tip - bonus - adjustment, 0);

      return {
        base: breakdown.base + base,
        tips: breakdown.tips + tip,
        bonuses: breakdown.bonuses + bonus,
        adjustments: breakdown.adjustments + adjustment,
      };
    },
    { base: 0, tips: 0, bonuses: 0, adjustments: 0 }
  );
}

function getWeeklyEarnings(deliveries: Delivery[]) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyData = days.map((day, index) => ({ day, amount: 0, deliveries: 0, dayIndex: index }));

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  deliveries.forEach((delivery) => {
    if (!delivery.actual_dropoff_at) return;

    const deliveryDate = new Date(delivery.actual_dropoff_at);
    if (deliveryDate >= startOfWeek && deliveryDate <= today) {
      const dayIndex = deliveryDate.getDay();
      const dayData = weeklyData[dayIndex];
      if (dayData) {
        dayData.amount += delivery.driver_payout;
        dayData.deliveries += 1;
      }
    }
  });

  return weeklyData;
}

function getTodayDeliveries(deliveries: Delivery[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return deliveries.filter((delivery) => {
    if (!delivery.actual_dropoff_at) return false;
    const deliveryDate = new Date(delivery.actual_dropoff_at);
    return deliveryDate >= today;
  });
}

function instantFeeCents(amountCents: number): number {
  return Math.round((amountCents * 150) / 10_000);
}

function getPendingHoldCents(requests: PendingInstantPayoutRequest[]): number {
  return requests.reduce((sum, request) => sum + request.amountCents + request.feeCents, 0);
}

function formatStatusText(status: string) {
  return status
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function FinanceMetric({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'default' | 'success' | 'warning';
}) {
  const valueClass =
    tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-text';

  return (
    <div className="rounded-xl border border-divider bg-surfaceMuted px-4 py-3">
      <p className="text-xs font-medium text-textMuted">{label}</p>
      <p className={`mt-1 text-lg font-bold ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-textSubtle">{detail}</p>
    </div>
  );
}

export default function EarningsView({
  deliveries,
  availableBalanceCents = 0,
  currency = 'CAD',
  instantPayoutsEnabled = false,
  pendingInstantPayoutRequests = [],
  payoutAccountStatus = {
    connected: false,
    status: 'not_started',
    payoutsEnabled: false,
    chargesEnabled: false,
    onboardingCompletedAt: null,
  },
}: EarningsViewProps) {
  const displayCurrency = normalizeCurrency(currency);
  // Delivery payout amounts are dollars; *Cents props are divided by 100 at
  // call sites. en-US locale is intentional (renders "CA$" for CAD).
  const formatMoney = (amount: number) => formatCurrency(amount, displayCurrency, 'en-US');
  const weeklyEarnings = getWeeklyEarnings(deliveries);
  const todayDeliveries = getTodayDeliveries(deliveries);
  const breakdown = getEarningsBreakdown(deliveries);
  const pendingInstantPayoutTotalCents = pendingInstantPayoutRequests.reduce(
    (sum, request) => sum + request.amountCents,
    0
  );
  const pendingInstantPayoutHoldCents = getPendingHoldCents(pendingInstantPayoutRequests);
  const netAvailableCents = Math.max(0, availableBalanceCents - pendingInstantPayoutHoldCents);

  const totalWeek = weeklyEarnings.reduce((sum, d) => sum + d.amount, 0);
  const totalDeliveries = weeklyEarnings.reduce((sum, d) => sum + d.deliveries, 0);
  const maxAmount = Math.max(...weeklyEarnings.map((d) => d.amount), 1);
  const totalDistance = deliveries.reduce((sum, delivery) => sum + (delivery.distance_km ?? 0), 0);
  const averageDeliveryPay = totalDeliveries > 0 ? totalWeek / totalDeliveries : 0;
  const payoutReady = payoutAccountStatus.connected && payoutAccountStatus.payoutsEnabled;
  const payoutStatusLabel = payoutAccountStatus.connected
    ? `Your payout account is ${payoutAccountStatus.status}.`
    : 'Set up your payout account before scheduled or instant payouts can move funds.';
  const instantAvailabilityLabel = instantPayoutsEnabled
    ? 'Instant payouts available'
    : 'Instant payouts not enabled';
  const pendingHoldLabel = pendingInstantPayoutHoldCents > 0
    ? `${formatMoney(pendingInstantPayoutHoldCents / 100)} pending hold`
    : 'No pending holds';

  const [amountStr, setAmountStr] = useState('');
  const [busy, setBusy] = useState(false);
  const [instantMsg, setInstantMsg] = useState<string | null>(null);

  async function requestInstant() {
    const cents = Math.round(parseFloat(amountStr) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setInstantMsg('Enter a valid dollar amount.');
      return;
    }
    const currentFeeCents = instantFeeCents(cents);
    if (cents + currentFeeCents > netAvailableCents) {
      setInstantMsg('Amount exceeds available balance after pending instant payouts and fees.');
      return;
    }
    setBusy(true);
    setInstantMsg(null);
    try {
      const res = await fetch('/api/payouts/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: cents }),
      });
      const body = (await res.json()) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || !body.success) {
        setInstantMsg(body.error?.message ?? 'Request failed');
        return;
      }
      setInstantMsg('Request submitted. Ops will execute the Stripe payout; 1.5% fee applies.');
      setAmountStr('');
    } catch {
      setInstantMsg('Network error');
    } finally {
      setBusy(false);
    }
  }

  const previewCents = Math.round(parseFloat(amountStr || '0') * 100);
  const previewFee = Number.isFinite(previewCents) && previewCents > 0 ? instantFeeCents(previewCents) : 0;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-textMuted">Finance</p>
            <h2 className="mt-1 text-2xl font-bold text-text">Earnings command center</h2>
            <p className="mt-2 max-w-2xl text-sm text-textMuted">
              Track what is available now, what is held for instant payout requests, and the delivery proof behind each
              payout total.
            </p>
          </div>
          <Badge
            variant={payoutReady ? 'success' : 'warning'}
            className={payoutReady ? 'bg-successSoft text-success' : 'bg-warningSoft text-warning'}
          >
            {payoutReady ? 'Payouts enabled' : 'Payout setup needed'}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FinanceMetric
            label="Available now"
            value={formatMoney(netAvailableCents / 100)}
            detail="Ledger balance before holds"
            tone="success"
          />
          <FinanceMetric
            label="Weekly earnings"
            value={formatMoney(totalWeek)}
            detail={`${formatMoney(averageDeliveryPay)} average per completed delivery`}
          />
          <FinanceMetric
            label="Completed this week"
            value={`${totalDeliveries}`}
            detail={`${totalDistance.toFixed(1)} km tracked`}
          />
          <FinanceMetric
            label="Pending holds"
            value={formatMoney(pendingInstantPayoutHoldCents / 100)}
            detail={pendingInstantPayoutHoldCents > 0 ? 'Held by pending requests' : pendingHoldLabel}
            tone={pendingInstantPayoutHoldCents > 0 ? 'warning' : 'default'}
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-text">Payout readiness</h2>
                <p className="mt-2 text-sm text-textMuted">{payoutStatusLabel}</p>
              </div>
              <Badge
                variant={payoutReady ? 'success' : 'warning'}
                className={payoutReady ? 'bg-successSoft text-success' : 'bg-warningSoft text-warning'}
              >
                {formatStatusText(payoutAccountStatus.status || 'not_started')}
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-surfaceMuted px-3 py-2">
                <p className="text-xs font-medium text-textMuted">Scheduled payouts</p>
                <p className="mt-1 text-sm font-semibold text-text">
                  {payoutAccountStatus.payoutsEnabled ? 'Enabled' : 'Not enabled'}
                </p>
              </div>
              <div className="rounded-xl bg-surfaceMuted px-3 py-2">
                <p className="text-xs font-medium text-textMuted">Instant payout access</p>
                <p className="mt-1 text-sm font-semibold text-text">{instantAvailabilityLabel}</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-text">Next scheduled payout</h2>
                <p className="mt-1 text-sm text-textMuted">
                  Net of pending instant payout requests and fees. Delivery earnings this week: {formatMoney(totalWeek)}.
                </p>
              </div>
              <Badge variant="info" className="bg-infoSoft text-info">
                Weekly
              </Badge>
            </div>
            <p className="mt-4 text-3xl font-bold leading-tight text-text">
              {formatMoney(netAvailableCents / 100)}
            </p>
          </Card>

          <Card className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-text">Available balance</h2>
            <p className="mt-2 text-3xl font-bold text-success">
              {formatMoney(netAvailableCents / 100)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-textMuted">
              Available to request after pending instant payout requests and fees.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-textMuted">
              {formatMoney(availableBalanceCents / 100)} ledger balance in your {displayCurrency} driver payable account.
            </p>
            {pendingInstantPayoutTotalCents > 0 ? (
              <p className="mt-2 text-sm text-textMuted">
                {formatMoney(pendingInstantPayoutTotalCents / 100)} is already requested as an instant payout.
              </p>
            ) : null}
          </Card>

          {pendingInstantPayoutRequests.length > 0 ? (
            <Card className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-text">Pending instant payout requests</h2>
              <p className="mt-2 text-sm text-textMuted">{pendingHoldLabel} including requested funds and fees.</p>
              <div className="mt-4 space-y-3">
                {pendingInstantPayoutRequests.map((request) => (
                  <div key={request.id} className="rounded-xl bg-surfaceMuted px-3 py-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-textMuted">{formatMoney(request.amountCents / 100)} requested</span>
                      <span className="font-semibold text-text">Fee {formatMoney(request.feeCents / 100)}</span>
                    </div>
                    <p className="mt-1 text-xs text-textSubtle">
                      {request.requestedAt
                        ? new Date(request.requestedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : 'Request time pending'}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {instantPayoutsEnabled ? (
            <Card className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-text">Instant payout</h2>
              <p className="mt-2 text-sm leading-relaxed text-textMuted">
                Fee is <span className="font-semibold text-text">1.5%</span> of the amount you request, taken from
                your balance before transfer. You submit a request here; finance executes it in ops-admin.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex-1 text-sm font-medium text-text">
                  Amount ({displayCurrency})
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-divider px-3 py-2 text-sm"
                    placeholder="0.00"
                  />
                </label>
                <Button type="button" disabled={busy} onClick={() => void requestInstant()}>
                  {busy ? 'Submitting...' : 'Request instant payout'}
                </Button>
              </div>
              {previewCents > 0 ? (
                <p className="mt-3 text-sm text-textMuted">
                  <span>Instant payout fee preview</span>:{' '}
                  <span className="font-semibold text-text">{formatMoney(previewFee / 100)}</span>{' '}
                  (1.5%)
                </p>
              ) : (
                <p className="mt-3 text-sm text-textMuted">
                  <span>Instant payout fee preview</span>: {formatMoney(0)} until you enter an amount.
                </p>
              )}
              {instantMsg ? <p className="mt-3 text-sm font-medium text-warning">{instantMsg}</p> : null}
              <Link href="/settings" className="mt-4 inline-block text-sm font-semibold text-primary">
                Payout settings
              </Link>
            </Card>
          ) : (
            <Card className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
              <p className="text-sm text-textMuted">
                Enable instant payouts in{' '}
                <Link href="/settings" className="font-semibold text-primary">
                  Settings
                </Link>{' '}
                to request on-demand transfers (1.5% fee).
              </p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-text">Weekly activity</h2>
                <p className="mt-1 text-sm text-textMuted">This week</p>
              </div>
              <Badge variant="success" className="bg-successSoft text-success">
                {totalDeliveries} deliveries
              </Badge>
            </div>

            <p className="mt-5 text-4xl font-bold leading-tight text-success">
              {formatMoney(totalWeek)}
            </p>

            <div className="mt-7 flex items-end justify-between gap-2">
              {weeklyEarnings.map((day) => (
                <div key={day.day} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-md bg-primary transition-all"
                    style={{
                      height: maxAmount > 0 ? `${(day.amount / maxAmount) * 100}px` : '4px',
                      minHeight: day.amount > 0 ? '8px' : '4px',
                      opacity: day.amount > 0 ? 1 : 0.2,
                    }}
                  />
                  <span className="text-xs font-medium text-textMuted">{day.day}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-text">Today&apos;s Deliveries</h2>
            {todayDeliveries.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-textMuted">No deliveries yet today</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {todayDeliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="flex items-center justify-between gap-3 border-b border-divider pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text">
                        {delivery.dropoff_address.split(',')[0]}
                      </p>
                      <p className="mt-1 text-xs text-textMuted">
                        {delivery.actual_dropoff_at
                          ? new Date(delivery.actual_dropoff_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-text">
                        {formatMoney(delivery.driver_payout)}
                      </p>
                      <p className="mt-1 text-xs text-textMuted">
                        {delivery.distance_km?.toFixed(1) ?? '—'} km
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-text">Delivery pay estimate</h2>
            <p className="mt-2 text-sm leading-relaxed text-textMuted">
              This delivery-history estimate treats driver payout as base delivery pay unless explicit tip, bonus, or
              adjustment fields are available.
            </p>
            <div className="mt-4 space-y-3">
              {[
                ['Base delivery pay', breakdown.base],
                ['Tips', breakdown.tips],
                ['Bonuses', breakdown.bonuses],
                ['Adjustments', breakdown.adjustments],
              ].map(([label, amount]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-textMuted">{label}</span>
                  <span className="font-semibold text-text">{formatMoney(amount as number)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
