import type { SupabaseClient } from '../client/types';

// ==========================================
// PARTNER API KEY REPOSITORY
// DB-backed, individually-revocable keys for the external storefront payment
// API. Keys are stored as sha256 hashes; the plaintext key never touches the DB.
// (Tables api_partners / api_partner_keys are not in the generated types yet —
//  use admin-client casts, consistent with platform_users access elsewhere.)
// ==========================================

export interface ResolvedPartner {
  partnerId: string;
  partnerName: string;
  testMode: boolean;
  scopes: string[];
  keyId: string;
  rateLimitPerMin: number;
  requireSignature: boolean;
  signingSecret: string | null;
}

export interface PartnerWebhookPartnerRow {
  id: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  is_active: boolean;
}

export interface PartnerWebhookOrderRow {
  id: string;
  order_number: string | null;
  partner_id: string | null;
  status: string | null;
  engine_status: string | null;
  total: number | null;
}

export interface PartnerWebhookStatusRow {
  id: string;
  order_id: string;
  new_status: string;
  created_at: string;
}

export interface PartnerWebhookDeliveryInsert {
  partner_id: string;
  order_id: string;
  domain_event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: 'pending';
  next_attempt_at: string;
}

export interface PartnerWebhookDueDeliveryRow {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  api_partners: { webhook_url: string | null; webhook_secret: string | null };
}

export interface PartnerWebhookDeliveryUpdate {
  status: 'delivered' | 'failed' | 'dead';
  attempts: number;
  response_code: number | null;
  last_error?: string | null;
  delivered_at?: string | null;
  next_attempt_at?: string;
}

/**
 * Resolve an active partner from the sha256 hash of a presented key.
 * Returns null when the key is unknown, revoked, inactive, or its partner is
 * inactive. O(1) — indexed lookup on key_hash, no per-key iteration.
 */
export async function resolvePartnerByKeyHash(
  client: SupabaseClient,
  keyHash: string
): Promise<ResolvedPartner | null> {
  const { data, error } = await (client as any)
    .from('api_partner_keys')
    .select('id, scopes, is_active, revoked_at, require_signature, signing_secret, api_partners!inner(id, name, is_active, test_mode, rate_limit_per_min)')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .is('revoked_at', null)
    .maybeSingle();

  if (error || !data) return null;
  const partner = (data as any).api_partners;
  if (!partner || partner.is_active === false) return null;

  const rateLimit = Number(partner.rate_limit_per_min);
  return {
    partnerId: partner.id as string,
    partnerName: partner.name as string,
    testMode: !!partner.test_mode,
    scopes: Array.isArray((data as any).scopes) ? ((data as any).scopes as string[]) : ['quote', 'checkout'],
    keyId: (data as any).id as string,
    rateLimitPerMin: Number.isFinite(rateLimit) && rateLimit > 0 ? rateLimit : 120,
    requireSignature: !!(data as any).require_signature,
    signingSecret: ((data as any).signing_secret as string) ?? null,
  };
}

/** Best-effort last-used stamp for observability; never throws to callers. */
export async function touchPartnerKey(client: SupabaseClient, keyId: string): Promise<void> {
  try {
    await (client as any)
      .from('api_partner_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyId);
  } catch {
    /* non-critical */
  }
}

export async function listPartnerWebhookStatusEvents(
  client: SupabaseClient,
  statuses: string[],
  sinceIso: string,
  limit: number
): Promise<PartnerWebhookStatusRow[]> {
  const { data, error } = await (client as any)
    .from('order_status_history')
    .select('id, order_id, new_status, created_at')
    .in('new_status', statuses)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PartnerWebhookStatusRow[];
}

export async function listPartnerWebhookOrders(
  client: SupabaseClient,
  orderIds: string[]
): Promise<PartnerWebhookOrderRow[]> {
  if (orderIds.length === 0) return [];
  const { data, error } = await (client as any)
    .from('orders')
    .select('id, order_number, partner_id, status, engine_status, total')
    .in('id', orderIds);

  if (error) throw error;
  return (data ?? []) as PartnerWebhookOrderRow[];
}

export async function listPartnerWebhookPartners(
  client: SupabaseClient,
  partnerIds: string[]
): Promise<PartnerWebhookPartnerRow[]> {
  if (partnerIds.length === 0) return [];
  const { data, error } = await (client as any)
    .from('api_partners')
    .select('id, webhook_url, webhook_secret, is_active')
    .in('id', partnerIds);

  if (error) throw error;
  return (data ?? []) as PartnerWebhookPartnerRow[];
}

export async function listExistingPartnerWebhookDomainEventIds(
  client: SupabaseClient,
  domainEventIds: string[]
): Promise<string[]> {
  if (domainEventIds.length === 0) return [];
  const { data, error } = await (client as any)
    .from('partner_webhook_deliveries')
    .select('domain_event_id')
    .in('domain_event_id', domainEventIds);

  if (error) throw error;
  return ((data ?? []) as { domain_event_id: string }[]).map((row) => row.domain_event_id);
}

export async function insertPartnerWebhookDeliveries(
  client: SupabaseClient,
  rows: PartnerWebhookDeliveryInsert[]
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await (client as any)
    .from('partner_webhook_deliveries')
    .insert(rows);

  if (error) throw error;
}

export async function listDuePartnerWebhookDeliveries(
  client: SupabaseClient,
  nowIso: string,
  limit: number
): Promise<PartnerWebhookDueDeliveryRow[]> {
  const { data, error } = await (client as any)
    .from('partner_webhook_deliveries')
    .select('id, partner_id, event_type, payload, attempts, max_attempts, api_partners!inner(webhook_url, webhook_secret)')
    .in('status', ['pending', 'failed'])
    .lte('next_attempt_at', nowIso)
    .order('next_attempt_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PartnerWebhookDueDeliveryRow[];
}

export async function updatePartnerWebhookDelivery(
  client: SupabaseClient,
  deliveryId: string,
  patch: PartnerWebhookDeliveryUpdate
): Promise<void> {
  const { error } = await (client as any)
    .from('partner_webhook_deliveries')
    .update(patch)
    .eq('id', deliveryId);

  if (error) throw error;
}
