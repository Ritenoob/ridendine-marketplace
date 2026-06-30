'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, Badge, Button, ORDER_STATUS_LABELS } from '@ridendine/ui';
import { formatCurrency } from '@ridendine/utils';

// ---------------------------------------------------------------------------
// Orders Ledger
//
// Stage 1: Orders is the order LEDGER / history surface — not the live kitchen
// workflow board. The live accept/prep/ready workflow lives in Kitchen Command
// (`/dashboard/kitchen`). This component is read-only: it provides history,
// search/filter, traceability and export, and links into the per-order detail
// page for support context. It intentionally does NOT mutate order status.
// ---------------------------------------------------------------------------

export interface LedgerOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string | null;
  total: number;
  created_at: string;
  estimated_ready_at?: string | null;
  actual_ready_at?: string | null;
  completed_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email?: string | null;
  } | null;
  delivery?: {
    id: string;
    status: string | null;
  } | null;
}

interface OrdersLedgerProps {
  initialOrders: LedgerOrder[];
  storefrontId: string;
}

const STATUS_LABELS = ORDER_STATUS_LABELS;

// Order statuses that represent an operational problem / exception.
const EXCEPTION_STATUSES = new Set(['rejected', 'cancelled', 'expired', 'failed', 'refunded']);

function money(value: number | null | undefined) {
  return formatCurrency(Number(value ?? 0));
}

function formatStatus(status: string | null | undefined) {
  if (!status) return '—';
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function customerName(order: LedgerOrder) {
  if (!order.customer) return 'Unlinked customer';
  return `${order.customer.first_name} ${order.customer.last_name}`.trim() || 'Unlinked customer';
}

function statusBadgeVariant(status: string): 'default' | 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'accepted':
    case 'preparing':
      return 'info';
    case 'ready_for_pickup':
    case 'delivered':
    case 'completed':
      return 'success';
    case 'rejected':
    case 'cancelled':
    case 'expired':
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}

// "Completed" timestamp for the ledger: prefer delivered, then completed, then
// cancelled — whichever closed the order out.
function closedAt(order: LedgerOrder): string | null {
  return order.delivered_at ?? order.completed_at ?? order.cancelled_at ?? null;
}

function isException(order: LedgerOrder): boolean {
  if (EXCEPTION_STATUSES.has(order.status)) return true;
  if (order.payment_status && EXCEPTION_STATUSES.has(order.payment_status)) return true;
  // Late: an active order whose promised ready time has passed without a ready stamp.
  if (
    ['pending', 'accepted', 'preparing'].includes(order.status) &&
    !order.actual_ready_at &&
    order.estimated_ready_at &&
    Date.parse(order.estimated_ready_at) < Date.now()
  ) {
    return true;
  }
  return false;
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort();
}

