// ==========================================
// KITCHEN STATE SYNC (Stage 4/5) — best-effort, non-blocking
//
// After the ENGINE performs an order status transition, mirror it into the
// internal kitchen tables (kitchen_queue_entries + kitchen_tickets) so the
// kitchen has durable, order-linked truth. This NEVER drives the public order
// status (that stays with the engine) and NEVER throws — any failure is logged
// and swallowed so the order action is unaffected.
// ==========================================

import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import {
  kitchenStatusForOrderStatus,
  shouldPreserveKitchenStatus,
  isKitchenTicketStatus,
} from '@ridendine/engine';

// Public order status -> kitchen_queue_entries.status.
function queueStatusForOrderStatus(orderStatus: string): 'queued' | 'in_progress' | 'completed' | 'cancelled' | null {
  switch (orderStatus) {
    case 'accepted':
      return 'queued';
    case 'preparing':
      return 'in_progress';
    case 'ready_for_pickup':
    case 'out_for_delivery':
    case 'delivered':
    case 'completed':
      return 'completed';
    case 'rejected':
    case 'cancelled':
    case 'expired':
      return 'cancelled';
    default:
      return null;
  }
}

export async function syncKitchenState(orderId: string): Promise<void> {
  try {
    const admin = createAdminClient() as unknown as SupabaseClient;

    const { data: order } = await admin
      .from('orders')
      .select('id, storefront_id, status, estimated_prep_minutes, prep_started_at')
      .eq('id', orderId)
      .maybeSingle();
    if (!order || !order.storefront_id) return;

    const nowIso = new Date().toISOString();
    const derived = kitchenStatusForOrderStatus(order.status);

    // ---- kitchen_tickets ----
    if (derived) {
      const { data: existingTicket } = await admin
        .from('kitchen_tickets')
        .select('id, kitchen_status')
        .eq('order_id', orderId)
        .maybeSingle();

      let kitchenStatus: string = derived;
      if (existingTicket && shouldPreserveKitchenStatus(existingTicket.kitchen_status, derived)) {
        kitchenStatus = existingTicket.kitchen_status;
      }

      const stamps: Record<string, unknown> = { kitchen_status: kitchenStatus };
      if (isKitchenTicketStatus(kitchenStatus)) {
        if (kitchenStatus === 'preparing') stamps.started_at = order.prep_started_at ?? nowIso;
        if (kitchenStatus === 'ready') stamps.ready_at = nowIso;
      }

      if (existingTicket) {
        await admin.from('kitchen_tickets').update(stamps).eq('id', existingTicket.id);
      } else {
        await admin.from('kitchen_tickets').insert({
          storefront_id: order.storefront_id,
          order_id: orderId,
          kitchen_status: kitchenStatus,
          ...(kitchenStatus === 'preparing' ? { started_at: order.prep_started_at ?? nowIso } : {}),
          ...(kitchenStatus === 'ready' ? { ready_at: nowIso } : {}),
        });
      }
    }

    // ---- kitchen_queue_entries ----
    const queueStatus = queueStatusForOrderStatus(order.status);
    if (queueStatus) {
      const { data: existingQueue } = await admin
        .from('kitchen_queue_entries')
        .select('id, started_at')
        .eq('order_id', orderId)
        .maybeSingle();

      if (existingQueue) {
        const patch: Record<string, unknown> = { status: queueStatus };
        if (queueStatus === 'in_progress' && !existingQueue.started_at) patch.started_at = order.prep_started_at ?? nowIso;
        if (queueStatus === 'completed') patch.completed_at = nowIso;
        await admin.from('kitchen_queue_entries').update(patch).eq('id', existingQueue.id);
      } else if (queueStatus !== 'cancelled') {
        // New entry — position after current active entries.
        const { count } = await admin
          .from('kitchen_queue_entries')
          .select('id', { count: 'exact', head: true })
          .eq('storefront_id', order.storefront_id)
          .in('status', ['queued', 'in_progress']);
        await admin.from('kitchen_queue_entries').insert({
          storefront_id: order.storefront_id,
          order_id: orderId,
          position: (count ?? 0) + 1,
          estimated_prep_minutes: order.estimated_prep_minutes ?? 20,
          status: queueStatus,
          ...(queueStatus === 'in_progress' ? { started_at: order.prep_started_at ?? nowIso } : {}),
        });
      }
    }
  } catch (error) {
    // Best-effort only — never affect the order action.
    console.error('syncKitchenState (best-effort) failed:', error);
  }
}
