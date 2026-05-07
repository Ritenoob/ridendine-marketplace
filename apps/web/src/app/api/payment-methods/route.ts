// ==========================================
// PAYMENT METHODS API
// GET: list saved payment methods
// DELETE: detach a saved payment method
// ==========================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@ridendine/db';
import { getStripeClient, getOrCreateStripeCustomer } from '@ridendine/engine';
import { getCurrentCustomer, handleApiError } from '@/lib/auth-helpers';

export async function GET(): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const customer = await getCurrentCustomer(supabase);

    const stripeCustomerId = await getOrCreateStripeCustomer({
      ridendineCustomerId: customer.id,
      email: customer.email,
      name: `${customer.first_name} ${customer.last_name}`.trim() || undefined,
    });

    if (!stripeCustomerId) {
      return NextResponse.json({ success: true, data: [] });
    }

    const stripe = getStripeClient();
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });

    return NextResponse.json({ success: true, data: paymentMethods.data });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const paymentMethodId = searchParams.get('id');

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method id is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const customer = await getCurrentCustomer(supabase);

    const stripeCustomerId = await getOrCreateStripeCustomer({
      ridendineCustomerId: customer.id,
      email: customer.email,
      name: `${customer.first_name} ${customer.last_name}`.trim() || undefined,
    });

    const stripe = getStripeClient();
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (pm.customer !== stripeCustomerId) {
      return NextResponse.json(
        { error: 'You are not authorized to delete this payment method' },
        { status: 403 }
      );
    }

    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
