import type { SupabaseClient } from '../client/types';

export type DriverEarningsQueryResult<T> = {
  data: T | null;
  error: { message?: string; code?: string } | null;
};

export type DriverEarningsPlatformAccountRow = {
  balance_cents?: number | null;
  currency?: string | null;
};

export type DriverEarningsInstantPayoutRequestRow = {
  id?: string;
  amount_cents?: number | null;
  fee_cents?: number | null;
  status?: string | null;
  requested_at?: string | null;
};

export type DriverEarningsPayoutAccountRow = {
  status?: string | null;
  payouts_enabled?: boolean | null;
  charges_enabled?: boolean | null;
  onboarding_completed_at?: string | null;
};

export type DriverEarningsFinancialDataResults = {
  platformAccountResult: DriverEarningsQueryResult<DriverEarningsPlatformAccountRow>;
  instantPayoutsResult: DriverEarningsQueryResult<DriverEarningsInstantPayoutRequestRow[]>;
  payoutAccountResult: DriverEarningsQueryResult<DriverEarningsPayoutAccountRow>;
};

export async function getDriverEarningsFinancialData(
  client: SupabaseClient,
  driverId: string
): Promise<DriverEarningsFinancialDataResults> {
  const [platformAccountResult, instantPayoutsResult, payoutAccountResult] = await Promise.all([
    client
      .from('platform_accounts')
      .select('balance_cents, currency')
      .eq('account_type', 'driver_payable')
      .eq('owner_id', driverId)
      .maybeSingle(),
    client
      .from('instant_payout_requests')
      .select('id, amount_cents, fee_cents, status, requested_at')
      .eq('driver_id', driverId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false }),
    client
      .from('driver_payout_accounts')
      .select('status, payouts_enabled, charges_enabled, onboarding_completed_at')
      .eq('driver_id', driverId)
      .maybeSingle(),
  ]);

  return {
    platformAccountResult: platformAccountResult as unknown as DriverEarningsQueryResult<DriverEarningsPlatformAccountRow>,
    instantPayoutsResult: instantPayoutsResult as unknown as DriverEarningsQueryResult<DriverEarningsInstantPayoutRequestRow[]>,
    payoutAccountResult: payoutAccountResult as unknown as DriverEarningsQueryResult<DriverEarningsPayoutAccountRow>,
  };
}

export async function getDriverPayablePlatformAccount(
  client: SupabaseClient,
  driverId: string
): Promise<DriverEarningsQueryResult<DriverEarningsPlatformAccountRow>> {
  const result = await client
    .from('platform_accounts')
    .select('balance_cents, currency')
    .eq('account_type', 'driver_payable')
    .eq('owner_id', driverId)
    .maybeSingle();
  return result as unknown as DriverEarningsQueryResult<DriverEarningsPlatformAccountRow>;
}

export async function listPendingInstantPayoutHolds(
  client: SupabaseClient,
  driverId: string
): Promise<DriverEarningsQueryResult<Array<Pick<DriverEarningsInstantPayoutRequestRow, 'amount_cents' | 'fee_cents'>>>> {
  const result = await client
    .from('instant_payout_requests')
    .select('amount_cents, fee_cents')
    .eq('driver_id', driverId)
    .eq('status', 'pending');
  return result as unknown as DriverEarningsQueryResult<Array<Pick<DriverEarningsInstantPayoutRequestRow, 'amount_cents' | 'fee_cents'>>>;
}
