import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { checkoutSchema } from '@ridendine/validation';
import { getCustomerActorContext, errorResponse, successResponse } from '@/lib/engine';
import { buildCheckoutQuote } from '@/lib/checkout/quote';
import { evaluateRateLimit, RATE_LIMIT_POLICIES, rateLimitPolicyResponse } from '@ridendine/utils';

export async function POST(request: Request): Promise<Response> {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.checkout,
    namespace: 'web-checkout-quote',
    routeKey: 'POST:/api/checkout/quote',
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

  const quoteResult = await buildCheckoutQuote({
    adminClient: createAdminClient() as unknown as SupabaseClient,
    customerId: customerContext.customerId,
    storefrontId: validationResult.data.storefrontId,
    deliveryAddressId: validationResult.data.deliveryAddressId,
    tip: validationResult.data.tip,
    promoCode: validationResult.data.promoCode,
    clientSubtotal: validationResult.data.clientSubtotal,
    clientDeliveryFee: validationResult.data.clientDeliveryFee,
    clientServiceFee: validationResult.data.clientServiceFee,
    clientTax: validationResult.data.clientTax,
    clientTotal: validationResult.data.clientTotal,
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
