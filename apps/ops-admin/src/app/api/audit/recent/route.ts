import { NextResponse } from 'next/server';
import { createAdminClient, listRecentAuditLogs, type SupabaseClient } from '@ridendine/db';
import { getOpsActorContext, guardPlatformApi } from '@/lib/engine';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 80;

/**
 * GET /api/audit/recent?limit=
 * Recent `audit_logs` rows for governance / triage (JSON, not CSV).
 */
export async function GET(request: Request) {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'audit_timeline_read');
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const raw = Number(searchParams.get('limit') ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(raw) && raw > 0 && raw <= 200 ? raw : DEFAULT_LIMIT;

  const admin = createAdminClient() as unknown as SupabaseClient;
  try {
    const items = await listRecentAuditLogs(admin, { limit });
    return NextResponse.json({ success: true, data: { items } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load audit logs' },
      { status: 500 }
    );
  }
}
