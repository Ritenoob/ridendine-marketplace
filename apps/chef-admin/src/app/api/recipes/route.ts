// ==========================================
// CHEF-ADMIN RECIPES API — list + create (Stage 6)
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { createRecipeSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** GET /api/recipes — recipes for the storefront. */
export async function GET() {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data, error } = await admin
      .from('recipes')
      .select('*')
      .eq('storefront_id', chefContext.storefrontId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Recipes list error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to load recipes', 500);
    }
    return successResponse({ recipes: data ?? [] });
  } catch (error) {
    console.error('Error listing recipes:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/** POST /api/recipes — create a recipe with its first version, ingredients and steps. */
export async function POST(request: NextRequest) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-recipe-create',
      userId: chefContext.actor.userId,
      routeKey: 'POST:/api/recipes',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const parsed = createRecipeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid recipe', 400);
    }
    const r = parsed.data;
    const storefrontId = chefContext.storefrontId;
    const admin = createAdminClient() as unknown as SupabaseClient;

    // If linking a menu item, it must belong to this storefront.
    if (r.menuItemId) {
      const { data: mi } = await admin
        .from('menu_items')
        .select('id')
        .eq('id', r.menuItemId)
        .eq('storefront_id', storefrontId)
        .maybeSingle();
      if (!mi) return errorResponse('VALIDATION_ERROR', 'Menu item not found for your storefront', 400);
    }

    const { data: recipe, error: recipeErr } = await admin
      .from('recipes')
      .insert({ storefront_id: storefrontId, name: r.name, menu_item_id: r.menuItemId ?? null })
      .select('*')
      .single();
    if (recipeErr || !recipe) {
      console.error('Recipe create error:', recipeErr);
      return errorResponse('INTERNAL_ERROR', 'Failed to create recipe', 500);
    }

    const { data: version, error: versionErr } = await admin
      .from('recipe_versions')
      .insert({
        recipe_id: recipe.id,
        version: 1,
        batch_yield: r.batchYield,
        portion_size: r.portionSize ?? null,
        waste_factor: r.wasteFactor,
        notes: r.notes ?? null,
        is_active: true,
      })
      .select('*')
      .single();
    if (versionErr || !version) {
      console.error('Recipe version error:', versionErr);
      return errorResponse('INTERNAL_ERROR', 'Recipe created but version failed', 500);
    }

    if (r.ingredients.length > 0) {
      await admin.from('recipe_ingredients').insert(
        r.ingredients.map((i, idx) => ({
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
    if (r.steps.length > 0) {
      await admin.from('recipe_steps').insert(
        r.steps.map((s) => ({
          recipe_version_id: version.id,
          step_number: s.stepNumber,
          instruction: s.instruction,
          station: s.station ?? null,
          duration_minutes: s.durationMinutes ?? null,
          phase: s.phase,
        }))
      );
    }

    // Link the active version to the menu item if provided.
    if (r.menuItemId) {
      await admin
        .from('menu_item_recipe_versions')
        .insert({ menu_item_id: r.menuItemId, recipe_version_id: version.id, is_active: true });
    }

    return successResponse({ recipe, version }, 201);
  } catch (error) {
    console.error('Error creating recipe:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
