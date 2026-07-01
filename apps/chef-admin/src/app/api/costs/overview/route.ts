// ==========================================
// CHEF-ADMIN COSTS API — today's cost & profitability overview (Stage 11)
// ==========================================

import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { computeLaborTotals, computeCostSummary, type TimeEntryLike } from '@ridendine/engine';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';
import { kitchenDateKey } from '@/lib/kitchen';
import { menuItemFoodCostMap, sumOrderFoodCost, type OrderItemForFoodCost } from '@/lib/food-cost';

export const dynamic = 'force-dynamic';

const LOOKBACK_HOURS = 36;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * GET /api/costs/overview
 * Today's sales, labour cost, waste value and prime cost. Food cost stays null
 * until per-order recipe costing exists — the UI shows a "needs setup" card
 * rather than a fabricated number (per the no-fake-metrics rule).
 */
export async function GET() {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const now = new Date();
    const today = kitchenDateKey(now);
    const cutoff = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
    const admin = createAdminClient() as unknown as SupabaseClient;

    const [ordersResult, entriesResult, wasteResult] = await Promise.all([
      admin
        .from('orders')
        .select('total, created_at, order_items ( quantity, menu_item_id )')
        .eq('storefront_id', chefContext.storefrontId)
        .neq('is_test', true)
        .in('status', ['delivered', 'completed'])
        .gte('created_at', cutoff),
      admin
        .from('time_entries')
        .select('id, staff_id, clock_in, clock_out, hourly_rate')
        .eq('storefront_id', chefContext.storefrontId)
        .gte('clock_in', cutoff),
      admin
        .from('inventory_waste_events')
        .select('cost_value, created_at')
        .eq('storefront_id', chefContext.storefrontId)
        .gte('created_at', cutoff),
    ]);

    const ordersToday = (ordersResult.data ?? []).filter(
      (o) => o.created_at && kitchenDateKey(new Date(o.created_at)) === today
    );
    const salesToday = ordersToday.reduce((s, o) => s + Number(o.total ?? 0), 0);

    const entries = (entriesResult.data ?? []).filter(
      (e) => !e.clock_out || kitchenDateKey(new Date(e.clock_in)) === today
    ) as TimeEntryLike[];
    const laborTotals = computeLaborTotals(entries, now);

    const wasteValue = (wasteResult.data ?? [])
      .filter((w) => w.created_at && kitchenDateKey(new Date(w.created_at)) === today)
      .reduce((s, w) => s + Number(w.cost_value ?? 0), 0);

    // Food cost from active recipes (current-cost view of today's orders).
    const costMap = await menuItemFoodCostMap(admin, chefContext.storefrontId);
    const hasFoodCost = costMap.size > 0;
    const foodCost = hasFoodCost
      ? round2(
          ordersToday.reduce(
            (sum, o) => sum + sumOrderFoodCost(((o as { order_items?: OrderItemForFoodCost[] }).order_items ?? []), costMap),
            0
          )
        )
      : null;

    const summary = computeCostSummary({
      sales: salesToday,
      foodCost,
      laborCost: entries.length > 0 ? round2(laborTotals.totalCost) : null,
      wasteValue: round2(wasteValue),
    });

    return successResponse({
      today,
      orderCount: ordersToday.length,
      ...summary,
      laborHours: round2(laborTotals.totalHours),
      setup: {
        foodCostAvailable: hasFoodCost,
        laborTracked: entries.length > 0,
      },
    });
  } catch (error) {
    console.error('Error computing costs overview:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
