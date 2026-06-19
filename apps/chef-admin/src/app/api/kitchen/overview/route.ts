import { createAdminClient } from '@ridendine/db';
import {
  getChefActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';
import {
  computePrepPlan,
  aggregatePrepBoard,
  computeKitchenLoad,
  type PrepMenuItem,
  type HistoricalOrderForPrep,
  type ActiveOrder,
} from '@/lib/kitchen';

export const dynamic = 'force-dynamic';

const ACTIVE_ORDER_STATUSES = ['pending', 'accepted', 'preparing', 'ready_for_pickup'];
const HISTORICAL_DAYS = 28;

export async function GET(): Promise<Response> {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const { storefrontId } = chefContext;
    const adminClient = createAdminClient();
    const now = new Date();
    const historicalCutoff = new Date(now.getTime() - HISTORICAL_DAYS * 24 * 60 * 60 * 1000);

    const [storefrontResult, menuItemsResult, activeOrdersResult, historicalOrdersResult] =
      await Promise.all([
        adminClient
          .from('chef_storefronts')
          .select('is_paused, is_active, max_queue_size, average_prep_minutes')
          .eq('id', storefrontId)
          .single(),

        adminClient
          .from('menu_items')
          .select('id, name, daily_limit, daily_sold, prep_time_minutes, is_available, is_sold_out')
          .eq('storefront_id', storefrontId),

        adminClient
          .from('orders')
          .select(
            'id, estimated_prep_minutes, order_items ( quantity, special_instructions, menu_item:menu_items ( id, name ) )'
          )
          .eq('storefront_id', storefrontId)
          .in('status', ACTIVE_ORDER_STATUSES),

        adminClient
          .from('orders')
          .select(
            'id, created_at, order_items ( quantity, menu_item:menu_items ( id ) )'
          )
          .eq('storefront_id', storefrontId)
          .in('status', ['delivered', 'completed'])
          .gte('created_at', historicalCutoff.toISOString()),
      ]);

    const storefront = storefrontResult.data;
    if (!storefront) {
      return errorResponse('NOT_FOUND', 'Storefront not found', 404);
    }

    if (menuItemsResult.error) console.error('Kitchen overview: menu_items query error', menuItemsResult.error);
    if (activeOrdersResult.error) console.error('Kitchen overview: active orders query error', activeOrdersResult.error);
    if (historicalOrdersResult.error) console.error('Kitchen overview: historical orders query error', historicalOrdersResult.error);

    const menuItems = (menuItemsResult.data ?? []) as PrepMenuItem[];
    const activeOrders = (activeOrdersResult.data ?? []) as unknown as ActiveOrder[];
    const historicalOrders = (historicalOrdersResult.data ?? []) as unknown as HistoricalOrderForPrep[];

    const load = computeKitchenLoad(activeOrders, storefront);
    const prepPlan = computePrepPlan(menuItems, historicalOrders, now);
    const prepBoard = aggregatePrepBoard(activeOrders);

    return successResponse({
      load,
      prepPlan,
      prepBoard,
      service: {
        isPaused: storefront.is_paused ?? false,
        isActive: storefront.is_active ?? false,
      },
    });
  } catch (error) {
    console.error('Error fetching kitchen overview:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
