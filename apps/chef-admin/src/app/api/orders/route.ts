// ==========================================
// CHEF-ADMIN ORDERS LIST API
// Powered by Central Engine
// ==========================================

import { ordersTable, customersTable, customerAddressesTable, createAdminClient } from '@ridendine/db';
import { getEngine, getChefActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

interface OrderRow {
  id: string;
  customer_id: string | null;
  delivery_address_id: string | null;
  [key: string]: unknown;
}

interface CustomerRow {
  id: string;
  [key: string]: unknown;
}

interface AddressRow {
  id: string;
  [key: string]: unknown;
}

/**
 * GET /api/orders
 * Get all orders for the chef's storefront
 */
export async function GET() {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const adminClient = createAdminClient();

    // Get orders for this storefront with related data
    const { data: orders, error } = await ordersTable(adminClient)
      .select(`
        id,
        order_number,
        status,
        total,
        subtotal,
        tip,
        delivery_fee,
        service_fee,
        tax,
        tip,
        payment_status,
        special_instructions,
        estimated_ready_at,
        actual_ready_at,
        created_at,
        updated_at,
        customer_id,
        delivery_address_id,
        items:order_items (
          id,
          quantity,
          unit_price,
          total_price,
          special_instructions,
          menu_item:menu_items (id, name, description)
        ),
        delivery:deliveries (
          id,
          status,
          driver_id,
          driver:drivers (first_name, last_name, phone)
        )
      `)
      .eq('storefront_id', chefContext.storefrontId)
      .order('created_at', { ascending: false });

    if (error) {
      return errorResponse('FETCH_ERROR', error.message);
    }

    const orderRows = (orders ?? []) as OrderRow[];

    // Enrich with customer data
    const customerIds = [
      ...new Set(orderRows.map((o) => o.customer_id).filter((id): id is string => Boolean(id))),
    ];
    const { data: customers } = customerIds.length > 0
      ? await customersTable(adminClient)
          .select('id, first_name, last_name, phone, email')
          .in('id', customerIds)
      : { data: [] };

    // Enrich with delivery address data
    const addressIds = [
      ...new Set(
        orderRows.map((o) => o.delivery_address_id).filter((id): id is string => Boolean(id))
      ),
    ];
    const { data: addresses } = addressIds.length > 0
      ? await customerAddressesTable(adminClient)
          .select('id, address_line1, address_line2, city, state, postal_code, country')
          .in('id', addressIds)
      : { data: [] };

    // Get allowed actions for each order
    const engine = getEngine();
    const customerRows = (customers ?? []) as CustomerRow[];
    const addressRows = (addresses ?? []) as AddressRow[];
    const ordersWithDetails = await Promise.all(
      orderRows.map(async (order) => {
        const allowedActions = await engine.orders.getAllowedActions(order.id, 'chef_user');
        return {
          ...order,
          customer: customerRows.find((c) => c.id === order.customer_id) || null,
          address: addressRows.find((a) => a.id === order.delivery_address_id) || null,
          allowedActions,
        };
      })
    );

    return successResponse({ orders: ordersWithDetails });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
