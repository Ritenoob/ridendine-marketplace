// ==========================================
// PARTNER STATS (operator observability)
// GET /api/engine/partner-stats — per-partner orders, revenue, webhook delivery
// health, and key last-used, from the partner_api_stats view. Gated by the
// engine processor token.
// ==========================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { validateEngineProcessorHeaders } from '@ridendine/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const client = createAdminClient();
  const { data, error } = await (client as any)
    .from('partner_api_stats')
    .select('*')
    .order('orders', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, partners: data ?? [] });
}
