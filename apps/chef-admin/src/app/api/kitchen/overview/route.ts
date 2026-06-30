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
  computeServiceMetrics,
  mapActiveOrdersToTickets,
  type PrepMenuItem,
  type HistoricalOrderForPrep,
  type ActiveOrder,
  type ClosedOrderForMetrics,
} from '@/lib/kitchen';

export const dynamic = 'force-dynamic';

const ACTIVE_ORDER_STATUSES = ['pending', 'accepted', 'preparing', 'ready_for_pickup'];
const HISTORICAL_DAYS = 28;
// Wider than one day so timezone-day filtering inside computeServiceMetrics is
// safe regardless of UTC offset; the pure function trims to the kitchen's today.
const TODAY_LOOKBACK_HOURS = 48;

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
    const todayCutoff = new Date(now.getTime() - TODAY_LOOKBACK_HOURS * 60 * 60 * 1000);

    const [
      storefrontResult,
      menuItemsResult,
      activeOrdersResult,
      historicalOrdersResult,
      closedTodayResult,
    ] =
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
            'id, order_number, status, created_at, special_instructions, customer_id, estimated_ready_at, estimated_prep_minutes, prep_started_at, order_items ( quantity, special_instructions, menu_item:menu_items ( id, name ) )'
          )
          .eq('storefront_id', storefrontId)
          // Keep partner test-mode orders out of the live kitchen queue.
          .neq('is_test', true)
          .in('status', ACTIVE_ORDER_STATUSES),

        adminClient
          .from('orders')
          .select(
            'id, created_at, order_items ( quantity, menu_item:menu_items ( id ) )'
          )
          .eq('storefront_id', storefrontId)
          .in('status', ['delivered', 'completed'])
          .gte('created_at', historicalCutoff.toISOString()),

        adminClient
          .from('orders')
          .select('total, created_at, prep_started_at, actual_ready_at')
          .eq('storefront_id', storefrontId)
          .neq('is_test', true)
          .in('status', ['delivered', 'completed'])
          .gte('created_at', todayCutoff.toISOString()),
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

    // Single batched customer query - no N+1 (mirrors /api/orders pattern)
    const customerIds = [
      ...new Set(
        activeOrders.map((o) => o.customer_id).filter((id): id is string => Boolean(id))
      ),
    ];
    const { data: customers, error: customersError } =
      customerIds.length > 0
        ? await adminClient
            .from('customers')
            .select('id, first_name, last_name')
            .in('id', customerIds)
        : { data: [], error: null };
    if (customersError) {
      console.error('Failed to fetch customers for kitchen tickets:', customersError);
    }

    type CustomerRow = { id: string; first_name: string; last_name: string };
    const customersById = new Map<string, CustomerRow>(
      ((customers ?? []) as CustomerRow[]).map((c) => [c.id, c])
    );

    if (closedTodayResult.error) console.error('Kitchen overview: closed-today query error', closedTodayResult.error);
    const closedToday = (closedTodayResult.data ?? []) as unknown as ClosedOrderForMetrics[];

    const load = computeKitchenLoad(activeOrders, storefront);
    const prepPlan = computePrepPlan(menuItems, historicalOrders, now);
    const prepBoard = aggregatePrepBoard(activeOrders);
    const tickets = mapActiveOrdersToTickets(activeOrders, customersById);
    const metrics = computeServiceMetrics(activeOrders, closedToday, menuItems, now);

    return successResponse({
      load,
      metrics,
      prepPlan,
      prepBoard,
      service: {
        isPaused: storefront.is_paused ?? false,
        isActive: storefront.is_active ?? false,
      },
      tickets,
      storefrontId,
    });
  } catch (error) {
    console.error('Error fetching kitchen overview:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
