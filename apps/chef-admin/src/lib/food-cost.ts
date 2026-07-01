// ==========================================
// FOOD COST — current-cost computation from active recipes (Stage 11/14)
//
// Builds a map of menu_item_id -> per-portion food cost from each menu item's
// linked, active recipe, then sums it across ordered items. This is a
// CURRENT-COST view (today's recipe costs applied to today's orders) — it does
// not re-price historical orders (that would need recipe_cost_snapshots).
// ==========================================

import { computePerPortionFoodCost, computeBatchIngredientCost } from '@ridendine/engine';
import type { SupabaseClient } from '@ridendine/db';

export interface OrderItemForFoodCost {
  menu_item_id?: string | null;
  quantity: number;
  // Some queries embed the menu item (with id and/or name); either shape is fine.
  menu_item?: { id?: string | null; name?: string | null } | null;
}

/** Sum food cost across ordered items given a per-portion cost map. Pure. */
export function sumOrderFoodCost(
  orderItems: OrderItemForFoodCost[],
  perPortionByMenuItem: Map<string, number>
): number {
  let total = 0;
  for (const oi of orderItems) {
    const menuItemId = oi.menu_item_id ?? oi.menu_item?.id ?? null;
    if (!menuItemId) continue;
    const perPortion = perPortionByMenuItem.get(menuItemId);
    if (perPortion === undefined) continue;
    total += perPortion * Number(oi.quantity ?? 0);
  }
  return total;
}

/**
 * Build menu_item_id -> per-portion food cost from active recipes. Returns an
 * empty map when no recipes are configured (caller treats that as "no food
 * cost data yet"). Uses the admin client (server-only).
 */
export async function menuItemFoodCostMap(
  admin: SupabaseClient,
  storefrontId: string
): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  const { data: recipes } = await admin
    .from('recipes')
    .select('id, menu_item_id')
    .eq('storefront_id', storefrontId)
    .eq('is_active', true)
    .not('menu_item_id', 'is', null);

  const linked = (recipes ?? []).filter((r) => r.menu_item_id) as { id: string; menu_item_id: string }[];
  if (linked.length === 0) return result;

  const recipeIds = linked.map((r) => r.id);
  const { data: versions } = await admin
    .from('recipe_versions')
    .select('id, recipe_id, batch_yield, version, is_active')
    .in('recipe_id', recipeIds)
    .order('version', { ascending: false });

  // Prefer the active version per recipe; fall back to the highest version.
  const versionByRecipe = new Map<string, { id: string; batch_yield: number }>();
  for (const v of (versions ?? []) as { id: string; recipe_id: string; batch_yield: number; is_active: boolean }[]) {
    const existing = versionByRecipe.get(v.recipe_id);
    if (!existing || v.is_active) versionByRecipe.set(v.recipe_id, { id: v.id, batch_yield: Number(v.batch_yield ?? 1) });
  }

  const versionIds = [...versionByRecipe.values()].map((v) => v.id);
  if (versionIds.length === 0) return result;

  const { data: ingredients } = await admin
    .from('recipe_ingredients')
    .select('recipe_version_id, quantity, cost_per_unit, waste_factor')
    .in('recipe_version_id', versionIds);

  const ingByVersion = new Map<string, { quantity: number; costPerUnit: number; wasteFactor: number }[]>();
  for (const i of (ingredients ?? []) as { recipe_version_id: string; quantity: number; cost_per_unit: number; waste_factor: number }[]) {
    const arr = ingByVersion.get(i.recipe_version_id) ?? [];
    arr.push({ quantity: Number(i.quantity ?? 0), costPerUnit: Number(i.cost_per_unit ?? 0), wasteFactor: Number(i.waste_factor ?? 0) });
    ingByVersion.set(i.recipe_version_id, arr);
  }

  for (const r of linked) {
    const version = versionByRecipe.get(r.id);
    if (!version) continue;
    const ings = ingByVersion.get(version.id) ?? [];
    const perPortion = computePerPortionFoodCost(computeBatchIngredientCost(ings), version.batch_yield);
    result.set(r.menu_item_id, perPortion);
  }

  return result;
}
