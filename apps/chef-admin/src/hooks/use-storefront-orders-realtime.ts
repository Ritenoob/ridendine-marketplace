'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  chefStorefrontOrdersChannel,
  createBrowserClient,
  parseOrdersRealtimeRow,
} from '@ridendine/db';
import type { LiveIndicatorStatus } from '@ridendine/ui';

export interface RealtimeOrderCallbacks<T extends { id: string }> {
  /** Called on INSERT: once with the thin realtime row, then again (if hydrate is enabled) with the full order from the API. */
  onInsert: (order: T) => void;
  /** Called on UPDATE: once with the thin realtime row, then again (if hydrate is enabled) with the full order from the API. */
  onUpdate: (order: T) => void;
  /** Optional connection status listener. */
  onConnectionChange?: (status: LiveIndicatorStatus) => void;
  /**
   * When true (default), best-effort fetches /api/orders/:id after each event
   * and calls onInsert/onUpdate again with the enriched response.
   */
  hydrate?: boolean;
}

/**
 * Subscribes to Supabase realtime postgres_changes for a chef storefront's orders.
 * Scoped to a single storefront via both the channel filter and a client-side guard.
 * Fail-closed: malformed payloads are silently dropped; the channel is never torn down
 * due to a bad message. Hydration is best-effort; the thin row always fires first.
 */
export function useStorefrontOrdersRealtime<T extends { id: string }>(
  storefrontId: string | null,
  callbacks: RealtimeOrderCallbacks<T>
): void {
  const supabase = useMemo(() => createBrowserClient(), []);

  // Stable ref so the channel effect does not re-subscribe on every render
  // when the consumer passes inline callback literals.
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    if (!supabase || !storefrontId) return;

    const hydrateOrder = async (orderId: string): Promise<T | null> => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) return null;
        const json = await res.json();
        return (json.data?.order ?? json.order ?? null) as T | null;
      } catch {
        return null;
      }
    };

    const db = supabase;
    const filterStr = `storefront_id=eq.${storefrontId}`;

    const channel = db
      .channel(chefStorefrontOrdersChannel(storefrontId))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: filterStr },
        (payload: Record<string, unknown>) => {
          // A single malformed message must never tear down the subscription.
          try {
            const eventType = payload.eventType as string;
            const rawRow = payload.new;

            if (eventType === 'INSERT') {
              const row = parseOrdersRealtimeRow(rawRow);
              if (!row || row.storefront_id !== storefrontId) return;
              const thinOrder = rawRow as T;
              cbRef.current.onInsert(thinOrder);
              if (cbRef.current.hydrate !== false) {
                hydrateOrder(thinOrder.id)
                  .then((full) => { if (full) cbRef.current.onInsert(full); })
                  .catch(() => {});
              }
            } else if (eventType === 'UPDATE') {
              const row = parseOrdersRealtimeRow(rawRow);
              if (!row || row.storefront_id !== storefrontId) return;
              const thinOrder = rawRow as T;
              cbRef.current.onUpdate(thinOrder);
              if (cbRef.current.hydrate !== false) {
                hydrateOrder(thinOrder.id)
                  .then((full) => { if (full) cbRef.current.onUpdate(full); })
                  .catch(() => {});
              }
            }
          } catch (err) {
            console.error('Failed to process realtime order event', err);
          }
        }
      )
      .subscribe((status: string) => {
        const cb = cbRef.current.onConnectionChange;
        if (!cb) return;
        if (status === 'SUBSCRIBED') {
          cb('connected');
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          cb('disconnected');
        } else {
          cb('connecting');
        }
      });

    return () => {
      db.removeChannel(channel);
    };
  }, [supabase, storefrontId]);
}
