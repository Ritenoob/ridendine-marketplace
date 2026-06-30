// ==========================================
// PARTNER CHECKOUT QUOTE API
// Returns the canonical server-computed total for an inline partner order
// without creating an order or PaymentIntent. Same pricing engine as the
// customer-facing /api/checkout/quote.
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
import { materializePartnerOrder, MaterializeError } from '@/lib/partner/materialize';
import { buildCheckoutQuote } from '@/lib/checkout/quote';

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
    console.error('Partner quote materialization error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to prepare partner order', 500);
  }

  const quoteResult = await buildCheckoutQuote({
    adminClient,
    customerId: materialized.customerId,
    storefrontId: data.storefrontId,
    deliveryAddressId: materialized.deliveryAddressId,
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
