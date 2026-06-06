import Link from 'next/link';
import { Card, PageHeader, StatusBadge } from '@ridendine/ui';
import { createAdminClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getOpsActorContext, hasPlatformApiCapability } from '@/lib/engine';
import {
  buildExceptionQueue,
  formatExceptionStatus,
  getExceptionTone,
  getSlaTone,
  getStatusTone,
  type ExceptionQueue,
  type ExceptionQueueItem,
  type ExceptionQueueRow,
  type ExceptionSeverity,
  type ExceptionStatus,
  type ExceptionTone,
} from './exception-queue-model';

export const dynamic = 'force-dynamic';

type ExceptionFilter = 'all' | 'critical' | 'unassigned' | 'breached' | 'escalated' | 'waiting';

interface AlertRow {
  id: string;
  title: string;
  severity: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

const FILTERS: Array<{ key: ExceptionFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'breached', label: 'Breached SLA' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'waiting', label: 'Waiting' },
];

function getSearchParam(
  value: string | string[] | undefined,
  fallback = ''
): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

function getFilter(value: string): ExceptionFilter {
  return FILTERS.some((filter) => filter.key === value) ? (value as ExceptionFilter) : 'all';
}

function normalizeRecommendedActions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function normalizeExceptionRow(row: any): ExceptionQueueRow {
  const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;

  return {
    id: row.id,
    exception_type: row.exception_type,
    severity: row.severity as ExceptionSeverity,
    status: row.status as ExceptionStatus,
    title: row.title,
    description: row.description ?? null,
    recommended_actions: normalizeRecommendedActions(row.recommended_actions),
    order_id: row.order_id ?? null,
    customer_id: row.customer_id ?? null,
    chef_id: row.chef_id ?? null,
    driver_id: row.driver_id ?? null,
    delivery_id: row.delivery_id ?? null,
    assigned_to: row.assigned_to ?? null,
    sla_deadline: row.sla_deadline ?? null,
    escalated_at: row.escalated_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    orders: order
      ? {
          order_number: order.order_number ?? null,
          status: order.status ?? null,
        }
      : null,
  };
}

async function loadExceptionData() {
  const client = createAdminClient() as any;

  const [exceptionResult, alertResult, ticketResult] = await Promise.all([
    client
      .from('order_exceptions')
      .select(`
        id,
        exception_type,
        severity,
        status,
        title,
        description,
        recommended_actions,
        order_id,
        customer_id,
        chef_id,
        driver_id,
        delivery_id,
        assigned_to,
        sla_deadline,
        escalated_at,
        created_at,
        updated_at,
        orders (
          order_number,
          status
        )
      `)
      .in('status', [
        'open',
        'acknowledged',
        'in_progress',
        'pending_customer',
        'pending_chef',
        'pending_driver',
        'escalated',
      ])
      .order('created_at', { ascending: true })
      .limit(200),
    client
      .from('system_alerts')
      .select('id, title, severity, entity_type, entity_id, created_at', { count: 'exact' })
      .eq('acknowledged', false)
      .order('created_at', { ascending: false })
      .limit(8),
    client
      .from('support_tickets')
      .select('id', { count: 'exact' })
      .in('status', ['open', 'in_progress'])
      .limit(1),
  ]);

  if (exceptionResult.error) throw exceptionResult.error;
  if (alertResult.error) throw alertResult.error;
  if (ticketResult.error) throw ticketResult.error;

  const alerts = (alertResult.data ?? []) as AlertRow[];
  const rows = ((exceptionResult.data ?? []) as any[]).map(normalizeExceptionRow);

  return {
    alerts,
    queue: buildExceptionQueue(rows, {
      activeAlertCount: alertResult.count ?? alerts.length,
      openTicketCount: ticketResult.count ?? (ticketResult.data ?? []).length,
    }),
  };
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatOwnerLabel(item: ExceptionQueueItem): string {
  if (item.ownerState === 'owned') return 'Owned';
  return 'Unassigned';
}

function filterItems(queue: ExceptionQueue, filter: ExceptionFilter): ExceptionQueueItem[] {
  if (filter === 'critical') {
    return queue.reviewQueue.filter((item) => item.severity === 'critical' || item.severity === 'high');
  }
  if (filter === 'unassigned') {
    return queue.reviewQueue.filter((item) => item.ownerState === 'unassigned');
  }
  if (filter === 'breached') {
    return queue.reviewQueue.filter((item) => item.sla.state === 'breached');
  }
  if (filter === 'escalated') {
    return queue.reviewQueue.filter((item) => item.escalated);
  }
  if (filter === 'waiting') {
    return queue.reviewQueue.filter((item) => Boolean(item.waitingOn));
  }
  return queue.reviewQueue;
}

function SummaryCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: ExceptionTone;
}) {
  return (
    <Card className="border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-textMuted">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-text">{value.toLocaleString()}</p>
          <p className="mt-1 text-sm text-textMuted">{detail}</p>
        </div>
        <StatusBadge status={tone} label={label} withDot={false} />
      </div>
    </Card>
  );
}

