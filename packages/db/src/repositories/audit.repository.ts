import type { SupabaseClient } from '../client/types';

// ==========================================
// AUDIT REPOSITORY
// `audit_logs` + `ops_override_logs` reads used by ops-admin governance
// views, plus the lightweight audit insert used when ops creates accounts.
// ==========================================

export interface AuditLogSummaryRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_type: string | null;
  actor_id: string | null;
  actor_role: string | null;
  reason: string | null;
  created_at: string;
}

export interface OpsOverrideLogRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason: string | null;
  actor_user_id: string | null;
  actor_role: string | null;
  created_at: string;
}

export interface AuditLogInsert {
  action: string;
  actor_type: string;
  entity_type: string;
  entity_id: string;
  actor_id?: string | null;
  actor_role?: string | null;
  new_data?: Record<string, unknown> | null;
  reason?: string | null;
}

/**
 * Recent audit log entries, newest first. Pass `actorTypes` to restrict to
 * specific actor types (e.g. ops activity view filters to admin/user).
 */
export async function listRecentAuditLogs(
  client: SupabaseClient,
  options: { limit?: number; actorTypes?: string[] } = {}
): Promise<AuditLogSummaryRow[]> {
  const limit = options.limit ?? 80;
  let query = client
    .from('audit_logs')
    .select(
      'id, action, entity_type, entity_id, actor_type, actor_id, actor_role, reason, created_at'
    );
  if (options.actorTypes && options.actorTypes.length > 0) {
    query = query.in('actor_type', options.actorTypes as never[]);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as AuditLogSummaryRow[];
}

/** Recent ops override log entries, newest first. */
export async function listRecentOpsOverrideLogs(
  client: SupabaseClient,
  limit = 50
): Promise<OpsOverrideLogRow[]> {
  const { data, error } = await client
    .from('ops_override_logs')
    .select('id, action, entity_type, entity_id, reason, actor_user_id, actor_role, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as OpsOverrideLogRow[];
}

/** Insert a single audit log entry (ops account creation, etc.). */
export async function insertAuditLog(
  client: SupabaseClient,
  entry: AuditLogInsert
): Promise<void> {
  const { error } = await client.from('audit_logs').insert(entry as never);
  if (error) throw error;
}
