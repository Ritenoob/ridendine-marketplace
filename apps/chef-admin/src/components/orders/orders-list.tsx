'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Card, Badge, Button, LiveIndicator, ORDER_STATUS_LABELS, type LiveIndicatorStatus } from '@ridendine/ui';
import { chefStorefrontOrdersChannel, createBrowserClient, parseOrdersRealtimeRow } from '@ridendine/db';
import {
  formatCurrency,
  getKitchenWorkflowStep,
  KITCHEN_NEXT_TRANSITION,
  KITCHEN_REJECT_TRANSITION,
  type KitchenActionableStatus,
} from '@ridendine/utils';
import { OrderToast, type ToastMsg } from './order-toast';

interface Order {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  tax: number;
  tip: number;
  total: number;
  payment_status?: string | null;
  estimated_ready_at?: string | null;
  actual_ready_at?: string | null;
  special_instructions: string | null;
  created_at: string;
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email?: string;
  };
  address?: {
    id: string;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    state?: string;
    postal_code?: string;
    country?: string;
    delivery_instructions?: string | null;
  };
  items?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    special_instructions?: string | null;
    menu_item?: {
      id?: string;
      name: string;
      description?: string | null;
    } | null;
  }>;
  delivery?: {
    id: string;
    status: string;
    driver_id: string | null;
    driver?: {
      first_name: string;
      last_name: string;
      phone: string | null;
    } | null;
  } | null;
}

interface OrdersListProps {
  initialOrders: Order[];
  storefrontId: string;
}

const ACCEPT_TIMEOUT_MS = 8 * 60 * 1000; // 8 minutes

const STATUS_LABELS = ORDER_STATUS_LABELS;

// Order amounts (line totals, fees, tax, tip, total) are dollars.
function money(value: number | null | undefined) {
  return formatCurrency(Number(value ?? 0));
}

