// ==========================================
// CHEF-ADMIN PACKAGING API — update (Stage 6/14)
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { packagingItemSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

const updatePackagingSchema = packagingItemSchema.partial();

type RouteParams = { params: Promise<{ id: string }> };

/** PATCH /api/packaging/[id] — update a packaging item (cost, name, active). */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-packaging-update',
      userId: chefContext.actor.userId,
      routeKey: 'PATCH:/api/packaging/[id]',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id } = await params;
    const parsed = updatePackagingSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid update', 400);
    }
    const u = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: existing } = await admin
      .from('packaging_items')
      .select('id')
      .eq('id', id)
      .eq('storefront_id', chefContext.storefrontId)
      .maybeSingle();
    if (!existing) return errorResponse('NOT_FOUND', 'Packaging item not found', 404);

    const patch: Record<string, unknown> = {};
    if (u.name !== undefined) patch.name = u.name;
    if (u.unit !== undefined) patch.unit = u.unit;
    if (u.costPerUnit !== undefined) patch.cost_per_unit = u.costPerUnit;
    if (u.isActive !== undefined) patch.is_active = u.isActive;

    const { data: item, error } = await admin
      .from('packaging_items')
      .update(patch)
      .eq('id', id)
      .eq('storefront_id', chefContext.storefrontId)
      .select('*')
      .single();

    if (error || !item) {
      console.error('Packaging update error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to update packaging item', 500);
    }
    return successResponse({ item });
  } catch (error) {
    console.error('Error updating packaging item:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
