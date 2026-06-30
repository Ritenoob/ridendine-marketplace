// ==========================================
// PARTNER CHECKOUT QUOTE API
// Returns the canonical server-computed total for an inline partner order.
// Side-effect-free: prices the items + address with NO customer/address/cart
// rows written (buildPartnerQuote). Same pricing engine as customer checkout.
// ==========================================

import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { partnerCheckoutSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { errorResponse, successResponse } from '@/lib/engine';
import { resolvePartnerContext, partnerHasScope } from '@/lib/partner/auth';
import { enforcePartnerRateLimit } from '@/lib/partner/rate-limit';
import { buildPartnerQuote } from '@/lib/checkout/quote';

export async function POST(request: Request): Promise<Response> {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.partnerCheckout,
    namespace: 'partner-checkout-quote',
    routeKey: 'POST:/api/partner/checkout/quote',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  const adminClient = createAdminClient() as unknown as SupabaseClient;

  const partner = await resolvePartnerContext(request, adminClient);
  if (!partner) {
    return errorResponse('UNAUTHORIZED', 'Invalid or missing partner API key', 401);
  }
  if (!partnerHasScope(partner, 'quote')) {
    return errorResponse('FORBIDDEN_SCOPE', 'This key is not permitted to request quotes', 403);
  }

  const rateLimited = await enforcePartnerRateLimit(request, partner, 'POST:/api/partner/checkout/quote');
  if (rateLimited) return rateLimited;

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

  const quoteResult = await buildPartnerQuote({
    adminClient,
    storefrontId: data.storefrontId,
    items: data.items,
    deliveryAddress: data.deliveryAddress,
    tip: data.tip ?? 0,
    promoCode: data.promoCode,
  });

  if (!quoteResult.ok) {
    return errorResponse(
      quoteResult.error.code,
      quoteResult.error.message,
      quoteResult.error.status ?? 400
    );
  }

  const { quote, deliveryDistanceKm, deliverySurgeMultiplier } = quoteResult.value;

  return successResponse({
    currency: 'cad',
    breakdown: {
      subtotal: quote.subtotal,
      deliveryFee: quote.deliveryFee,
      serviceFee: quote.serviceFee,
      tax: quote.tax,
      tip: quote.tip,
      discount: quote.discount,
      total: quote.total,
      ...(deliveryDistanceKm !== null && {
        deliveryDistanceKm: Math.round(deliveryDistanceKm * 10) / 10,
      }),
      surgeMultiplier: deliverySurgeMultiplier,
      surgeActive: deliverySurgeMultiplier > 1.0,
    },
  });
}
