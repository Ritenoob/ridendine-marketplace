import { ordersTable, createAdminClient } from '@ridendine/db';
import { getCustomerActorContext, successResponse, errorResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const customerContext = await getCustomerActorContext();
    if (!customerContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const { data: order, error } = await ordersTable(createAdminClient())
      .select('id, order_number, payment_status, payment_intent_id, total, engine_status, status')
      .eq('id', id)
      .eq('customer_id', customerContext.customerId)
      .maybeSingle();

    if (error) return errorResponse('FETCH_ERROR', error.message, 500);
    if (!order) return errorResponse('NOT_FOUND', 'Order not found', 404);

    return successResponse({
      orderId: order.id,
      orderNumber: order.order_number,
      paymentStatus: order.payment_status,
      paymentIntentId: order.payment_intent_id,
      total: order.total,
      currency: 'cad',
      engineStatus: order.engine_status,
      status: order.status,
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
