// ==========================================
// CHEF-ADMIN LABOUR API — clock in
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { clockInSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** POST /api/labor/clock-in — open a time entry (snapshots the staff rate). */
export async function POST(request: NextRequest) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-clock-in',
      userId: chefContext.actor.userId,
      routeKey: 'POST:/api/labor/clock-in',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const parsed = clockInSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid clock-in', 400);
    }
    const { staffId, shiftId } = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: staff } = await admin
      .from('kitchen_staff')
      .select('id, hourly_rate')
      .eq('id', staffId)
      .eq('storefront_id', chefContext.storefrontId)
      .maybeSingle();
    if (!staff) return errorResponse('NOT_FOUND', 'Staff not found', 404);

    // Prevent a double clock-in.
    const { data: open } = await admin
      .from('time_entries')
      .select('id')
      .eq('storefront_id', chefContext.storefrontId)
      .eq('staff_id', staffId)
      .is('clock_out', null)
      .maybeSingle();
    if (open) return errorResponse('CONFLICT', 'Staff is already clocked in', 409);

    const { data: entry, error } = await admin
      .from('time_entries')
      .insert({
        storefront_id: chefContext.storefrontId,
        staff_id: staffId,
        shift_id: shiftId ?? null,
        clock_in: new Date().toISOString(),
        hourly_rate: Number(staff.hourly_rate ?? 0),
      })
      .select('*')
      .single();

    if (error || !entry) {
      console.error('Clock-in error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to clock in', 500);
    }
    return successResponse({ timeEntry: entry }, 201);
  } catch (error) {
    console.error('Error clocking in:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