function formatStatus(status: string | null | undefined) {
  if (!status) return 'Not recorded';
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

function getWorkflow(order: Order) {
  return getKitchenWorkflowStep(order.status, formatStatus(order.status));
}

function getReadyTiming(order: Order) {
  if (order.actual_ready_at) {
    return `Marked ready ${new Date(order.actual_ready_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (order.estimated_ready_at) {
    const minutes = Math.round((Date.parse(order.estimated_ready_at) - Date.now()) / 60000);
    if (minutes < -5) return `${Math.abs(minutes)} min late`;
    if (minutes <= 0) return 'Due now';
    return `Ready in ${minutes} min`;
  }
  return 'Ready time not set';
}

function CountdownTimer({
  createdAt,
  orderId,
  onExpire,
}: {
  createdAt: string;
  orderId: string;
  onExpire: (orderId: string) => void;
}) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  // Ensure this timer only fires its expiry callback once, even if the
  // interval keeps ticking after the deadline has passed.
  const firedRef = useRef(false);

  useEffect(() => {
    const orderTime = new Date(createdAt).getTime();
    const deadline = orderTime + ACCEPT_TIMEOUT_MS;

    const updateTimer = () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        if (!firedRef.current) {
          firedRef.current = true;
          onExpire(orderId);
        }
      } else {
        setTimeLeft(remaining);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [createdAt, orderId, onExpire]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  const isUrgent = timeLeft < 2 * 60 * 1000; // Less than 2 minutes

  if (timeLeft <= 0) {
    return <span className="text-danger font-medium">Expired</span>;
  }

  return (
    <span className={`font-mono font-bold ${isUrgent ? 'text-danger animate-pulse' : 'text-primary'}`}>
      {minutes}:{seconds.toString().padStart(2, '0')}
    </span>
  );
}

export function OrdersList({ initialOrders, storefrontId }: OrdersListProps) {
  const [filter, setFilter] = useState<string>('all');
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [pendingOrderIds, setPendingOrderIds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  // Orders for which the auto-expiry reject PATCH has already been sent in
  // this tab — guards against duplicate fires across re-renders.
  const expiredOrderIdsRef = useRef<Set<string>>(new Set());
  const [playSound, setPlaySound] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<LiveIndicatorStatus>('connecting');

  const addToast = useCallback((message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const supabase = useMemo(() => createBrowserClient(), []);

  // Subscribe to real-time updates (scoped to this storefront — RLS + client filter)
  useEffect(() => {
    if (!supabase || !storefrontId) return;

    const db = supabase;
    const filter = `storefront_id=eq.${storefrontId}`;
    const channel = db
      .channel(chefStorefrontOrdersChannel(storefrontId))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter },
        (payload) => {
          const hydrateOrder = async (orderId: string) => {
            try {
              const response = await fetch(`/api/orders/${orderId}`);
              if (!response.ok) return null;
              const json = await response.json();
              return json.data?.order ?? json.order ?? null;
            } catch {
              return null;
            }
          };

          // A single malformed realtime message must not take down the
          // subscription — keep the thin row + skip it instead.
          try {
            if (payload.eventType === 'INSERT') {
              const row = parseOrdersRealtimeRow(payload.new);
              if (!row || row.storefront_id !== storefrontId) return;
              const newOrder = payload.new as Order;
              setOrders((prev) => [newOrder, ...prev]);
              hydrateOrder(newOrder.id)
                .then((fullOrder) => {
                  if (!fullOrder) return;
                  setOrders((prev) => prev.map((order) => order.id === fullOrder.id ? fullOrder : order));
                })
                .catch(() => {
                  // Hydration is best-effort; the thin realtime row stays.
                });
              setPlaySound(true);
              const orderNum = (payload.new as Order).order_number ?? '';
              const customer = (payload.new as Order).customer;
              const customerName = customer
                ? `${customer.first_name} ${customer.last_name}`
                : 'a customer';
              addToast(`New order ${orderNum} from ${customerName}`);
            } else if (payload.eventType === 'UPDATE') {
              const row = parseOrdersRealtimeRow(payload.new);
              if (!row || row.storefront_id !== storefrontId) return;
              const updatedOrder = payload.new as Order;
              setOrders((prev) =>
                prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
              );
              hydrateOrder(updatedOrder.id)
                .then((fullOrder) => {
                  if (!fullOrder) return;
                  setOrders((prev) => prev.map((order) => order.id === fullOrder.id ? { ...order, ...fullOrder } : order));
                })
                .catch(() => {
                  // Hydration is best-effort; the thin realtime row stays.
                });
            }
          } catch (err) {
            console.error('Failed to process realtime order event', err);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeStatus('disconnected');
        } else {
          setRealtimeStatus('connecting');
        }
      });

    return () => {
      db.removeChannel(channel);
    };
  }, [supabase, storefrontId, addToast]);

  // Play notification sound for new orders
  useEffect(() => {
    if (playSound) {
      // Gracefully handle audio notification
      // Sound file can be added to public/sounds/new-order.mp3 when available
      try {
        const audio = new Audio('/sounds/new-order.mp3');
        audio.play().catch(() => {
          // Silent fail if audio file not found or autoplay blocked
          console.debug('Audio notification unavailable');
        });
      } catch {
        // Silent fail if Audio API not available
        console.debug('Audio API unavailable');
      }
      setPlaySound(false);
    }
  }, [playSound]);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const handleOrderExpire = useCallback(async (orderId: string) => {
    // Fire the auto-reject at most once per order per tab.
    if (expiredOrderIdsRef.current.has(orderId)) return;
    expiredOrderIdsRef.current.add(orderId);

    try {
      // Auto-reject timed-out orders using the protected API action contract.
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          reason: 'other',
          notes: 'Auto-rejected after acceptance timeout',
        }),
      });

      if (!response.ok) {
        // The server refused (e.g. the chef accepted just in time, or a
        // server-side expiry already ran). Leave local state alone and let
        // realtime updates reconcile the true status.
        return;
      }

      const json = await response.json().catch(() => null);
      const updatedOrder =
        json?.data?.order ??
        json?.data?.updatedOrder ??
        json?.order ??
        json?.updatedOrder ??
        null;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? updatedOrder
              ? { ...o, ...updatedOrder }
              : { ...o, status: 'rejected' }
            : o
        )
      );
    } catch {
      // Network failure — keep current state; realtime will reconcile.
      // Allow a later timer fire to retry the auto-reject in this tab.
      expiredOrderIdsRef.current.delete(orderId);
    }
  }, []);

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(o => o.status === filter);

  const workflowMetrics = {
    decisions: orders.filter((order) => order.status === 'pending').length,
    inPrep: orders.filter((order) => order.status === 'accepted' || order.status === 'preparing').length,
    readyForPickup: orders.filter((order) => order.status === 'ready_for_pickup').length,
    late: orders.filter((order) => {
      if (!['pending', 'accepted', 'preparing'].includes(order.status)) return false;
      if (!order.estimated_ready_at) return false;
      return Date.parse(order.estimated_ready_at) < Date.now();
    }).length,
  };

  const updateOrderStatus = async (
    orderId: string,
    payload: { action?: string; status?: string; reason?: string; notes?: string }
  ) => {
    setPendingOrderIds((prev) => ({ ...prev, [orderId]: true }));
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update order');
      }

      const json = await response.json();
      const updatedOrder =
        json.data?.order ??
        json.data?.updatedOrder ??
        json.order ??
        json.updatedOrder ??
        null;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? updatedOrder
              ? { ...o, ...updatedOrder }
              : payload.status
                ? { ...o, status: payload.status }
                : o
            : o
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setPendingOrderIds((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  // Advance an order along the shared kitchen workflow
  // (pending -> accepted -> preparing -> ready_for_pickup).
  const handleAdvance = async (orderId: string, fromStatus: KitchenActionableStatus) => {
    const transition = KITCHEN_NEXT_TRANSITION[fromStatus];
    await updateOrderStatus(orderId, {
      action: transition.action,
      status: transition.nextStatus,
    });
  };

  const handleReject = async (orderId: string) => {
    await updateOrderStatus(orderId, {
      action: KITCHEN_REJECT_TRANSITION.action,
      status: KITCHEN_REJECT_TRANSITION.nextStatus,
      reason: 'other',
      notes: 'Rejected by chef',
    });
  };

  return (
    <>
      <OrderToast toasts={toasts} onDismiss={dismissToast} />
      {error && (
        <div className="mb-4 rounded-lg bg-dangerSoft p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <LiveIndicator status={realtimeStatus} />
      </div>

      <section className="mt-4 rounded-lg border border-divider bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-text">Kitchen workflow</h2>
            <p className="text-sm text-textMuted">Track decisions, prep, and pickup handoff from one queue.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['New decisions', workflowMetrics.decisions],
            ['In prep', workflowMetrics.inPrep],
            ['Ready for pickup', workflowMetrics.readyForPickup],
            ['Late tickets', workflowMetrics.late],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-divider bg-surfaceMuted p-3">
              <p className="text-xs font-semibold uppercase text-textMuted">{label}</p>
              <p className="mt-1 text-2xl font-bold text-text">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-3 flex gap-2 flex-wrap">
        {['all', 'pending', 'accepted', 'preparing', 'ready_for_pickup'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'All' : formatStatus(status)}
          </Button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <p className="py-8 text-center text-sm text-textMuted">
              No {filter === 'all' ? '' : formatStatus(filter).toLowerCase()} orders
            </p>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className={order.status === 'pending' ? 'border-2 border-primary/40 shadow-lg' : ''}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text">{order.order_number}</span>
                    <Badge
                      variant={
                        order.status === 'pending' ? 'warning' :
                        order.status === 'accepted' ? 'info' :
                        order.status === 'preparing' ? 'info' :
                        order.status === 'ready_for_pickup' ? 'success' :
                        order.status === 'expired' ? 'error' : 'default'
                      }
                    >
                      {formatStatus(order.status)}
                    </Badge>
                    {order.status === 'pending' && (
                      <div className="flex items-center gap-1 rounded-full bg-primarySoft px-2 py-1 text-xs">
                        <span className="text-primary">Accept in:</span>
                        <CountdownTimer
                          createdAt={order.created_at}
                          orderId={order.id}
                          onExpire={handleOrderExpire}
                        />
                      </div>
                    )}
                  </div>

                  {(() => {
                    const workflow = getWorkflow(order);
                    return (
                      <div className="mt-3 rounded-lg border border-primary/20 bg-primarySoft p-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-semibold uppercase text-primary">Kitchen step</p>
                              <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-primary">
                                {workflow.focus}
                              </span>
                            </div>
                            <p className="mt-1 text-base font-bold text-text">{workflow.step}</p>
                            <p className="mt-1 text-sm text-textMuted">{workflow.guidance}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm md:min-w-64">
                            <div className="rounded-lg bg-white/70 p-2">
                              <p className="text-xs font-semibold uppercase text-textMuted">Next action</p>
                              <p className="mt-1 font-semibold text-text">{workflow.nextAction}</p>
                            </div>
                            <div className="rounded-lg bg-white/70 p-2">
                              <p className="text-xs font-semibold uppercase text-textMuted">Timing</p>
                              <p className="mt-1 font-semibold text-text">{getReadyTiming(order)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    <div className="rounded-lg border border-divider bg-surfaceMuted p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Customer</p>
                      {order.customer ? (
                        <div className="mt-1 text-sm text-text">
                          <p className="font-medium text-text">{order.customer.first_name} {order.customer.last_name}</p>
                          <p>{order.customer.phone || 'No phone'}</p>
                          {order.customer.email ? <p>{order.customer.email}</p> : null}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-textMuted">Customer not linked</p>
                      )}
                    </div>
                    <div className="rounded-lg border border-divider bg-surfaceMuted p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Delivery</p>
                      {order.address ? (
                        <div className="mt-1 text-sm text-text">
                          <p className="font-medium text-text">{order.address.address_line1}</p>
                          {order.address.address_line2 ? <p>{order.address.address_line2}</p> : null}
                          <p>{order.address.city}, {order.address.state} {order.address.postal_code}</p>
                          {order.address.delivery_instructions ? <p className="mt-1 italic">{order.address.delivery_instructions}</p> : null}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-textMuted">Delivery address not linked</p>
                      )}
                    </div>
                    <div className="rounded-lg border border-divider bg-surfaceMuted p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Payment & Ops</p>
                      <div className="mt-1 text-sm text-text">
                        <p><span className="font-medium text-text">{money(order.total)}</span> total</p>
                        <p>Payment: {formatStatus(order.payment_status)}</p>
                        <p>Delivery: {formatStatus(order.delivery?.status)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 overflow-hidden rounded-lg border border-divider">
                    <div className="grid grid-cols-[1fr_54px_80px] bg-surfaceMuted px-3 py-2 text-xs font-semibold uppercase tracking-wide text-textMuted">
                      <span>Kitchen ticket</span>
                      <span className="text-center">Qty</span>
                      <span className="text-right">Line</span>
                    </div>
                    {(order.items ?? []).length > 0 ? (
                      (order.items ?? []).map((item) => (
                        <div key={item.id} className="grid grid-cols-[1fr_54px_80px] border-t border-divider px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium text-text">{item.menu_item?.name || 'Unknown item'}</p>
                            {item.special_instructions ? (
                              <p className="mt-0.5 text-xs italic text-primary">Item note: {item.special_instructions}</p>
                            ) : null}
                          </div>
                          <span className="text-center font-semibold text-text">{item.quantity}</span>
                          <span className="text-right text-text">{money(item.total_price)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="border-t border-divider px-3 py-3 text-sm text-textMuted">
                        No line items are attached to this order yet.
                      </div>
                    )}
                  </div>

                  {order.special_instructions && (
                    <p className="mt-2 text-sm italic text-textMuted">
                      Note: {order.special_instructions}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-textMuted">
                    <span>Subtotal {money(order.subtotal)}</span>
                    <span>Delivery {money(order.delivery_fee)}</span>
                    <span>Service {money(order.service_fee)}</span>
                    <span>Tax {money(order.tax)}</span>
                    <span>Tip {money(order.tip)}</span>
                    <span>Created {new Date(order.created_at).toLocaleString()}</span>
                    {order.estimated_ready_at ? <span>ETA {new Date(order.estimated_ready_at).toLocaleTimeString()}</span> : null}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="inline-flex min-h-9 items-center rounded-lg border border-borderStrong px-3 text-sm font-medium text-text hover:bg-surfaceMuted"
                  >
                    Full Details
                  </Link>
                  {order.status === 'pending' && (
                    <>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(order.id)}
                        disabled={Boolean(pendingOrderIds[order.id])}
                      >
                        {KITCHEN_REJECT_TRANSITION.buttonLabel}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAdvance(order.id, 'pending')}
                        disabled={Boolean(pendingOrderIds[order.id])}
                      >
                        {KITCHEN_NEXT_TRANSITION.pending.buttonLabel}
                      </Button>
                    </>
                  )}
                  {order.status === 'accepted' && (
                    <Button
                      size="sm"
                      onClick={() => handleAdvance(order.id, 'accepted')}
                      disabled={Boolean(pendingOrderIds[order.id])}
                    >
                      {pendingOrderIds[order.id] ? 'Updating...' : KITCHEN_NEXT_TRANSITION.accepted.buttonLabel}
                    </Button>
                  )}
                  {order.status === 'preparing' && (
                    <Button
                      size="sm"
                      onClick={() => handleAdvance(order.id, 'preparing')}
                      disabled={Boolean(pendingOrderIds[order.id])}
                    >
                      {pendingOrderIds[order.id] ? 'Updating...' : KITCHEN_NEXT_TRANSITION.preparing.buttonLabel}
                    </Button>
                  )}
                  {order.status === 'ready_for_pickup' && (
                    <Badge variant="success">Waiting for driver</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