function RelatedLinks({ item }: { item: ExceptionQueueItem }) {
  const links = [
    item.orderId && {
      href: `/dashboard/orders/${item.orderId}`,
      label: item.orderNumber ? `Order ${item.orderNumber}` : 'Order',
    },
    item.deliveryId && { href: `/dashboard/deliveries/${item.deliveryId}`, label: 'Delivery' },
    item.chefId && { href: `/dashboard/chefs/${item.chefId}`, label: 'Chef' },
    item.driverId && { href: `/dashboard/drivers/${item.driverId}`, label: 'Driver' },
  ].filter((link): link is { href: string; label: string } => Boolean(link));

  if (links.length === 0) {
    return <span className="text-xs text-textMuted">No linked entity</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="text-xs font-medium text-primary hover:underline">
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function ExceptionRow({ item }: { item: ExceptionQueueItem }) {
  return (
    <Card className="border-border bg-surface p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={getExceptionTone(item.severity)} label={item.severity} withDot={false} />
            <StatusBadge status={getStatusTone(item.status)} label={formatExceptionStatus(item.status)} withDot={false} />
            <StatusBadge status={getSlaTone(item.sla.state)} label={item.sla.label} withDot={false} />
          </div>
          <h2 className="mt-3 text-lg font-semibold text-text">{item.title}</h2>
          <p className="mt-1 text-sm text-textMuted">{item.typeLabel}</p>
          {item.description && <p className="mt-2 text-sm text-textMuted">{item.description}</p>}
        </div>
        <div className="shrink-0 text-left lg:text-right">
          <p className="text-sm font-medium text-text">{formatOwnerLabel(item)}</p>
          <p className="mt-1 text-xs text-textMuted">Age {item.ageLabel}</p>
          <p className="mt-1 text-xs text-textMuted">{formatDate(item.createdAt)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 border-t border-divider pt-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="text-xs uppercase text-textMuted">Next action</p>
          <p className="mt-1 text-sm text-text">{item.primaryAction}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-textMuted">Links</p>
          <div className="mt-1">
            <RelatedLinks item={item} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function AlertRail({
  alerts,
  activeAlertCount,
  openTicketCount,
}: {
  alerts: AlertRow[];
  activeAlertCount: number;
  openTicketCount: number;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-border bg-surface p-5">
        <p className="text-sm font-semibold text-text">Support Handoff</p>
        <p className="mt-2 text-3xl font-semibold text-text">{openTicketCount.toLocaleString()}</p>
        <p className="mt-1 text-sm text-textMuted">Open or in-progress support tickets</p>
        <Link href="/dashboard/support" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          Open support queue
        </Link>
      </Card>

      <Card className="border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-text">Active Alerts</p>
          <StatusBadge
            status={activeAlertCount > 0 ? 'warning' : 'success'}
            label={`${activeAlertCount}`}
            withDot={false}
          />
        </div>
        <div className="mt-4 space-y-3">
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <div key={alert.id} className="border-t border-divider pt-3 first:border-t-0 first:pt-0">
                <p className="text-sm font-medium text-text">{alert.title}</p>
                <p className="mt-1 text-xs capitalize text-textMuted">{alert.severity}</p>
                <p className="mt-1 text-xs text-textMuted">{formatDate(alert.created_at)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-textMuted">No active system alerts.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

export default async function ExceptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getOpsActorContext();

  if (!actor || !hasPlatformApiCapability(actor, 'exceptions_read')) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-4xl">
          <Card className="border-border bg-surface p-8">
            <h1 className="text-2xl font-bold text-text">Access restricted</h1>
            <p className="mt-2 text-textMuted">
              Exception queue review requires platform exception read access.
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  let data: Awaited<ReturnType<typeof loadExceptionData>>;

  try {
    data = await loadExceptionData();
  } catch (error) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-5xl">
          <Card className="border-border bg-surface p-8">
            <h1 className="text-2xl font-bold text-text">Exception data unavailable</h1>
            <p className="mt-2 text-danger">
              {error instanceof Error ? error.message : 'Unable to load exception data.'}
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const params = await searchParams;
  const activeFilter = getFilter(getSearchParam(params.filter, 'all'));
  const visibleItems = filterItems(data.queue, activeFilter);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Exceptions"
          subtitle="Ops ownership, SLA pressure, and escalation visibility."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Open" value={data.queue.summary.totalOpen} detail="Active exceptions" tone="info" />
          <SummaryCard label="Critical" value={data.queue.summary.criticalOrHigh} detail="High or critical" tone="danger" />
          <SummaryCard label="Unassigned" value={data.queue.summary.unassigned} detail="Needs owner" tone="warning" />
          <SummaryCard label="Breached" value={data.queue.summary.breachedSla} detail="Past SLA" tone="danger" />
          <SummaryCard label="Escalated" value={data.queue.summary.escalated} detail="Raised status" tone="danger" />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const count = data.queue.filters[filter.key];
            const active = activeFilter === filter.key;
            return (
              <Link
                key={filter.key}
                href={`/dashboard/exceptions?filter=${filter.key}`}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? 'border-primary bg-primarySoft text-primary'
                    : 'border-border bg-surface text-textMuted hover:text-text'
                }`}
              >
                {filter.label} ({count})
              </Link>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-4">
            {visibleItems.length > 0 ? (
              visibleItems.map((item) => <ExceptionRow key={item.id} item={item} />)
            ) : (
              <Card className="border-border bg-surface px-4 py-10 text-center text-sm text-textMuted">
                No exceptions match this filter.
              </Card>
            )}
          </section>
          <AlertRail
            alerts={data.alerts}
            activeAlertCount={data.queue.summary.activeAlerts}
            openTicketCount={data.queue.summary.openSupportTickets}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
