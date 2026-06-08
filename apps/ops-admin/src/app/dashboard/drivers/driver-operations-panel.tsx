import { Badge, Card } from '@ridendine/ui';
import type { OpsDriverOperationsSummary } from '@/lib/driver-operations';

function fmtCents(cents: number, currency = 'CAD'): string {
  return `$${(cents / 100).toFixed(2)} ${currency}`;
}

function readinessClass(priority: OpsDriverOperationsSummary['readiness']['priority']) {
  if (priority === 'success') return 'bg-success/20 text-success';
  if (priority === 'warning') return 'bg-warning/20 text-warning';
  if (priority === 'danger') return 'bg-danger/20 text-danger';
  return 'bg-surfaceMuted text-textSubtle';
}

function presenceClass(status: string) {
  if (status === 'online') return 'bg-success/20 text-success';
  if (status === 'busy') return 'bg-primary/20 text-primary';
  return 'bg-surfaceMuted text-textSubtle';
}

export function DriverOperationsPanel({ summary }: { summary: OpsDriverOperationsSummary }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="border-border bg-surface p-6 lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Dispatch readiness</h2>
            <p className="mt-1 text-sm text-textMuted">{summary.readiness.detail}</p>
          </div>
          <Badge className={`${readinessClass(summary.readiness.priority)} px-3 py-1`}>
            {summary.readiness.label}
          </Badge>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm text-textMuted">Presence</p>
            <p className="mt-1 text-xl font-semibold capitalize text-white">
              {summary.presence.status}
            </p>
            <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs ${presenceClass(summary.presence.status)}`}>
              {summary.presence.locationHealth.label}
            </span>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm text-textMuted">Active deliveries</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {summary.activeDeliveryCount}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm text-textMuted">Open exceptions</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {summary.openExceptionCount}
            </p>
          </div>
        </div>

        {summary.activeDeliveries.length > 0 && (
          <div className="mt-5 space-y-3">
            {summary.activeDeliveries.slice(0, 3).map((delivery) => (
              <div
                key={delivery.id}
                className="rounded-lg border border-border bg-surface p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-white">
                    {delivery.orderNumber ?? delivery.id.slice(0, 8)}
                  </p>
                  <Badge className="bg-primary/20 text-primary">
                    {delivery.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="mt-2 text-textMuted">
                  {delivery.pickupAddress ?? 'Pickup not recorded'} to{' '}
                  {delivery.dropoffAddress ?? 'dropoff not recorded'}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-white">Earnings and compliance</h2>
        <div className="mt-5 space-y-4">
          <div>
            <p className="text-sm text-textMuted">Payable balance</p>
            <p className="mt-1 text-2xl font-semibold text-success">
              {fmtCents(summary.payout.availableBalanceCents, summary.payout.currency)}
            </p>
          </div>
          <div>
            <p className="text-sm text-textMuted">Payout status</p>
            <p className="mt-1 text-sm text-textSubtle">
              Payout account is {summary.payout.accountStatus}.
            </p>
          </div>
          <div>
            <p className="text-sm text-textMuted">Compliance open items</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {summary.compliance.openItems}
            </p>
            <p className="mt-1 text-xs text-textMuted">
              {summary.compliance.pendingDocuments} pending,{' '}
              {summary.compliance.rejectedDocuments} rejected,{' '}
              {summary.compliance.expiredDocuments} expired
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function DriverOperationsListBadges({ summary }: { summary: OpsDriverOperationsSummary }) {
  return (
    <div className="flex max-w-xs flex-wrap gap-1.5">
      <Badge className={`${readinessClass(summary.readiness.priority)} px-2 py-0.5 text-[10px]`}>
        {summary.readiness.label}
      </Badge>
      <Badge className="bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
        {summary.activeDeliveryCount} active
      </Badge>
      <Badge className="bg-danger/15 px-2 py-0.5 text-[10px] text-danger">
        {summary.openExceptionCount} exceptions
      </Badge>
      <Badge className="bg-surfaceMuted px-2 py-0.5 text-[10px] text-textSubtle">
        Payout {summary.payout.accountStatus}
      </Badge>
    </div>
  );
}
