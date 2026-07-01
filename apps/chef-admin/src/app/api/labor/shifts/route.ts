// ==========================================
// CHEF-ADMIN LABOUR API — shifts list + create
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { createShiftSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** GET /api/labor/shifts — upcoming/recent shifts. */
export async function GET() {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data, error } = await admin
      .from('kitchen_shifts')
      .select('*')
      .eq('storefront_id', chefContext.storefrontId)
      .order('scheduled_start', { ascending: true });

    if (error) {
      console.error('Shifts list error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to load shifts', 500);
    }
    return successResponse({ shifts: data ?? [] });
  } catch (error) {
    console.error('Error listing shifts:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/** POST /api/labor/shifts — schedule a shift. */
export async function POST(request: NextRequest) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-shift-create',
      userId: chefContext.actor.userId,
      routeKey: 'POST:/api/labor/shifts',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const parsed = createShiftSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid shift', 400);
    }
    const sh = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;
    // Staff must belong to this storefront.
    const { data: staff } = await admin
      .from('kitchen_staff')
      .select('id')
      .eq('id', sh.staffId)
      .eq('storefront_id', chefContext.storefrontId)
      .maybeSingle();
    if (!staff) return errorResponse('VALIDATION_ERROR', 'Staff not found for your storefront', 400);

    const { data: shift, error } = await admin
      .from('kitchen_shifts')
      .insert({
        storefront_id: chefContext.storefrontId,
        staff_id: sh.staffId,
        scheduled_start: sh.scheduledStart,
        scheduled_end: sh.scheduledEnd,
        role: sh.role ?? null,
        station_id: sh.stationId ?? null,
        notes: sh.notes ?? null,
      })
      .select('*')
      .single();

    if (error || !shift) {
      console.error('Shift create error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to create shift', 500);
    }
    return successResponse({ shift }, 201);
  } catch (error) {
    console.error('Error creating shift:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
