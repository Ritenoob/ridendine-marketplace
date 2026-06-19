// ==========================================
// OPS-ADMIN ORDER ACTIONS API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import {
  createAdminClient,
  getEngineOrderDetail,
  listOrderExceptionsForOrder,
  type SupabaseClient,
} from '@ridendine/db';
import { orderCommandSchema } from '@ridendine/validation';
import { operationResultResponse } from '@/lib/validation';
import {
  finalizeOpsActor,
  getEngine,
  getOpsActorContext,
  errorResponse,
  guardPlatformApi,
  hasPlatformApiCapability,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/engine/orders/[id]
 * Get order details with full timeline
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'ops_orders_read'));
  if (opsActor instanceof Response) return opsActor;

  const engine = getEngine();
  const adminClient = createAdminClient() as unknown as SupabaseClient;

  // Get order (any lookup failure surfaces as 404, matching the raw query's
  // previous `error || !order` handling)
  let order = null;
  try {
    order = await getEngineOrderDetail(adminClient, orderId);
  } catch {
    order = null;
  }

  if (!order) {
    return errorResponse('NOT_FOUND', 'Order not found', 404);
  }

  // Audit timeline — ops_admin / ops_manager / super_admin (platform-api-guards)
  const timeline = hasPlatformApiCapability(opsActor, 'audit_timeline_read')
    ? await engine.audit.getAuditTrail('order', orderId)
    : [];

  // Get any linked exceptions
  const exceptions = await listOrderExceptionsForOrder(adminClient, orderId);

  // Get allowed actions
  const allowedActions = await engine.orders.getAllowedActions(orderId, opsActor.role);

  // Get financials
  const financials = await engine.commerce.getOrderFinancials(orderId);

  return successResponse({
    order,
    timeline,
    exceptions: exceptions || [],
    allowedActions,
    financials: financials.success ? financials.data : null,
  });
}

/**
 * PATCH /api/engine/orders/[id]
 * Update order status or perform actions
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'ops_orders_write'));
  if (opsActor instanceof Response) return opsActor;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }
  const actionMap: Record<string, string> = {
    accept: 'accept_order',
    reject: 'reject_order',
    start_preparing: 'start_preparing_order',
    mark_ready: 'mark_order_ready',
    cancel: 'cancel_order',
    complete: 'complete_order',
    override: 'override_order_status',
  };
  const parsed = orderCommandSchema.safeParse({
    ...body,
    action: actionMap[body?.action] || body?.action,
    orderId,
  });
  if (!parsed.success) {
    return errorResponse(
      'INVALID_INPUT',
      parsed.error.issues[0]?.message || 'Invalid order action',
      400
    );
  }
  const actionInput = parsed.data;
  const engine = getEngine();

  if (actionInput.action === 'override_order_status') {
    const deniedOverride = guardPlatformApi(opsActor, 'order_override');
    if (deniedOverride) return deniedOverride;
  }

  const result = await engine.operations.execute(actionInput, opsActor);
  return operationResultResponse(result);
}
