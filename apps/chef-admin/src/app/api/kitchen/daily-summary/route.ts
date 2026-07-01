// ==========================================
// CHEF-ADMIN KITCHEN API — read daily summaries (Stage 12)
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';
import { kitchenDateKey } from '@/lib/kitchen';

export const dynamic = 'force-dynamic';

/** GET /api/kitchen/daily-summary?date=YYYY-MM-DD — one summary + recent history. */
export async function GET(request: NextRequest) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const url = new URL(request.url);
    const date = url.searchParams.get('date') ?? kitchenDateKey(new Date());
    const admin = createAdminClient() as unknown as SupabaseClient;

    const [oneResult, recentResult] = await Promise.all([
      admin
        .from('kitchen_daily_summaries')
        .select('*')
        .eq('storefront_id', chefContext.storefrontId)
        .eq('summary_date', date)
        .maybeSingle(),
      admin
        .from('kitchen_daily_summaries')
        .select('*')
        .eq('storefront_id', chefContext.storefrontId)
        .order('summary_date', { ascending: false })
        .limit(30),
    ]);

    return successResponse({ date, summary: oneResult.data ?? null, recent: recentResult.data ?? [] });
  } catch (error) {
    console.error('Error loading daily summary:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
