// ==========================================
// CHEF-ADMIN MENU API — food cost & margin for one menu item (Stage 6/14)
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { computeMenuItemCosting } from '@ridendine/engine';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/menu/[id]/cost
 * Cost breakdown (food cost, margin, food-cost %, suggested price) for a menu
 * item from its active recipe + packaging. Returns hasRecipe:false when the
 * item has no recipe yet — the UI shows a "needs setup" state, not a guess.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const { id: menuItemId } = await params;
    const admin = createAdminClient() as unknown as SupabaseClient;

    const { data: item } = await admin
      .from('menu_items')
      .select('id, price')
      .eq('id', menuItemId)
      .eq('storefront_id', chefContext.storefrontId)
      .maybeSingle();
    if (!item) return errorResponse('NOT_FOUND', 'Menu item not found', 404);

    const { data: recipe } = await admin
      .from('recipes')
      .select('id')
      .eq('storefront_id', chefContext.storefrontId)
      .eq('menu_item_id', menuItemId)
      .eq('is_active', true)
      .maybeSingle();

    if (!recipe) {
      return successResponse({ hasRecipe: false, sellPrice: Number(item.price ?? 0), costing: null });
    }

    const { data: version } = await admin
      .from('recipe_versions')
      .select('id, batch_yield')
      .eq('recipe_id', recipe.id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: ingredients } = version
      ? await admin
          .from('recipe_ingredients')
          .select('quantity, cost_per_unit, waste_factor')
          .eq('recipe_version_id', version.id)
      : { data: [] as Array<{ quantity: number; cost_per_unit: number; waste_factor: number }> };

    const { data: packs } = await admin
      .from('menu_item_packaging')
      .select('quantity, packaging_item:packaging_items ( cost_per_unit )')
      .eq('menu_item_id', menuItemId);

    const packaging = ((packs ?? []) as unknown as Array<{ quantity: number; packaging_item: { cost_per_unit: number } | null }>).map((p) => ({
      costPerUnit: Number(p.packaging_item?.cost_per_unit ?? 0),
      quantity: Number(p.quantity ?? 1),
    }));

    const costing = computeMenuItemCosting({
      ingredients: (ingredients ?? []).map((i) => ({
        quantity: Number(i.quantity ?? 0),
        costPerUnit: Number(i.cost_per_unit ?? 0),
        wasteFactor: Number(i.waste_factor ?? 0),
      })),
      batchYield: Number(version?.batch_yield ?? 1),
      packaging,
      sellPrice: Number(item.price ?? 0),
    });

    return successResponse({ hasRecipe: true, sellPrice: Number(item.price ?? 0), costing });
  } catch (error) {
    console.error('Error computing menu item cost:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
