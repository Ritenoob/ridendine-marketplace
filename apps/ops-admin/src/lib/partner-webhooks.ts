// ==========================================
// PARTNER WEBHOOK DELIVERY
// Delivers order-lifecycle events to partners that registered a webhook_url.
// Enqueues from domain_events (idempotent on domain_event_id), then delivers
// pending/failed rows with HMAC-signed bodies and exponential backoff retry.
// Driven by the partner-webhooks processor cron.
// ==========================================

import { createHmac } from 'crypto';
import type { SupabaseClient } from '@ridendine/db';

/** engine domain event -> partner-facing event name. Only these are delivered. */
const DELIVERABLE_EVENTS: Record<string, string> = {
  'order.submitted': 'order.received', // paid + sent to the kitchen
  'order.accepted': 'order.accepted',
  'order.prep_started': 'order.preparing',
  'order.ready': 'order.ready',
  'order.completed': 'order.delivered',
  'order.cancelled': 'order.cancelled',
  'order.rejected': 'order.rejected',
};

const ENQUEUE_WINDOW_MS = 48 * 60 * 60 * 1000;
const DELIVER_BATCH = 100;
const REQUEST_TIMEOUT_MS = 8000;

function backoffMs(attempts: number): number {
  // 1, 2, 4, 8, 16, 32 minutes
  return Math.min(2 ** attempts, 32) * 60 * 1000;
}

interface PartnerRow {
  id: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  is_active: boolean;
}
interface OrderRow {
  id: string;
  order_number: string | null;
  partner_id: string | null;
  status: string | null;
  engine_status: string | null;
  total: number | null;
}
interface EventRow {
  id: string;
  event_type: string;
  entity_id: string;
  created_at: string;
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
  const { data: events } = await (admin as any)
    .from('domain_events')
    .select('id, event_type, entity_id, created_at')
    .in('event_type', Object.keys(DELIVERABLE_EVENTS))
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(1000);

  const eventRows = (events ?? []) as EventRow[];
  if (eventRows.length === 0) return 0;

  const orderIds = Array.from(new Set(eventRows.map((e) => e.entity_id)));
  const { data: orders } = await (admin as any)
    .from('orders')
    .select('id, order_number, partner_id, status, engine_status, total')
    .in('id', orderIds);
  const orderById = new Map<string, OrderRow>(((orders ?? []) as OrderRow[]).map((o) => [o.id, o]));

  const partnerIds = Array.from(
    new Set(((orders ?? []) as OrderRow[]).map((o) => o.partner_id).filter(Boolean) as string[])
  );
  if (partnerIds.length === 0) return 0;
  const { data: partners } = await (admin as any)
    .from('api_partners')
    .select('id, webhook_url, webhook_secret, is_active')
    .in('id', partnerIds);
  const partnerById = new Map<string, PartnerRow>(
    ((partners ?? []) as PartnerRow[])
      .filter((p) => p.is_active && p.webhook_url)
      .map((p) => [p.id, p])
  );
  if (partnerById.size === 0) return 0;

  // Skip events that already have a delivery row.
  const { data: existing } = await (admin as any)
    .from('partner_webhook_deliveries')
    .select('domain_event_id')
    .in('domain_event_id', eventRows.map((e) => e.id));
  const seen = new Set(((existing ?? []) as { domain_event_id: string }[]).map((r) => r.domain_event_id));

  const toInsert: Record<string, unknown>[] = [];
  for (const ev of eventRows) {
    if (seen.has(ev.id)) continue;
    const order = orderById.get(ev.entity_id);
    if (!order?.partner_id) continue;
    const partner = partnerById.get(order.partner_id);
    if (!partner) continue;

    toInsert.push({
      partner_id: partner.id,
      order_id: order.id,
      domain_event_id: ev.id,
      event_type: DELIVERABLE_EVENTS[ev.event_type],
      payload: {
        event: DELIVERABLE_EVENTS[ev.event_type],
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

  if (toInsert.length > 0) {
    await (admin as any).from('partner_webhook_deliveries').insert(toInsert);
  }
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
  const { data: due } = await (admin as any)
    .from('partner_webhook_deliveries')
    .select('id, partner_id, event_type, payload, attempts, max_attempts, api_partners!inner(webhook_url, webhook_secret)')
    .in('status', ['pending', 'failed'])
    .lte('next_attempt_at', nowIso)
    .order('next_attempt_at', { ascending: true })
    .limit(DELIVER_BATCH);

  const rows = (due ?? []) as Array<{
    id: string;
    event_type: string;
    payload: Record<string, unknown>;
    attempts: number;
    max_attempts: number;
    api_partners: { webhook_url: string | null; webhook_secret: string | null };
  }>;

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
      await (admin as any)
        .from('partner_webhook_deliveries')
        .update({
          status: 'delivered',
          attempts: row.attempts + 1,
          response_code: responseCode,
          last_error: null,
          delivered_at: nowIso,
        })
        .eq('id', row.id);
    } else {
      failed++;
      const nextAttempts = row.attempts + 1;
      const dead = nextAttempts >= row.max_attempts;
      await (admin as any)
        .from('partner_webhook_deliveries')
        .update({
          status: dead ? 'dead' : 'failed',
          attempts: nextAttempts,
          response_code: responseCode,
          last_error: errorMsg,
          next_attempt_at: new Date(nowMs + backoffMs(nextAttempts)).toISOString(),
        })
        .eq('id', row.id);
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
