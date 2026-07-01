// ==========================================
// CHEF-ADMIN KITCHEN API — service mode (Stage 13)
//
// Richer service state than is_paused alone. Keeps is_paused consistent so the
// customer app's existing checkout guardrail keeps working with no change:
// paused/closed => is_paused true; open/slow_mode/overloaded => is_paused false.
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { serviceModeSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import {
  getEngine,
  getChefActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

const PAUSING_STATES = new Set(['paused', 'closed']);

/** POST /api/kitchen/service-mode — set the storefront's service state. */
export async function POST(request: NextRequest) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-service-mode',
      userId: chefContext.actor.userId,
      routeKey: 'POST:/api/kitchen/service-mode',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const parsed = serviceModeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid service mode', 400);
    }
    const m = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;

    const patch: Record<string, unknown> = {
      service_state: m.state,
      service_state_reason: m.reason ?? null,
      // Keep the existing customer-facing pause guardrail in sync.
      is_paused: PAUSING_STATES.has(m.state),
    };
    if (m.prepTimeBufferMinutes !== undefined) patch.prep_time_buffer_minutes = m.prepTimeBufferMinutes;
    if (m.maxQueueSize !== undefined) patch.max_queue_size = m.maxQueueSize;

    const { data: storefront, error } = await admin
      .from('chef_storefronts')
      .update(patch)
      .eq('id', chefContext.storefrontId)
      .select('id, service_state, service_state_reason, is_paused, prep_time_buffer_minutes, max_queue_size')
      .single();

    if (error || !storefront) {
      console.error('Service mode error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to set service mode', 500);
    }

    await getEngine().audit.log({
      action: 'update',
      entityType: 'storefront_service_mode',
      entityId: chefContext.storefrontId,
      actor: chefContext.actor,
      afterState: { service_state: m.state, reason: m.reason ?? null },
    });

    return successResponse({ storefront });
  } catch (error) {
    console.error('Error setting service mode:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
