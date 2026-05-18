// ==========================================
// WEB CHECKOUT API
// Powered by Central Engine
// ==========================================

import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import {
  getStripeClient,
  evaluateCheckoutRisk,
  assertStripeConfigured,
  getOrCreateStripeCustomer,
} from '@ridendine/engine';
import { checkoutSchema } from '@ridendine/validation';
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
import { createHash } from 'crypto';
import { validateScheduledFor } from '@/lib/checkout/scheduling';
import { buildCheckoutQuote, roundMoney } from '@/lib/checkout/quote';

interface CheckoutRequestInput {
  storefrontId: string;
  deliveryAddressId: string;
  tip: number;
  promoCode?: string;
  specialInstructions?: string;
  scheduledFor?: string | null;
  clientSubtotal?: number;
  clientDeliveryFee?: number;
  clientServiceFee?: number;
  clientTax?: number;
  clientTotal?: number;
  saveCard?: boolean;
  savedPaymentMethodId?: string | null;
}

interface CheckoutResponsePayload {
  clientSecret: string | null;
  orderId: string;
  orderNumber: string;
  total: number;
  breakdown: {
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    tax: number;
    tip: number;
    discount: number;
    deliveryDistanceKm?: number;
    surgeMultiplier?: number;
    surgeActive?: boolean;
  };
}

function hashPayload(input: unknown): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

function deriveIdempotencyKey(
  request: Request,
  customerId: string,
  cartId: string,
  input: CheckoutRequestInput
): string {
  const headerKey = request.headers.get('Idempotency-Key')?.trim();
  if (headerKey) {
    return headerKey.slice(0, 128);
  }

  return hashPayload({
    customerId,
    cartId,
    storefrontId: input.storefrontId,
    deliveryAddressId: input.deliveryAddressId,
    tip: input.tip,
    promoCode: input.promoCode ?? null,
    specialInstructions: input.specialInstructions ?? null,
  }).slice(0, 64);
}

async function upsertCheckoutIdempotencyRecord(
  adminClient: SupabaseClient,
  params: {
    customerId: string;
    idempotencyKey: string;
    requestHash: string;
  }
) {
  const idemClient = adminClient as any;

  const existingResult = await idemClient
    .from('checkout_idempotency_keys')
    .select('id, request_hash, status, response_payload, order_id, payment_intent_id')
    .eq('customer_id', params.customerId)
    .eq('idempotency_key', params.idempotencyKey)
    .maybeSingle();

  const existing = existingResult.data;
  if (existing) {
    return { row: existing, created: false };
  }

  const insertResult = await idemClient
    .from('checkout_idempotency_keys')
    .insert({
      customer_id: params.customerId,
      idempotency_key: params.idempotencyKey,
      request_hash: params.requestHash,
      status: 'processing',
    })
    .select('id, request_hash, status, response_payload, order_id, payment_intent_id')
    .single();

  if (insertResult.error?.code === '23505') {
    const retryResult = await idemClient
      .from('checkout_idempotency_keys')
      .select('id, request_hash, status, response_payload, order_id, payment_intent_id')
      .eq('customer_id', params.customerId)
      .eq('idempotency_key', params.idempotencyKey)
      .maybeSingle();
    return { row: retryResult.data, created: false };
  }

  if (insertResult.error) {
    throw insertResult.error;
  }

  return { row: insertResult.data, created: true };
}

