import type { SupabaseClient } from '../client/types';

export type DriverPayoutQueryResult<T> = {
  data: T | null;
  error: { message?: string; code?: string } | null;
};

export type DriverPayoutMutationResult = {
  error: { message?: string; code?: string } | null;
};

export type DriverPayoutSetupProfileRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
};

export type DriverPayoutAccountStatusRow = {
  id?: string | null;
  stripe_account_id: string;
  status?: string | null;
  onboarding_completed_at?: string | null;
};

export type DriverPayoutStripeAccountRow = {
  stripe_account_id: string | null;
};

export async function getDriverPayoutSetupProfileByUserId(
  client: SupabaseClient,
  userId: string
): Promise<DriverPayoutQueryResult<DriverPayoutSetupProfileRow>> {
  const result = await client
    .from('drivers')
    .select('id, first_name, last_name')
    .eq('user_id', userId)
    .single();
  return result as unknown as DriverPayoutQueryResult<DriverPayoutSetupProfileRow>;
}

export async function getDriverPayoutAccountStatus(
  client: SupabaseClient,
  driverId: string
): Promise<DriverPayoutQueryResult<DriverPayoutAccountStatusRow>> {
  const result = await client
    .from('driver_payout_accounts')
    .select('id, stripe_account_id, status, onboarding_completed_at')
    .eq('driver_id', driverId)
    .maybeSingle();
  return result as unknown as DriverPayoutQueryResult<DriverPayoutAccountStatusRow>;
}

export async function getDriverPayoutStripeAccount(
  client: SupabaseClient,
  driverId: string
): Promise<DriverPayoutQueryResult<DriverPayoutStripeAccountRow>> {
  const result = await client
    .from('driver_payout_accounts')
    .select('stripe_account_id')
    .eq('driver_id', driverId)
    .maybeSingle();
  return result as unknown as DriverPayoutQueryResult<DriverPayoutStripeAccountRow>;
}

export async function insertDriverPayoutAccount(
  client: SupabaseClient,
  input: {
    driverId: string;
    stripeAccountId: string;
    status?: string;
  }
): Promise<DriverPayoutMutationResult> {
  const result = await client.from('driver_payout_accounts').insert({
    driver_id: input.driverId,
    stripe_account_id: input.stripeAccountId,
    status: input.status ?? 'pending',
  });
  return { error: result.error };
}
