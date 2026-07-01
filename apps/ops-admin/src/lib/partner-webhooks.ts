// ==========================================
// PARTNER WEBHOOK DELIVERY
// Delivers order-lifecycle events to partners that registered a webhook_url.
// Enqueues from order_status_history (the persistent status-transition log;
// domain_events is volatile/pruned), idempotent on the history row id, then
// delivers pending/failed rows with HMAC-signed bodies and exponential-backoff
// retry. Driven by the partner-webhooks processor cron.
// ==========================================

import { createHmac } from 'crypto';
import {
  insertPartnerWebhookDeliveries,
  listDuePartnerWebhookDeliveries,
  listExistingPartnerWebhookDomainEventIds,
  listPartnerWebhookOrders,
  listPartnerWebhookPartners,
  listPartnerWebhookStatusEvents,
  updatePartnerWebhookDelivery,
  type PartnerWebhookDeliveryInsert,
  type PartnerWebhookOrderRow,
  type PartnerWebhookPartnerRow,
  type SupabaseClient,
} from '@ridendine/db';

/** order status (new_status) -> partner-facing event name. Only these deliver. */
const STATUS_EVENTS: Record<string, string> = {
  accepted: 'order.accepted',
  preparing: 'order.preparing',
  ready_for_pickup: 'order.ready',
  out_for_delivery: 'order.out_for_delivery',
  delivered: 'order.delivered',
  completed: 'order.delivered',
  cancelled: 'order.cancelled',
  rejected: 'order.rejected',
};

const ENQUEUE_WINDOW_MS = 48 * 60 * 60 * 1000;
const DELIVER_BATCH = 100;
const REQUEST_TIMEOUT_MS = 8000;

function backoffMs(attempts: number): number {
  // 1, 2, 4, 8, 16, 32 minutes
  return Math.min(2 ** attempts, 32) * 60 * 1000;
}

/**
 * Create pending delivery rows for new deliverable order events that belong to a
 * partner with a webhook_url. Idempotent: domain_event_id is unique.
 */
export async function enqueuePartnerWebhooks(
  admin: SupabaseClient,
  nowMs: number
): Promise<number> {
  const since = new Date(nowMs - ENQUEUE_WINDOW_MS).toISOString();
  const eventRows = await listPartnerWebhookStatusEvents(
    admin,
    Object.keys(STATUS_EVENTS),
    since,
    1000
  );
  if (eventRows.length === 0) return 0;

  const orderIds = Array.from(new Set(eventRows.map((e) => e.order_id)));
  const orders = await listPartnerWebhookOrders(admin, orderIds);
  const orderById = new Map<string, PartnerWebhookOrderRow>(orders.map((o) => [o.id, o]));

  const partnerIds = Array.from(
    new Set(orders.map((o) => o.partner_id).filter(Boolean) as string[])
  );
  if (partnerIds.length === 0) return 0;
  const partners = await listPartnerWebhookPartners(admin, partnerIds);
  const partnerById = new Map<string, PartnerWebhookPartnerRow>(
    partners
      .filter((p) => p.is_active && p.webhook_url)
      .map((p) => [p.id, p])
  );
  if (partnerById.size === 0) return 0;

  // Skip events that already have a delivery row.
  const existing = await listExistingPartnerWebhookDomainEventIds(admin, eventRows.map((e) => e.id));
  const seen = new Set(existing);

  const toInsert: PartnerWebhookDeliveryInsert[] = [];
  for (const ev of eventRows) {
    if (seen.has(ev.id)) continue;
    const partnerEvent = STATUS_EVENTS[ev.new_status];
    if (!partnerEvent) continue;
    const order = orderById.get(ev.order_id);
    if (!order?.partner_id) continue;
    const partner = partnerById.get(order.partner_id);
    if (!partner) continue;

    toInsert.push({
      partner_id: partner.id,
      order_id: order.id,
      domain_event_id: ev.id,
      event_type: partnerEvent,
      payload: {
        event: partnerEvent,
        order: {
          id: order.id,
          orderNumber: order.order_number,
          status: order.status,
          engineStatus: order.engine_status,
          total: order.total,
        },
        occurredAt: ev.created_at,
      },
      status: 'pending',
      next_attempt_at: new Date(nowMs).toISOString(),
    });
  }

  await insertPartnerWebhookDeliveries(admin, toInsert);
  return toInsert.length;
}

/**
 * Deliver due pending/failed rows. Signs the body with the partner's secret
 * (HMAC-SHA256) and applies exponential backoff; rows past max_attempts go dead.
 */
export async function deliverPartnerWebhooks(
  admin: SupabaseClient,
  nowMs: number
): Promise<{ delivered: number; failed: number }> {
  const nowIso = new Date(nowMs).toISOString();
  const rows = await listDuePartnerWebhookDeliveries(admin, nowIso, DELIVER_BATCH);

  let delivered = 0;
  let failed = 0;

  for (const row of rows) {
    const url = row.api_partners?.webhook_url;
    if (!url) continue;
    const body = JSON.stringify({ id: row.id, ...row.payload });
    const signature = createHmac('sha256', row.api_partners.webhook_secret || '')
      .update(body)
      .digest('hex');

    let ok = false;
    let responseCode: number | null = null;
    let errorMsg: string | null = null;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-RideNDine-Event': row.event_type,
          'X-RideNDine-Delivery': row.id,
          'X-RideNDine-Signature': `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      responseCode = res.status;
      ok = res.ok;
      if (!ok) errorMsg = `HTTP ${res.status}`;
    } catch (err) {
      errorMsg = err instanceof Error ? err.message.slice(0, 300) : 'request failed';
    }

    if (ok) {
      delivered++;
      await updatePartnerWebhookDelivery(
        admin,
        row.id,
        {
          status: 'delivered',
          attempts: row.attempts + 1,
          response_code: responseCode,
          last_error: null,
          delivered_at: nowIso,
        }
      );
    } else {
      failed++;
      const nextAttempts = row.attempts + 1;
      const dead = nextAttempts >= row.max_attempts;
      await updatePartnerWebhookDelivery(
        admin,
        row.id,
        {
          status: dead ? 'dead' : 'failed',
          attempts: nextAttempts,
          response_code: responseCode,
          last_error: errorMsg,
          next_attempt_at: new Date(nowMs + backoffMs(nextAttempts)).toISOString(),
        }
      );
    }
  }

  return { delivered, failed };
}

export async function runPartnerWebhookProcessor(
  admin: SupabaseClient,
  nowMs: number
): Promise<{ enqueued: number; delivered: number; failed: number }> {
  const enqueued = await enqueuePartnerWebhooks(admin, nowMs);
  const { delivered, failed } = await deliverPartnerWebhooks(admin, nowMs);
  return { enqueued, delivered, failed };
}