function toCsvCell(value: string): string {
  // Quote cells containing commas, quotes or newlines.
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function OrdersLedger({ initialOrders }: OrdersLedgerProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [deliveryStatus, setDeliveryStatus] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exceptionsOnly, setExceptionsOnly] = useState(false);

  const statusOptions = useMemo(
    () => uniqueSorted(initialOrders.map((o) => o.status)),
    [initialOrders]
  );
  const paymentOptions = useMemo(
    () => uniqueSorted(initialOrders.map((o) => o.payment_status)),
    [initialOrders]
  );
  const deliveryOptions = useMemo(
    () => uniqueSorted(initialOrders.map((o) => o.delivery?.status)),
    [initialOrders]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toTs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;

    return initialOrders.filter((o) => {
      if (status !== 'all' && o.status !== status) return false;
      if (paymentStatus !== 'all' && (o.payment_status ?? '') !== paymentStatus) return false;
      if (deliveryStatus !== 'all' && (o.delivery?.status ?? '') !== deliveryStatus) return false;
      if (exceptionsOnly && !isException(o)) return false;

      const created = Date.parse(o.created_at);
      if (fromTs !== null && created < fromTs) return false;
      if (toTs !== null && created > toTs) return false;

      if (term) {
        const haystack = [
          o.order_number,
          customerName(o),
          o.customer?.phone ?? '',
          o.customer?.email ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [initialOrders, search, status, paymentStatus, deliveryStatus, fromDate, toDate, exceptionsOnly]);

  const resetFilters = () => {
    setSearch('');
    setStatus('all');
    setPaymentStatus('all');
    setDeliveryStatus('all');
    setFromDate('');
    setToDate('');
    setExceptionsOnly(false);
  };

  const exportCsv = () => {
    const header = [
      'Order',
      'Customer',
      'Phone',
      'Total',
      'Payment',
      'Kitchen status',
      'Delivery status',
      'Created',
      'Ready',
      'Completed',
    ];
    const rows = filtered.map((o) => [
      o.order_number,
      customerName(o),
      o.customer?.phone ?? '',
      String(Number(o.total ?? 0).toFixed(2)),
      formatStatus(o.payment_status),
      formatStatus(o.status),
      formatStatus(o.delivery?.status),
      o.created_at ?? '',
      o.actual_ready_at ?? '',
      closedAt(o) ?? '',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => toCsvCell(String(cell))).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Filter bar */}
      <Card>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-textMuted">Search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order #, customer, phone, email"
              className="min-h-10 rounded-lg border border-borderStrong px-3 text-sm text-text focus-visible:outline-none focus-visible:shadow-focus"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-textMuted">Kitchen status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="min-h-10 rounded-lg border border-borderStrong px-3 text-sm text-text focus-visible:outline-none focus-visible:shadow-focus"
            >
              <option value="all">All statuses</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {formatStatus(s)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-textMuted">Payment status</span>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="min-h-10 rounded-lg border border-borderStrong px-3 text-sm text-text focus-visible:outline-none focus-visible:shadow-focus"
            >
              <option value="all">All payments</option>
              {paymentOptions.map((s) => (
                <option key={s} value={s}>
                  {formatStatus(s)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-textMuted">Delivery status</span>
            <select
              value={deliveryStatus}
              onChange={(e) => setDeliveryStatus(e.target.value)}
              className="min-h-10 rounded-lg border border-borderStrong px-3 text-sm text-text focus-visible:outline-none focus-visible:shadow-focus"
            >
              <option value="all">All deliveries</option>
              {deliveryOptions.map((s) => (
                <option key={s} value={s}>
                  {formatStatus(s)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-textMuted">From date</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="min-h-10 rounded-lg border border-borderStrong px-3 text-sm text-text focus-visible:outline-none focus-visible:shadow-focus"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-textMuted">To date</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="min-h-10 rounded-lg border border-borderStrong px-3 text-sm text-text focus-visible:outline-none focus-visible:shadow-focus"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={exceptionsOnly}
              onChange={(e) => setExceptionsOnly(e.target.checked)}
              className="h-4 w-4 rounded border-borderStrong"
            />
            Issues &amp; exceptions only
          </label>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      <p className="text-sm text-textMuted" role="status" aria-live="polite">
        Showing {filtered.length} of {initialOrders.length} orders
      </p>

      {/* Ledger table */}
      <Card className="overflow-x-auto p-0">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-textMuted">
            No orders match the current filters.
          </p>
        ) : (
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-divider text-left text-xs font-semibold uppercase tracking-wide text-textSubtle">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Kitchen</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Ready</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  className={`border-b border-divider transition-colors hover:bg-surfaceMuted ${
                    isException(o) ? 'bg-dangerSoft/30' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-semibold text-text">{o.order_number}</td>
                  <td className="px-4 py-3 text-text">
                    <p className="font-medium">{customerName(o)}</p>
                    {o.customer?.phone ? (
                      <p className="text-xs text-textMuted">{o.customer.phone}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-text">{money(o.total)}</td>
                  <td className="px-4 py-3 text-textMuted">{formatStatus(o.payment_status)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant(o.status)}>{formatStatus(o.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-textMuted">{formatStatus(o.delivery?.status)}</td>
                  <td className="px-4 py-3 text-textMuted">{formatDateTime(o.created_at)}</td>
                  <td className="px-4 py-3 text-textMuted">{formatDateTime(o.actual_ready_at)}</td>
                  <td className="px-4 py-3 text-textMuted">{formatDateTime(closedAt(o))}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/orders/${o.id}`}
                      className="inline-flex min-h-9 items-center rounded-lg border border-borderStrong px-3 text-xs font-medium text-text hover:bg-surfaceMuted"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
