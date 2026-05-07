// ==========================================
// CANONICAL STRIPE SERVER CLIENT (IRR-007 / IRR-018)
// Single apiVersion + lazy singleton for all server routes and adapters.
// ==========================================

import Stripe from 'stripe';

/** Pinned Stripe API version for the entire monorepo — change only here. */
export const STRIPE_API_VERSION = '2024-12-18.acacia' as const;

let stripeSingleton: Stripe | null = null;

function assertStripeEnvironmentSafety(secretKey: string): void {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (nodeEnv !== 'production' && !secretKey.startsWith('sk_test_')) {
    throw new Error(
      `Unsafe Stripe key for ${nodeEnv}: non-production must use test mode key`
    );
  }
  if (nodeEnv === 'production' && !secretKey.startsWith('sk_live_')) {
    throw new Error('Unsafe Stripe key for production: production must use live mode key');
  }
}

export function assertStripeConfigured(): void {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  assertStripeEnvironmentSafety(key);
}

/**
 * Shared Stripe client for PaymentIntents, Connect, webhooks.constructEvent, etc.
 * Never send the secret to the client.
 */
export function getStripeClient(): Stripe {
  assertStripeConfigured();
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: STRIPE_API_VERSION as unknown as Stripe.LatestApiVersion,
    });
  }
  return stripeSingleton;
}

/** Test-only: reset singleton between cases. */
export function __resetStripeClientForTests(): void {
  stripeSingleton = null;
}

/**
 * Get or create a Stripe Customer for a Ridendine customer.
 * Searches by metadata ridendine_id first to avoid duplicates.
 * Returns the Stripe customer ID string, or null if Stripe is not configured.
 */
export async function getOrCreateStripeCustomer(params: {
  ridendineCustomerId: string;
  email: string;
  name?: string;
}): Promise<string | null> {
  try {
    assertStripeConfigured();
  } catch {
    return null;
  }

  const stripe = getStripeClient();

  // Search for existing customer by ridendine_id metadata
  const existing = await stripe.customers.search({
    query: `metadata['ridendine_id']:'${params.ridendineCustomerId}'`,
    limit: 1,
  });

  if (existing.data.length > 0) {
    return existing.data[0]!.id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: { ridendine_id: params.ridendineCustomerId },
  });

  return customer.id;
}
