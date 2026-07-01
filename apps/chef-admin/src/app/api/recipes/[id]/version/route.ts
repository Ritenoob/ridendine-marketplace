// ==========================================
// CHEF-ADMIN RECIPES API — create a new recipe version (Stage 6)
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { createRecipeVersionSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

/** POST /api/recipes/[id]/version — add a new version; optionally make it active. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-recipe-version',
      userId: chefContext.actor.userId,
      routeKey: 'POST:/api/recipes/[id]/version',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id: recipeId } = await params;
    const parsed = createRecipeVersionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid version', 400);
    }
    const v = parsed.data;
    const admin = createAdminClient() as unknown as SupabaseClient;

    const { data: recipe } = await admin
      .from('recipes')
      .select('id, menu_item_id')
      .eq('id', recipeId)
      .eq('storefront_id', chefContext.storefrontId)
      .maybeSingle();
    if (!recipe) return errorResponse('NOT_FOUND', 'Recipe not found', 404);

    // Next version number.
    const { data: latest } = await admin
      .from('recipe_versions')
      .select('version')
      .eq('recipe_id', recipeId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = Number(latest?.version ?? 0) + 1;

    const { data: version, error } = await admin
      .from('recipe_versions')
      .insert({
        recipe_id: recipeId,
        version: nextVersion,
        batch_yield: v.batchYield,
        portion_size: v.portionSize ?? null,
        waste_factor: v.wasteFactor,
        notes: v.notes ?? null,
        is_active: v.activate,
      })
      .select('*')
      .single();
    if (error || !version) {
      console.error('Recipe version create error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to create version', 500);
    }

    if (v.ingredients.length > 0) {
      await admin.from('recipe_ingredients').insert(
        v.ingredients.map((i, idx) => ({
          recipe_version_id: version.id,
          inventory_item_id: i.inventoryItemId ?? null,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          cost_per_unit: i.costPerUnit,
          waste_factor: i.wasteFactor,
          sort_order: i.sortOrder ?? idx,
        }))
      );
    }
    if (v.steps.length > 0) {
      await admin.from('recipe_steps').insert(
        v.steps.map((s) => ({
          recipe_version_id: version.id,
          step_number: s.stepNumber,
          instruction: s.instruction,
          station: s.station ?? null,
          duration_minutes: s.durationMinutes ?? null,
          phase: s.phase,
        }))
      );
    }

    // Activating a version deactivates the others and re-points the menu link.
    if (v.activate) {
      await admin.from('recipe_versions').update({ is_active: false }).eq('recipe_id', recipeId).neq('id', version.id);
      await admin.from('recipe_versions').update({ is_active: true }).eq('id', version.id);
      if (recipe.menu_item_id) {
        await admin.from('menu_item_recipe_versions').update({ is_active: false }).eq('menu_item_id', recipe.menu_item_id);
        await admin
          .from('menu_item_recipe_versions')
          .insert({ menu_item_id: recipe.menu_item_id, recipe_version_id: version.id, is_active: true });
      }
    }

    return successResponse({ version, activated: v.activate }, 201);
  } catch (error) {
    console.error('Error creating recipe version:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
