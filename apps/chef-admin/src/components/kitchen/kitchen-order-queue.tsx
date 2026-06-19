'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, LiveIndicator } from '@ridendine/ui';
import type { LiveIndicatorStatus } from '@ridendine/ui';
import { KITCHEN_NEXT_TRANSITION, KITCHEN_REJECT_TRANSITION } from '@ridendine/utils';
import type { KitchenTransition } from '@ridendine/utils';
import { playNewOrderChime } from '@/lib/sound';
import { useStorefrontOrdersRealtime } from '@/hooks/use-storefront-orders-realtime';
import { PrepCountdown } from './prep-countdown';
import type { KitchenTicket } from '@/lib/kitchen';

/** Minimal shape the realtime hook delivers for kitchen tickets. */
interface RealtimeOrder {
  id: string;
  order_number?: string | null;
  status: string;
  created_at?: string | null;
  storefront_id?: string | null;
  customer?: { first_name?: string | null; last_name?: string | null } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the target epoch (ms) for urgency sorting.
 * Lower value = more urgent (overdue tickets are most negative).
 * Returns Infinity for tickets with no estimable deadline.
 */
function urgencyTarget(ticket: KitchenTicket): number {
  if (ticket.estimatedReadyAt) {
    return new Date(ticket.estimatedReadyAt).getTime();
  }
  if (ticket.prepStartedAt && ticket.estimatedPrepMinutes != null) {
    return new Date(ticket.prepStartedAt).getTime() + ticket.estimatedPrepMinutes * 60_000;
  }
  return Infinity;
}

/**
 * Sort so that:
 * 1. pending orders always come first (chefs must accept them)
 * 2. then by urgency target ascending (most overdue first)
 * 3. no-ETA orders last (Infinity sort key)
 */
function sortTickets(tickets: KitchenTicket[]): KitchenTicket[] {
  return [...tickets].sort((a, b) => {
    const aPending = a.status === 'pending' ? 0 : 1;
    const bPending = b.status === 'pending' ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return urgencyTarget(a) - urgencyTarget(b);
  });
}

/**
 * Reconcile an incoming prop update with the local queue.
 * For tickets that are currently in-flight (being PATCHed), keep the local
 * optimistic version - do NOT revert to the prop's stale status.
 */
function reconcileQueue(
  prev: KitchenTicket[],
  incoming: KitchenTicket[],
  inFlightIds: Set<string>
): KitchenTicket[] {
  const incomingById = new Map(incoming.map((t) => [t.id, t]));

  // Keep the local version for in-flight tickets; use incoming for others.
  const merged: KitchenTicket[] = prev
    .filter((t) => incomingById.has(t.id))
    .map((t) => (inFlightIds.has(t.id) ? t : incomingById.get(t.id)!));

  // Prepend any brand-new tickets from the incoming prop (new from the poll).
  const existingIds = new Set(prev.map((t) => t.id));
  for (const t of incoming) {
    if (!existingIds.has(t.id)) merged.push(t);
  }

  return sortTickets(merged);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface KitchenOrderQueueProps {
  tickets: KitchenTicket[];
  storefrontId: string;
}

export function KitchenOrderQueue({ tickets, storefrontId }: KitchenOrderQueueProps) {
  const [queue, setQueue] = useState<KitchenTicket[]>(() => sortTickets(tickets));
  const [newCount, setNewCount] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState<LiveIndicatorStatus>('connecting');
  const inFlightIds = useRef<Set<string>>(new Set());
  const notifiedIds = useRef<Set<string>>(new Set());

  // Reconcile when the prop changes (30s poll or parent re-fetch)
  useEffect(() => {
    setQueue((prev) => reconcileQueue(prev, tickets, inFlightIds.current));
  }, [tickets]);

  // Realtime INSERT handler - prepend and chime.
  // The hook calls onInsert twice: first with the thin CDC row, then with the
  // hydrated order from /api/orders/:id. On the first call we add the ticket
  // and play the chime. On the second call we patch in the enriched fields
  // (customerName, status) that were absent from the thin row.
  const handleInsert = useCallback((order: RealtimeOrder) => {
    if (notifiedIds.current.has(order.id)) {
      // Hydrated INSERT - patch enriched fields into the existing ticket
      const enrichedName = order.customer
        ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim() || null
        : null;
      setQueue((prev) =>
        sortTickets(
          prev.map((t) =>
            t.id === order.id
              ? {
                  ...t,
                  orderNumber: order.order_number ?? t.orderNumber,
                  status: order.status ?? t.status,
                  customerName: enrichedName ?? t.customerName,
                }
              : t
          )
        )
      );
      return;
    }
    notifiedIds.current.add(order.id);
    playNewOrderChime();
    setNewCount((c) => c + 1);
    const newTicket: KitchenTicket = {
      id: order.id,
      orderNumber: order.order_number ?? order.id,
      status: order.status,
      createdAt: order.created_at ?? new Date().toISOString(),
      prepStartedAt: null,
      estimatedReadyAt: null,
      estimatedPrepMinutes: null,
      specialInstructions: null,
      customerName:
        order.customer
          ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim() || null
          : null,
      items: [],
      totalQty: 0,
    };
    setQueue((prev) => sortTickets([newTicket, ...prev]));
  }, []);

  // Realtime UPDATE handler - patch the ticket in place (unless in-flight)
  const handleUpdate = useCallback((order: RealtimeOrder) => {
    if (inFlightIds.current.has(order.id)) return;
    setQueue((prev) =>
      sortTickets(
        prev.map((t) =>
          t.id === order.id ? { ...t, status: order.status } : t
        )
      )
    );
  }, []);

  useStorefrontOrdersRealtime<RealtimeOrder>(storefrontId, {
    onInsert: handleInsert,
    onUpdate: handleUpdate,
    onConnectionChange: setRealtimeStatus,
  });

  // Action handler - optimistic update + PATCH
  const handleAction = useCallback(
    async (ticket: KitchenTicket, action: string, nextStatus: string) => {
      if (inFlightIds.current.has(ticket.id)) return;
      inFlightIds.current.add(ticket.id);
      // Optimistic update
      setQueue((prev) =>
        sortTickets(prev.map((t) => (t.id === ticket.id ? { ...t, status: nextStatus } : t)))
      );
      try {
        const res = await fetch(`/api/orders/${ticket.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, status: nextStatus }),
        });
        if (!res.ok) {
          // Revert on failure
          setQueue((prev) =>
            sortTickets(prev.map((t) => (t.id === ticket.id ? { ...t, status: ticket.status } : t)))
          );
        }
      } catch {
        // Revert on network error
        setQueue((prev) =>
          sortTickets(prev.map((t) => (t.id === ticket.id ? { ...t, status: ticket.status } : t)))
        );
      } finally {
        inFlightIds.current.delete(ticket.id);
        // Re-render so isInFlight re-reads the updated ref and the button
        // re-enables. sortTickets([...prev]) produces a new array reference
        // which is required since React bails out on same-reference state.
        setQueue((prev) => sortTickets([...prev]));
      }
    },
    []
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Live Orders</h2>
          {newCount > 0 && (
            <Badge
              variant="danger"
              aria-label={`${newCount} new orders since page load. Click to dismiss.`}
              className="cursor-pointer"
              onClick={() => setNewCount(0)}
            >
              {newCount} new
            </Badge>
          )}
        </div>
        <LiveIndicator status={realtimeStatus} />
      </div>

      {/* Empty state */}
      {queue.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          No active orders
        </div>
      )}

      {/* Ticket cards */}
      {queue.map((ticket) => {
        const nextTransition = (KITCHEN_NEXT_TRANSITION as Record<string, KitchenTransition | undefined>)[ticket.status];
        const isInFlight = inFlightIds.current.has(ticket.id);

        return (
          <Card key={ticket.id} className="p-4 space-y-3">
            {/* Row 1: order number + status + countdown */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">{ticket.orderNumber}</span>
                <Badge variant={ticket.status === 'pending' ? 'warning' : undefined}>
                  {ticket.status}
                </Badge>
              </div>
              <PrepCountdown
                estimatedReadyAt={ticket.estimatedReadyAt}
                prepStartedAt={ticket.prepStartedAt}
                estimatedPrepMinutes={ticket.estimatedPrepMinutes}
                status={ticket.status}
              />
            </div>

            {/* Row 2: customer + qty */}
            {(ticket.customerName || ticket.totalQty > 0) && (
              <div className="text-sm text-muted-foreground">
                {ticket.customerName && <span>{ticket.customerName} &bull; </span>}
                <span>{ticket.totalQty} item{ticket.totalQty !== 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Row 3: item list */}
            {ticket.items.length > 0 && (
              <ul className="text-sm space-y-0.5">
                {ticket.items.map((item, idx) => (
                  <li key={idx}>
                    {item.quantity}&times; {item.name}
                    {item.specialInstructions && (
                      <span className="text-warning ml-1">({item.specialInstructions})</span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Row 4: special instructions */}
            {ticket.specialInstructions && (
              <p className="text-sm text-warning border border-warning/30 rounded px-2 py-1">
                Note: {ticket.specialInstructions}
              </p>
            )}

            {/* Row 5: action buttons */}
            {nextTransition && (
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={() =>
                    handleAction(ticket, nextTransition.action, nextTransition.nextStatus)
                  }
                  disabled={isInFlight}
                >
                  {nextTransition.buttonLabel}
                </Button>
                {ticket.status === 'pending' && (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      handleAction(ticket, KITCHEN_REJECT_TRANSITION.action, KITCHEN_REJECT_TRANSITION.nextStatus)
                    }
                    disabled={isInFlight}
                  >
                    {KITCHEN_REJECT_TRANSITION.buttonLabel}
                  </Button>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
