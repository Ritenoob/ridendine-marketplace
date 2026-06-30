// ==========================================
// CHEF-ADMIN INVENTORY API — record waste
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { inventoryWasteSchema } from '@ridendine/validation';
import { signedMovementQuantity, applyMovementToQuantity } from '@ridendine/engine';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/inventory/waste
 * Log wasted stock: records a waste event, a negative `waste` movement, and
 * updates the cached quantity. Cost value is derived from the item's unit cost.
 */
export async function POST(request: NextRequest) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-inventory-waste',
      userId: chefContext.actor.userId,
      routeKey: 'POST:/api/inventory/waste',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const parsed = inventoryWasteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid waste entry', 400);
    }
    const { inventoryItemId, quantity, reason } = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;

    const { data: item } = await admin
      .from('inventory_items')
      .select('id, current_quantity, cost_per_unit')
      .eq('id', inventoryItemId)
      .eq('storefront_id', chefContext.storefrontId)
      .maybeSingle();
    if (!item) return errorResponse('NOT_FOUND', 'Inventory item not found', 404);

    const costValue = quantity * Number(item.cost_per_unit ?? 0);

    const { data: wasteEvent, error: wasteErr } = await admin
      .from('inventory_waste_events')
      .insert({
        storefront_id: chefContext.storefrontId,
        inventory_item_id: inventoryItemId,
        quantity,
        reason: reason ?? null,
        cost_value: costValue,
        created_by: chefContext.actor.userId,
      })
      .select('*')
      .single();

    if (wasteErr || !wasteEvent) {
      console.error('Waste event error:', wasteErr);
      return errorResponse('INTERNAL_ERROR', 'Failed to record waste', 500);
    }

    const signedQty = signedMovementQuantity('waste', quantity);
    await admin.from('inventory_stock_movements').insert({
      storefront_id: chefContext.storefrontId,
      inventory_item_id: inventoryItemId,
      movement_type: 'waste',
      quantity: signedQty,
      unit_cost: Number(item.cost_per_unit ?? 0),
      reference_type: 'waste_event',
      reference_id: wasteEvent.id,
      note: reason ?? null,
      created_by: chefContext.actor.userId,
    });

    const newQuantity = applyMovementToQuantity(Number(item.current_quantity ?? 0), signedQty);
    const { data: updated } = await admin
      .from('inventory_items')
      .update({ current_quantity: newQuantity })
      .eq('id', inventoryItemId)
      .eq('storefront_id', chefContext.storefrontId)
      .select('*')
      .single();

    return successResponse({ wasteEvent, item: updated, costValue }, 201);
  } catch (error) {
    console.error('Error recording waste:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
