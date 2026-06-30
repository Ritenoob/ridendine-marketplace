import { createAdminClient } from '@ridendine/db';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';
import { mapActiveOrdersToTickets, type ActiveOrder } from '@/lib/kitchen';

export const dynamic = 'force-dynamic';

/**
 * GET /api/kitchen/tickets/[id]
 *
 * Stage 3: hydrate a SINGLE kitchen ticket on demand.
 *
 * The realtime INSERT/UPDATE stream delivers a thin order row (no joined
 * order_items / customer), so adding it straight to the live queue produced
 * tickets with empty line items until the 30s poll caught up. The live queue
 * now calls this endpoint the moment a realtime event fires and only shows the
 * ticket once it is fully hydrated.
 *
 * Ownership: the order is fetched scoped to the authenticated chef's
 * storefront, so a chef can never hydrate another storefront's ticket.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const { id } = await params;
    if (!id) {
      return errorResponse('BAD_REQUEST', 'Missing ticket id', 400);
    }

    const { storefrontId } = chefContext;
    const adminClient = createAdminClient();

    const { data: order, error } = await adminClient
      .from('orders')
      .select(
        'id, order_number, status, created_at, special_instructions, customer_id, estimated_ready_at, estimated_prep_minutes, prep_started_at, order_items ( quantity, special_instructions, menu_item:menu_items ( id, name ) )'
      )
      .eq('id', id)
      // Scope to the chef's own storefront — this is the ownership check.
      .eq('storefront_id', storefrontId)
      .maybeSingle();

    if (error) {
      console.error('Kitchen ticket hydration query error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to load ticket', 500);
    }
    if (!order) {
      // Either it does not exist or it belongs to another storefront.
      return errorResponse('NOT_FOUND', 'Ticket not found', 404);
    }

    const activeOrder = order as unknown as ActiveOrder;

    // Single customer lookup (same shape as the overview route).
    const customersById = new Map<string, { first_name: string; last_name: string }>();
    if (activeOrder.customer_id) {
      const { data: customer } = await adminClient
        .from('customers')
        .select('id, first_name, last_name')
        .eq('id', activeOrder.customer_id)
        .maybeSingle();
      if (customer) {
        customersById.set(customer.id, {
          first_name: customer.first_name,
          last_name: customer.last_name,
        });
      }
    }

    const [ticket] = mapActiveOrdersToTickets([activeOrder], customersById);
    return successResponse({ ticket });
  } catch (error) {
    console.error('Error hydrating kitchen ticket:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
