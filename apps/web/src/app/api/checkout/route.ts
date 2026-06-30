// ==========================================
// WEB CHECKOUT API
// Powered by Central Engine — order/payment logic lives in runCheckout so the
// partner API (/api/partner/checkout) shares one money-handling code path.
// ==========================================

import { checkoutSchema } from '@ridendine/validation';
import { getCustomerActorContext, errorResponse } from '@/lib/engine';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { runCheckout, type CheckoutRequestInput } from '@/lib/checkout/run-checkout';

export async function POST(request: Request): Promise<Response> {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.checkout,
    namespace: 'web-checkout',
    routeKey: 'POST:/api/checkout',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  const customerContext = await getCustomerActorContext();
  if (!customerContext) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  const body = await request.json();
  const validationResult = checkoutSchema.safeParse(body);
  if (!validationResult.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      validationResult.error.issues[0]?.message || 'Invalid request body',
      400
    );
  }

  return runCheckout({
    request,
    actor: customerContext.actor,
    customerId: customerContext.customerId,
    input: validationResult.data as CheckoutRequestInput,
  });
}
