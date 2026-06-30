// ==========================================
// PARTNER CHECKOUT API (external storefront / co-op)
// Shared-secret authenticated. Accepts an inline order, materializes it into
// guest customer/address/cart rows, then runs the same runCheckout path as the
// customer app. RideNDine is the merchant of record; the returned clientSecret
// is confirmed client-side and Stripe's webhook submits the paid order to the
// kitchen. Use header `Idempotency-Key: <external-order-id>` for safe retries.
// ==========================================

import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { partnerCheckoutSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { errorResponse, getSystemActor } from '@/lib/engine';
import { resolvePartnerContext, partnerHasScope } from '@/lib/partner/auth';
import { materializePartnerOrder, MaterializeError } from '@/lib/partner/materialize';
import { runCheckout, type CheckoutRequestInput } from '@/lib/checkout/run-checkout';

export async function POST(request: Request): Promise<Response> {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.partnerCheckout,
    namespace: 'partner-checkout',
    routeKey: 'POST:/api/partner/checkout',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  const adminClient = createAdminClient() as unknown as SupabaseClient;

  const partner = await resolvePartnerContext(request, adminClient);
  if (!partner) {
    return errorResponse('UNAUTHORIZED', 'Invalid or missing partner API key', 401);
  }
  if (!partnerHasScope(partner, 'checkout')) {
    return errorResponse('FORBIDDEN_SCOPE', 'This key is not permitted to create orders', 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('VALIDATION_ERROR', 'Invalid JSON body', 400);
  }

  const validationResult = partnerCheckoutSchema.safeParse(body);
  if (!validationResult.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      validationResult.error.issues[0]?.message || 'Invalid request body',
      400
    );
  }
  const data = validationResult.data;

  let materialized;
  try {
    materialized = await materializePartnerOrder(adminClient, {
      storefrontId: data.storefrontId,
      customer: data.customer,
      deliveryAddress: data.deliveryAddress,
      items: data.items,
    });
  } catch (error) {
    if (error instanceof MaterializeError) {
      return errorResponse(error.code, error.publicMessage, error.status);
    }
    console.error('Partner checkout materialization error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to prepare partner order', 500);
  }

  const input: CheckoutRequestInput = {
    storefrontId: data.storefrontId,
    deliveryAddressId: materialized.deliveryAddressId,
    tip: data.tip ?? 0,
    promoCode: data.promoCode,
    specialInstructions: data.specialInstructions,
    scheduledFor: data.scheduledFor ?? null,
    saveCard: false,
    savedPaymentMethodId: null,
  };

  return runCheckout({
    request,
    actor: getSystemActor(),
    customerId: materialized.customerId,
    input,
    partnerId: partner.partnerId,
    isTest: partner.testMode,
  });
}
