'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, LiveIndicator } from '@ridendine/ui';
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

function urgencyTarget(ticket: KitchenTicket): number {
  if (ticket.estimatedReadyAt) {
    return new Date(ticket.estimatedReadyAt).getTime();
  }
  if (ticket.prepStartedAt && ticket.estimatedPrepMinutes != null) {
    return new Date(ticket.prepStartedAt).getTime() + ticket.estimatedPrepMinutes * 60_000;
  }
  return Infinity;
}

function sortTickets(tickets: KitchenTicket[]): KitchenTicket[] {
  return [...tickets].sort((a, b) => {
    const aPending = a.status === 'pending' ? 0 : 1;
    const bPending = b.status === 'pending' ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return urgencyTarget(a) - urgencyTarget(b);
  });
}

function reconcileQueue(
  prev: KitchenTicket[],
  incoming: KitchenTicket[],
  inFlightIds: Set<string>
): KitchenTicket[] {
  const incomingById = new Map(incoming.map((t) => [t.id, t]));
  const merged: KitchenTicket[] = prev
    .filter((t) => incomingById.has(t.id))
    .map((t) => (inFlightIds.has(t.id) ? t : incomingById.get(t.id)!));
  const existingIds = new Set(prev.map((t) => t.id));
  for (const t of incoming) {
    if (!existingIds.has(t.id)) merged.push(t);
  }
  return sortTickets(merged);
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

type ColumnKey = 'new' | 'preparing' | 'ready';

const COLUMNS: { key: ColumnKey; label: string; statuses: string[]; accent: string; headerBg: string; countBg: string }[] = [
  {
    key: 'new',
    label: 'New Orders',
    statuses: ['pending'],
    accent: 'border-l-warning',
    headerBg: 'bg-warningSoft',
    countBg: 'bg-warning text-white',
  },
  {
    key: 'preparing',
    label: 'Preparing',
    statuses: ['accepted', 'preparing'],
    accent: 'border-l-info',
    headerBg: 'bg-infoSoft',
    countBg: 'bg-info text-white',
  },
  {
    key: 'ready',
    label: 'Ready',
    statuses: ['ready_for_pickup'],
    accent: 'border-l-success',
    headerBg: 'bg-successSoft',
    countBg: 'bg-success text-white',
  },
];

// ---------------------------------------------------------------------------
// Ticket card
// ---------------------------------------------------------------------------

interface TicketCardProps {
  ticket: KitchenTicket;
  accent: string;
  isInFlight: boolean;
  onAction: (ticket: KitchenTicket, action: string, nextStatus: string) => void;
}

function TicketCard({ ticket, accent, isInFlight, onAction }: TicketCardProps) {
  const nextTransition = (KITCHEN_NEXT_TRANSITION as Record<string, KitchenTransition | undefined>)[ticket.status];

  return (
    <div
      className={`rounded-xl bg-white shadow-sm border border-border border-l-4 ${accent} flex flex-col gap-3 p-4`}
    >
      {/* Order number + countdown */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-lg font-bold text-text leading-none">#{ticket.orderNumber}</span>
          {ticket.customerName && (
            <p className="mt-0.5 text-sm text-textMuted">{ticket.customerName}</p>
          )}
        </div>
        <PrepCountdown
          estimatedReadyAt={ticket.estimatedReadyAt}
          prepStartedAt={ticket.prepStartedAt}
          estimatedPrepMinutes={ticket.estimatedPrepMinutes}
          status={ticket.status}
          large
        />
      </div>

      {/* Items */}
      {ticket.items.length > 0 && (
        <ul className="space-y-0.5 border-t border-divider pt-3">
          {ticket.items.map((item, idx) => (
            <li key={idx} className="flex items-baseline gap-1.5 text-sm">
              <span className="font-semibold text-text tabular-nums">{item.quantity}x</span>
              <span className="text-text">{item.name}</span>
              {item.specialInstructions && (
                <span className="text-warning text-xs">({item.specialInstructions})</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Special instructions */}
      {ticket.specialInstructions && (
        <p className="rounded-lg border border-warning/30 bg-warningSoft px-3 py-2 text-xs text-warning">
          Note: {ticket.specialInstructions}
        </p>
      )}

      {/* Actions */}
      {nextTransition && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onAction(ticket, nextTransition.action, nextTransition.nextStatus)}
            disabled={isInFlight}
          >
            {isInFlight ? '...' : nextTransition.buttonLabel}
          </Button>
          {ticket.status === 'pending' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAction(ticket, KITCHEN_REJECT_TRANSITION.action, KITCHEN_REJECT_TRANSITION.nextStatus)}
              disabled={isInFlight}
            >
              Reject
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KDS column
// ---------------------------------------------------------------------------

interface KDSColumnProps {
  col: typeof COLUMNS[number];
  tickets: KitchenTicket[];
  inFlightIds: React.RefObject<Set<string>>;
  onAction: (ticket: KitchenTicket, action: string, nextStatus: string) => void;
}

function KDSColumn({ col, tickets, inFlightIds, onAction }: KDSColumnProps) {
  const colTickets = tickets.filter((t) => col.statuses.includes(t.status));

  return (
    <div className="flex flex-col min-h-0">
      {/* Column header */}
      <div className={`rounded-t-xl px-4 py-2.5 flex items-center justify-between ${col.headerBg}`}>
        <span className="font-semibold text-sm text-text">{col.label}</span>
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${col.countBg}`}>
          {colTickets.length}
        </span>
      </div>

      {/* Ticket list */}
      <div className="flex-1 rounded-b-xl border border-t-0 border-divider bg-surfaceMuted p-3 space-y-3">
        {colTickets.length === 0 ? (
          <p className="py-8 text-center text-sm text-textSubtle">No orders</p>
        ) : (
          colTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              accent={col.accent}
              isInFlight={inFlightIds.current?.has(ticket.id) ?? false}
              onAction={onAction}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
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

  useEffect(() => {
    setQueue((prev) => reconcileQueue(prev, tickets, inFlightIds.current));
  }, [tickets]);

  const handleInsert = useCallback((order: RealtimeOrder) => {
    if (notifiedIds.current.has(order.id)) {
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

  const handleUpdate = useCallback((order: RealtimeOrder) => {
    if (inFlightIds.current.has(order.id)) return;
    setQueue((prev) =>
      sortTickets(prev.map((t) => (t.id === order.id ? { ...t, status: order.status } : t)))
    );
  }, []);

  useStorefrontOrdersRealtime<RealtimeOrder>(storefrontId, {
    onInsert: handleInsert,
    onUpdate: handleUpdate,
    onConnectionChange: setRealtimeStatus,
  });

  const handleAction = useCallback(
    async (ticket: KitchenTicket, action: string, nextStatus: string) => {
      if (inFlightIds.current.has(ticket.id)) return;
      inFlightIds.current.add(ticket.id);
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
          setQueue((prev) =>
            sortTickets(prev.map((t) => (t.id === ticket.id ? { ...t, status: ticket.status } : t)))
          );
        }
      } catch {
        setQueue((prev) =>
          sortTickets(prev.map((t) => (t.id === ticket.id ? { ...t, status: ticket.status } : t)))
        );
      } finally {
        inFlightIds.current.delete(ticket.id);
        setQueue((prev) => sortTickets([...prev]));
      }
    },
    []
  );

  const totalActive = queue.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-text">Live Orders</h2>
          {newCount > 0 && (
            <Badge
              tone="danger"
              aria-label={`${newCount} new orders since page load. Click to dismiss.`}
              className="cursor-pointer"
              onClick={() => setNewCount(0)}
            >
              {newCount} new
            </Badge>
          )}
          {totalActive > 0 && (
            <span className="text-sm text-textMuted">{totalActive} active</span>
          )}
        </div>
        <LiveIndicator status={realtimeStatus} />
      </div>

      {/* KDS board - 3 columns */}
      {queue.length === 0 ? (
        <div className="rounded-xl border border-divider bg-surfaceMuted py-16 text-center">
          <p className="text-textMuted">No active orders right now</p>
          <p className="mt-1 text-xs text-textSubtle">New orders will appear here automatically</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <KDSColumn
              key={col.key}
              col={col}
              tickets={queue}
              inFlightIds={inFlightIds}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
