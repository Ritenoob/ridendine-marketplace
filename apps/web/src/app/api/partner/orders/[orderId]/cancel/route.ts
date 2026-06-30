// ==========================================
// PARTNER ORDER CANCEL API
// POST /api/partner/orders/{orderId}/cancel
// A partner cancels one of ITS OWN orders (refunds the customer). Allowed only
// before the kitchen has accepted (engine_status pending/payment_authorized).
// Requires the 'cancel' scope on the key.
// ==========================================

import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import {
  getEngine,
  getSystemActor,
  errorResponse,
  successResponse,
} from '@/lib/engine';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { resolvePartnerContext, partnerHasScope } from '@/lib/partner/auth';
import { enforcePartnerRateLimit } from '@/lib/partner/rate-limit';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

// Cancellable before the chef accepts (mirrors customer self-serve cancel).
const PARTNER_CANCELLABLE_STATUSES = new Set([
  'pending',
  'payment_authorized',
  'checkout_pending',
]);

export async function POST(request: Request, { params }: RouteParams): Promise<Response> {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.partnerCheckout,
    namespace: 'partner-order-cancel',
    routeKey: 'POST:/api/partner/orders/[orderId]/cancel',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  const adminClient = createAdminClient() as unknown as SupabaseClient;

  const partner = await resolvePartnerContext(request, adminClient);
  if (!partner) {
    return errorResponse('UNAUTHORIZED', 'Invalid or missing partner API key', 401);
  }
  if (!partnerHasScope(partner, 'cancel')) {
    return errorResponse('FORBIDDEN_SCOPE', 'This key is not permitted to cancel orders', 403);
  }
  const rateLimited = await enforcePartnerRateLimit(request, partner, 'POST:/api/partner/orders/[orderId]/cancel');
  if (rateLimited) return rateLimited;

  const { orderId } = await params;

  const { data: order } = await (adminClient as any)
    .from('orders')
    .select('id, partner_id, engine_status')
    .eq('id', orderId)
    .maybeSingle();

  // 404 (not 403) when the order isn't this partner's — never reveal another
  // partner's order ids exist.
  if (!order || order.partner_id !== partner.partnerId) {
    return errorResponse('NOT_FOUND', 'Order not found', 404);
  }

  const engineStatus = order.engine_status ?? '';
  if (!PARTNER_CANCELLABLE_STATUSES.has(engineStatus)) {
    return errorResponse(
      'CANCEL_NOT_ALLOWED',
      'Order can no longer be cancelled (kitchen has started it). Contact support.',
      400
    );
  }

  const engine = getEngine();
  const systemActor = getSystemActor();
  const result = await engine.orders.cancelOrder({
    orderId,
    actorId: systemActor.userId,
    actorType: systemActor.role,
    actorRole: systemActor.role,
    reason: 'partner_requested',
    notes: `Cancelled by partner ${partner.partnerName}`,
    actor: systemActor,
  });

  if (!result.success) {
    return errorResponse('CANCEL_FAILED', (result as any).error ?? 'Cancellation failed', 500);
  }

  return successResponse({
    orderId,
    engineStatus: result.order.engine_status,
    message: 'Order cancelled. The customer will be refunded.',
  });
}
