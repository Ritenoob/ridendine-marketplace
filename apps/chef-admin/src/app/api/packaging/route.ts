// ==========================================
// CHEF-ADMIN PACKAGING API — list + create (Stage 6/14)
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

/** GET /api/packaging — the storefront's packaging catalogue. */
export async function GET() {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data, error } = await admin
      .from('packaging_items')
      .select('*')
      .eq('storefront_id', chefContext.storefrontId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Packaging list error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to load packaging', 500);
    }
    return successResponse({ packaging: data ?? [] });
  } catch (error) {
    console.error('Error listing packaging:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/** POST /api/packaging — add a packaging item. */
export async function POST(request: NextRequest) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-packaging-create',
      userId: chefContext.actor.userId,
      routeKey: 'POST:/api/packaging',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const parsed = packagingItemSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid packaging item', 400);
    }
    const p = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: item, error } = await admin
      .from('packaging_items')
      .insert({
        storefront_id: chefContext.storefrontId,
        name: p.name,
        unit: p.unit ?? null,
        cost_per_unit: p.costPerUnit,
        is_active: p.isActive,
      })
      .select('*')
      .single();

    if (error || !item) {
      console.error('Packaging create error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to create packaging item', 500);
    }
    return successResponse({ item }, 201);
  } catch (error) {
    console.error('Error creating packaging item:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