export async function POST(request: Request): Promise<Response> {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.checkout,
    namespace: 'web-checkout',
    routeKey: 'POST:/api/checkout',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  try {
    const customerContext = await getCustomerActorContext();
    if (!customerContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const body = await request.json();
    const validationResult = checkoutSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('VALIDATION_ERROR', validationResult.error.issues[0]?.message || 'Invalid request body', 400);
    }
    const {
      storefrontId,
      deliveryAddressId,
      tip = 0,
      promoCode,
      specialInstructions,
      scheduledFor,
      clientSubtotal,
      clientDeliveryFee,
      clientServiceFee,
      clientTax,
      clientTotal,
      saveCard = false,
      savedPaymentMethodId = null,
    } = validationResult.data as CheckoutRequestInput;

    // Validate scheduled_for if provided
    const scheduleValidation = validateScheduledFor(scheduledFor ?? null);
    if (!scheduleValidation.valid) {
      return errorResponse('VALIDATION_ERROR', scheduleValidation.error, 400);
    }
    const resolvedScheduledFor = scheduleValidation.value;

    const adminClient = createAdminClient() as unknown as SupabaseClient;
    const engine = getEngine();

    const quoteResult = await buildCheckoutQuote({
      adminClient,
      customerId: customerContext.customerId,
      storefrontId,
      deliveryAddressId,
      tip: Number(tip || 0),
      promoCode,
      clientSubtotal,
      clientDeliveryFee,
      clientServiceFee,
      clientTax,
      clientTotal,
    });
    if (!quoteResult.ok) {
      return errorResponse(
        quoteResult.error.code,
        quoteResult.error.message,
        quoteResult.error.status ?? 400
      );
    }

    const {
      cart,
      menuIds,
      items,
      quote: serverQuote,
      promoCodeId,
      deliveryDistanceKm,
      deliverySurgeMultiplier,
    } = quoteResult.value;
    const subtotalCents = Math.round(serverQuote.subtotal * 100);

    const tipCents = Math.round(Number(tip || 0) * 100);
    const risk = evaluateCheckoutRisk({
      customerId: customerContext.customerId,
      cartId: cart.id,
      amountCents: subtotalCents + tipCents,
      currency: 'cad',
    });
    if (!risk.allowed) {
      await engine.audit.log({
        action: 'override',
        entityType: 'checkout',
        entityId: cart.id,
        actor: customerContext.actor,
        metadata: {
          code: 'RISK_BLOCKED',
          ...risk.auditPayload,
        },
      });
      return errorResponse(
        'RISK_BLOCKED',
        `Checkout blocked by risk policy: ${risk.reasons.join(', ')}`,
        403
      );
    }

    const readiness = await engine.kitchen.validateCustomerCheckoutReadiness(
      storefrontId,
      menuIds
    );
    if (!readiness.ok) {
      return errorResponse(readiness.code, readiness.message, 400);
    }

    const idempotencyKey = deriveIdempotencyKey(request, customerContext.customerId, cart.id, {
      storefrontId,
      deliveryAddressId,
      tip: Number(tip || 0),
      promoCode,
      specialInstructions,
      clientSubtotal,
      clientDeliveryFee,
      clientServiceFee,
      clientTax,
      clientTotal,
    });
    const requestHash = hashPayload({
      storefrontId,
      deliveryAddressId,
      tip: Number(tip || 0),
      promoCode: promoCode ?? null,
      specialInstructions: specialInstructions ?? null,
      cartId: cart.id,
      serverQuote,
      items: (cart.cart_items as Array<{ menu_item_id: string; quantity: number; unit_price: number }>).map((item) => ({
        menuItemId: item.menu_item_id,
        quantity: item.quantity,
        unitPrice: roundMoney(item.unit_price),
      })),
    });

    const idemRecord = await upsertCheckoutIdempotencyRecord(adminClient, {
      customerId: customerContext.customerId,
      idempotencyKey,
      requestHash,
    });

    if (!idemRecord.row) {
      return errorResponse('IDEMPOTENCY_CONFLICT', 'Unable to secure idempotency key', 409);
    }
    if (idemRecord.row.request_hash !== requestHash) {
      return errorResponse('IDEMPOTENCY_CONFLICT', 'Idempotency key reused with a different payload', 409);
    }
    if (idemRecord.row.status === 'completed' && idemRecord.row.response_payload) {
      return successResponse(idemRecord.row.response_payload as CheckoutResponsePayload);
    }
    if (idemRecord.row.status === 'processing' && !idemRecord.created) {
      return errorResponse('IDEMPOTENCY_CONFLICT', 'Checkout request already in progress', 409);
    }

    assertStripeConfigured();

    let createdOrderId: string | null = null;
    try {
      // Create order via engine
      const orderResult = await engine.orderCreation.createOrder(
        {
          customerId: customerContext.customerId,
          storefrontId,
          deliveryAddressId,
          items,
          tip,
          promoCode: promoCode || undefined,
          specialInstructions,
        },
        customerContext.actor
      );

      if (!orderResult.success) {
        return errorResponse(orderResult.error!.code, orderResult.error!.message);
      }

      const order = orderResult.data!;
      createdOrderId = order.id;

      // Persist the canonical checkout quote snapshot on the order record.
      const orderUpdate: Record<string, unknown> = {
        subtotal: serverQuote.subtotal,
        delivery_fee: serverQuote.deliveryFee,
        service_fee: serverQuote.serviceFee,
        tax: serverQuote.tax,
        tip: serverQuote.tip,
        total: serverQuote.total,
        updated_at: new Date().toISOString(),
      };
      if (resolvedScheduledFor) {
        // scheduled_for column may not exist in generated types yet — use cast
        (orderUpdate as Record<string, unknown>).scheduled_for = resolvedScheduledFor;
        orderUpdate.status = 'scheduled';
      }

      const { error: syncTotalError } = await (adminClient as any)
        .from('orders')
        .update(orderUpdate)
        .eq('id', order.id);

      if (syncTotalError) {
        return errorResponse('INTERNAL_ERROR', 'Failed to sync order record', 500);
      }

      // NOTE: Delivery record is created by dispatch engine when chef marks order ready
      // This ensures delivery is only created for orders that proceed past payment
      const stripe = getStripeClient();
      const totalCents = Math.round(serverQuote.total * 100);

      // Resolve Stripe customer for saved payment method support
      const customerRecord = await (adminClient as any)
        .from('customers')
        .select('email, first_name, last_name')
        .eq('id', customerContext.customerId)
        .maybeSingle();
      const stripeCustomerId = await getOrCreateStripeCustomer({
        ridendineCustomerId: customerContext.customerId,
        email: customerRecord.data?.email ?? '',
        name:
          `${customerRecord.data?.first_name ?? ''} ${customerRecord.data?.last_name ?? ''}`.trim() ||
          undefined,
      }).catch(() => null);

      const piParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
        amount: totalCents,
        currency: 'cad',
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          customer_id: customerContext.customerId,
          storefront_id: storefrontId,
          cart_id: cart.id,
          order_total_cents: String(totalCents),
          ...(promoCodeId && { promo_code_id: promoCodeId }),
        },
      };
      if (stripeCustomerId) piParams.customer = stripeCustomerId;
      if (savedPaymentMethodId) {
        piParams.payment_method = savedPaymentMethodId;
        piParams.confirm = true;
      } else {
        piParams.automatic_payment_methods = { enabled: true };
        if (saveCard && stripeCustomerId) {
          piParams.setup_future_usage = 'off_session';
        }
      }

      const paymentIntent = await stripe.paymentIntents.create(piParams, {
        idempotencyKey: `checkout:${customerContext.customerId}:${idempotencyKey}`,
      });

      const responsePayload: CheckoutResponsePayload = {
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
        orderNumber: order.order_number,
        total: serverQuote.total,
        breakdown: {
          subtotal: serverQuote.subtotal,
          deliveryFee: serverQuote.deliveryFee,
          serviceFee: serverQuote.serviceFee,
          tax: serverQuote.tax,
          tip: serverQuote.tip,
          discount: serverQuote.discount,
          ...(deliveryDistanceKm !== null && {
            deliveryDistanceKm: Math.round(deliveryDistanceKm * 10) / 10,
          }),
          surgeMultiplier: deliverySurgeMultiplier,
          surgeActive: deliverySurgeMultiplier > 1.0,
        },
      };

      await (adminClient as any)
        .from('checkout_idempotency_keys')
        .update({
          status: 'completed',
          order_id: order.id,
          payment_intent_id: paymentIntent.id,
          response_payload: responsePayload,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', idemRecord.row.id);

      return successResponse(responsePayload);
    } catch (paymentError) {
      if (createdOrderId) {
        await engine.orders.cancelOrder({
          orderId: createdOrderId,
          actorId: customerContext.actor.userId,
          actorType: customerContext.actor.role,
          actorRole: customerContext.actor.role,
          reason: 'payment_failed',
          notes: 'Checkout payment initialization failed',
          actor: customerContext.actor,
        });
      }
      await (adminClient as any)
        .from('checkout_idempotency_keys')
        .update({
          status: 'failed',
          last_error: paymentError instanceof Error ? paymentError.message.slice(0, 500) : 'payment_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', idemRecord.row.id);

      return errorResponse('PAYMENT_FAILED', 'Unable to initialize payment for checkout', 500);
    }
  } catch (error) {
    console.error('Checkout error:', error);
    const isConfigError =
      error instanceof Error &&
      (error.message.includes('STRIPE_SECRET_KEY') || error.message.includes('Unsafe Stripe key'));
    if (isConfigError) {
      return errorResponse('PAYMENT_CONFIG_ERROR', 'Payment provider is misconfigured', 500);
    }
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
