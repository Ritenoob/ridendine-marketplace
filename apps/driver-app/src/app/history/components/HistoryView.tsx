'use client';

import { Badge, Card } from '@ridendine/ui';
import type { Delivery } from '@ridendine/db';
import { formatCurrency } from '@ridendine/utils';

interface HistoryViewProps {
  deliveries: Delivery[];
}

type DeliveryAmount = number | string | null | undefined;

function getAddressLead(address: string | null | undefined) {
  return address?.split(',')[0]?.trim() || 'Address unavailable';
}

function getNumericValue(value: DeliveryAmount) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

// deliveries.driver_payout is dollars. en-US locale is intentional (renders "CA$").
function formatMoney(amount: number) {
  return formatCurrency(amount, 'CAD', 'en-US');
}

function formatDistance(distanceKm: DeliveryAmount) {
  return `${getNumericValue(distanceKm).toFixed(1)} km`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateString: string | null) {
  if (!dateString) return '-';

  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusColor(status: string) {
  switch (status) {
    case 'delivered':
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

function formatStatus(status: string) {
  return status
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getRouteLabel(delivery: Delivery) {
  return `${getAddressLead(delivery.pickup_address)} to ${getAddressLead(delivery.dropoff_address)}`;
}

function groupDeliveries(deliveries: Delivery[]) {
  const grouped = new Map<string, { dateLabel: string; dateKey: string; deliveries: Delivery[] }>();

  deliveries.forEach((delivery) => {
    if (!delivery.actual_dropoff_at) return;

    const dateKey = delivery.actual_dropoff_at.slice(0, 10);
    const existing = grouped.get(dateKey);

    if (existing) {
      existing.deliveries.push(delivery);
      return;
    }

    grouped.set(dateKey, {
      dateKey,
      dateLabel: formatDate(delivery.actual_dropoff_at),
      deliveries: [delivery],
    });
  });

  return Array.from(grouped.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

function getMostRecentDelivery(deliveries: Delivery[]) {
  return [...deliveries]
    .filter((delivery) => Boolean(delivery.actual_dropoff_at))
    .sort((a, b) => {
      const bTime = new Date(b.actual_dropoff_at ?? 0).getTime();
      const aTime = new Date(a.actual_dropoff_at ?? 0).getTime();
      return bTime - aTime;
    })[0] ?? null;
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
      <p className="mt-2 text-[26px] font-bold leading-tight text-text">{value}</p>
      <p className="mt-1 text-[13px] text-textMuted">{detail}</p>
    </Card>
  );
}

export default function HistoryView({ deliveries }: HistoryViewProps) {
  const completedDeliveries = deliveries.filter((delivery) => delivery.actual_dropoff_at);
  const groupedDeliveries = groupDeliveries(completedDeliveries);
  const recentDelivery = getMostRecentDelivery(completedDeliveries);

  const totalEarnings = completedDeliveries.reduce(
    (sum, delivery) => sum + getNumericValue(delivery.driver_payout),
    0
  );
  const totalDistance = completedDeliveries.reduce(
    (sum, delivery) => sum + getNumericValue(delivery.distance_km),
    0
  );
  const averagePayout =
    completedDeliveries.length > 0 ? totalEarnings / completedDeliveries.length : 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-primary">
          Driver ledger
        </p>
        <h1 className="mt-1 text-2xl font-bold text-text">
          Delivery history command center
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-textMuted">
          Completed delivery proof, route distance, and payout records from the latest driver
          history pull.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Completed deliveries"
          value={String(completedDeliveries.length)}
          detail="In this history view"
        />
        <SummaryCard label="Total earned" value={formatMoney(totalEarnings)} detail="CAD payout total" />
        <SummaryCard
          label="Average payout"
          value={formatMoney(averagePayout)}
          detail="Per completed delivery"
        />
        <SummaryCard
          label="Total distance"
          value={formatDistance(totalDistance)}
          detail="Completed route distance"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Card className="border border-divider bg-surface p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold text-text">Delivery proof trail</h2>
              <p className="mt-1 text-sm text-textMuted">
                Latest completed delivery tied to route, time, and payout evidence.
              </p>
            </div>
            <Badge variant={recentDelivery ? 'success' : 'default'} className="text-[11px]">
              {recentDelivery ? 'Active ledger' : 'Empty'}
            </Badge>
          </div>

          {recentDelivery ? (
            <div className="mt-5 rounded-lg border border-divider bg-surfaceMuted p-4">
              <p className="text-[12px] font-semibold uppercase text-textMuted">
                Recent completion
              </p>
              <p className="mt-2 text-[17px] font-semibold text-text">
                {getRouteLabel(recentDelivery)}
              </p>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-textMuted">Completed</p>
                  <p className="mt-1 font-semibold text-text">
                    {formatTime(recentDelivery.actual_dropoff_at)}
                  </p>
                </div>
                <div>
                  <p className="text-textMuted">Distance</p>
                  <p className="mt-1 font-semibold text-text">
                    {formatDistance(recentDelivery.distance_km)}
                  </p>
                </div>
                <div>
                  <p className="text-textMuted">Payout</p>
                  <p className="mt-1 font-semibold text-text">
                    {formatMoney(getNumericValue(recentDelivery.driver_payout))}
                  </p>
                </div>
                <div>
                  <p className="text-textMuted">Status</p>
                  <p className="mt-1 font-semibold text-text">
                    {formatStatus(recentDelivery.status)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-borderStrong bg-surfaceMuted px-4 py-8 text-center">
              <p className="text-[15px] font-semibold text-text">
                No completed deliveries yet
              </p>
              <p className="mt-2 text-sm text-textMuted">
                Completed delivery proof and payout records will appear here.
              </p>
            </div>
          )}
        </Card>

        <section
          aria-label="Completed delivery ledger"
          className="space-y-4"
          role="region"
        >
          {groupedDeliveries.length === 0 ? (
            <Card className="border border-divider bg-surface p-4 shadow-sm">
              <div className="py-10 text-center">
                <p className="text-[15px] font-semibold text-text">
                  No completed deliveries yet
                </p>
                <p className="mt-2 text-sm text-textMuted">
                  Completed delivery proof and payout records will appear here.
                </p>
              </div>
            </Card>
          ) : (
            groupedDeliveries.map((group) => (
              <Card key={group.dateKey} className="border border-divider bg-surface p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[15px] font-semibold text-text">{group.dateLabel}</h2>
                  <span className="text-[13px] text-textMuted">
                    {group.deliveries.length} completed
                  </span>
                </div>

                <div className="mt-4 divide-y divide-divider">
                  {group.deliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="min-w-0 text-[15px] font-semibold text-text">
                            {getRouteLabel(delivery)}
                          </p>
                          <Badge variant={getStatusColor(delivery.status)} className="text-[11px]">
                            {formatStatus(delivery.status)}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-textMuted">
                          <span>Completed {formatTime(delivery.actual_dropoff_at)}</span>
                          <span>{formatDistance(delivery.distance_km)}</span>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-[17px] font-bold text-success">
                          {formatMoney(getNumericValue(delivery.driver_payout))}
                        </p>
                        <p className="mt-1 text-[12px] text-textMuted">Driver payout</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
