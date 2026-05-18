import {
  addCartItem,
  createAdminClient,
  createCart,
  getCartByCustomer,
} from '@ridendine/db';
import { getCustomerActorContext, successResponse, errorResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface MenuRow {
  id: string;
  price: number;
  is_available: boolean;
  is_sold_out: boolean;
  storefront_id: string;
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const customerContext = await getCustomerActorContext();
    if (!customerContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const adminClient = createAdminClient() as any;
    const { data: order, error } = await adminClient
      .from('orders')
      .select(`
        id,
        storefront_id,
        customer_id,
        items:order_items (
          menu_item_id,
          quantity,
          special_instructions
        )
      `)
      .eq('id', id)
      .eq('customer_id', customerContext.customerId)
      .maybeSingle();

    if (error) return errorResponse('FETCH_ERROR', error.message, 500);
    if (!order) return errorResponse('NOT_FOUND', 'Order not found', 404);

    const menuIds = (order.items ?? []).map((item: { menu_item_id: string }) => item.menu_item_id);
    const { data: menuItems, error: menuError } = await adminClient
      .from('menu_items')
      .select('id, price, is_available, is_sold_out, storefront_id')
      .in('id', menuIds);
    if (menuError) return errorResponse('FETCH_ERROR', menuError.message, 500);

    const menuById = new Map<string, MenuRow>((menuItems ?? []).map((item: MenuRow) => [item.id, item]));
    for (const orderItem of order.items ?? []) {
      const menuItem = menuById.get(orderItem.menu_item_id);
      if (!menuItem || !menuItem.is_available || menuItem.is_sold_out || menuItem.storefront_id !== order.storefront_id) {
        return errorResponse('MENU_ITEM_UNAVAILABLE', 'One or more items are no longer available', 409);
      }
    }

    let cart = await getCartByCustomer(adminClient, customerContext.customerId, order.storefront_id);
    if (!cart) {
      cart = await createCart(adminClient, {
        customer_id: customerContext.customerId,
        storefront_id: order.storefront_id,
      });
    }

    const addedItems = [];
    for (const orderItem of order.items ?? []) {
      const menuItem = menuById.get(orderItem.menu_item_id);
      if (!menuItem) {
        return errorResponse('MENU_ITEM_UNAVAILABLE', 'One or more items are no longer available', 409);
      }
      addedItems.push(
        await addCartItem(adminClient, {
          cart_id: cart.id,
          menu_item_id: orderItem.menu_item_id,
          quantity: orderItem.quantity,
          unit_price: menuItem.price,
          special_instructions: orderItem.special_instructions,
          selected_options: [],
        })
      );
    }

    return successResponse({ cartId: cart.id, items: addedItems }, 201);
  } catch (error) {
    console.error('Error reordering:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
