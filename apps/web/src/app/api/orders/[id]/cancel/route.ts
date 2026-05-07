// ==========================================
// CUSTOMER ORDER CANCEL API
// POST /api/orders/[id]/cancel
// Only allowed when engine_status is 'pending' or 'payment_authorized'
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import {
  getEngine,
  getCustomerActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Statuses where a customer may self-serve cancel (before chef accepts)
const CUSTOMER_CANCELLABLE_STATUSES = new Set([
  'pending',
  'payment_authorized',
  'checkout_pending',
]);

export async function POST(request: NextRequest | Request, { params }: RouteParams) {
  try {
    const customerContext = await getCustomerActorContext();
    if (!customerContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const limit = await evaluateRateLimit({
      request: request as NextRequest,
      policy: RATE_LIMIT_POLICIES.customerWrite,
      namespace: 'web-orders-cancel',
      userId: customerContext.actor.userId,
      routeKey: 'POST:/api/orders/[id]/cancel',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id: orderId } = await params;
    const adminClient = createAdminClient();

    // Verify order exists and belongs to this customer
    const { data: order } = await adminClient
      .from('orders')
      .select('id, customer_id, engine_status')
      .eq('id', orderId)
      .eq('customer_id', customerContext.customerId)
      .single();

    if (!order || order.customer_id !== customerContext.customerId) {
      return errorResponse('NOT_FOUND', 'Order not found', 404);
    }

    // Only allow cancel when order is still pending (before chef accepts)
    const engineStatus = order.engine_status ?? '';
    if (!CUSTOMER_CANCELLABLE_STATUSES.has(engineStatus)) {
      return errorResponse('CANCEL_NOT_ALLOWED', 'Contact support to cancel', 400);
    }

    const engine = getEngine();
    const result = await engine.orders.cancelOrder({
      orderId,
      actorId: customerContext.actor.userId,
      actorType: customerContext.actor.role,
      actorRole: customerContext.actor.role,
      reason: 'customer_requested',
      notes: 'Customer self-service cancellation via tracking page',
      actor: customerContext.actor,
    });

    if (!result.success) {
      return errorResponse('CANCEL_FAILED', result.error ?? 'Cancellation failed', 500);
    }

    return successResponse({
      orderId,
      engine_status: result.order.engine_status,
      message: 'Your order has been cancelled. Your payment will be refunded within 3–5 business days.',
    });
  } catch (error) {
    console.error('[cancel-order] Unexpected error:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
