// ==========================================
// CHEF-ADMIN RECIPES API — detail (with live cost) + update
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { updateRecipeSchema } from '@ridendine/validation';
import { computeMenuItemCosting } from '@ridendine/engine';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/recipes/[id] — recipe, active version, ingredients, steps, live costing. */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const { id } = await params;
    const admin = createAdminClient() as unknown as SupabaseClient;

    const { data: recipe } = await admin
      .from('recipes')
      .select('*')
      .eq('id', id)
      .eq('storefront_id', chefContext.storefrontId)
      .maybeSingle();
    if (!recipe) return errorResponse('NOT_FOUND', 'Recipe not found', 404);

    const { data: version } = await admin
      .from('recipe_versions')
      .select('*')
      .eq('recipe_id', id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const versionId = version?.id;
    const [ingredientsResult, stepsResult] = await Promise.all([
      versionId
        ? admin.from('recipe_ingredients').select('*').eq('recipe_version_id', versionId).order('sort_order')
        : Promise.resolve({ data: [] as unknown[] }),
      versionId
        ? admin.from('recipe_steps').select('*').eq('recipe_version_id', versionId).order('step_number')
        : Promise.resolve({ data: [] as unknown[] }),
    ]);
    const ingredients = (ingredientsResult.data ?? []) as Array<{ quantity: number; cost_per_unit: number; waste_factor: number }>;
    const steps = stepsResult.data ?? [];

    // Sell price + packaging from the linked menu item, if any.
    let sellPrice = 0;
    let packaging: { costPerUnit: number; quantity?: number }[] = [];
    if (recipe.menu_item_id) {
      const { data: mi } = await admin
        .from('menu_items')
        .select('price')
        .eq('id', recipe.menu_item_id)
        .maybeSingle();
      sellPrice = Number(mi?.price ?? 0);

      const { data: packs } = await admin
        .from('menu_item_packaging')
        .select('quantity, packaging_item:packaging_items ( cost_per_unit )')
        .eq('menu_item_id', recipe.menu_item_id);
      packaging = ((packs ?? []) as unknown as Array<{ quantity: number; packaging_item: { cost_per_unit: number } | null }>).map((p) => ({
        costPerUnit: Number(p.packaging_item?.cost_per_unit ?? 0),
        quantity: Number(p.quantity ?? 1),
      }));
    }

    const costing = computeMenuItemCosting({
      ingredients: ingredients.map((i) => ({
        quantity: Number(i.quantity ?? 0),
        costPerUnit: Number(i.cost_per_unit ?? 0),
        wasteFactor: Number(i.waste_factor ?? 0),
      })),
      batchYield: Number(version?.batch_yield ?? 1),
      packaging,
      sellPrice,
    });

    return successResponse({ recipe, version, ingredients, steps, costing });
  } catch (error) {
    console.error('Error loading recipe:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/** PATCH /api/recipes/[id] — update recipe name / menu link / active flag. */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-recipe-update',
      userId: chefContext.actor.userId,
      routeKey: 'PATCH:/api/recipes/[id]',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id } = await params;
    const parsed = updateRecipeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid update', 400);
    }
    const u = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: existing } = await admin
      .from('recipes')
      .select('id')
      .eq('id', id)
      .eq('storefront_id', chefContext.storefrontId)
      .maybeSingle();
    if (!existing) return errorResponse('NOT_FOUND', 'Recipe not found', 404);

    const patch: Record<string, unknown> = {};
    if (u.name !== undefined) patch.name = u.name;
    if (u.menuItemId !== undefined) patch.menu_item_id = u.menuItemId;
    if (u.isActive !== undefined) patch.is_active = u.isActive;

    const { data: recipe, error } = await admin
      .from('recipes')
      .update(patch)
      .eq('id', id)
      .eq('storefront_id', chefContext.storefrontId)
      .select('*')
      .single();

    if (error || !recipe) {
      console.error('Recipe update error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to update recipe', 500);
    }
    return successResponse({ recipe });
  } catch (error) {
    console.error('Error updating recipe:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
