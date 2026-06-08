import { createAdminClient, getDeliveryHistory, type SupabaseClient } from '@ridendine/db';
import { getDriverActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type PlatformAccountRow = {
  balance_cents?: number | null;
  currency?: string | null;
};

type InstantPayoutRequestRow = {
  id?: string;
  amount_cents?: number | null;
  fee_cents?: number | null;
  status?: string | null;
  requested_at?: string | null;
};

type DriverPayoutAccountRow = {
  status?: string | null;
  payouts_enabled?: boolean | null;
  charges_enabled?: boolean | null;
  onboarding_completed_at?: string | null;
};

type QueryableAdminClient = SupabaseClient & {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => unknown;
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
        order: (column: string, options?: { ascending?: boolean }) => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
};

function normalizeCurrency(currency?: string | null): string {
  const normalized = currency?.trim().toUpperCase();
  if (!normalized) return 'CAD';

  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency: normalized }).format(0);
    return normalized;
  } catch {
    return 'CAD';
  }
}

export async function GET() {
  try {
    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const adminClient = createAdminClient();
    const allDeliveries = await getDeliveryHistory(
      adminClient as unknown as SupabaseClient,
      driverContext.driverId,
      {
      limit: 1000,
    }
    );

    const queryableAdmin = adminClient as unknown as QueryableAdminClient;
    const [platformAccountResult, instantPayoutsResult, payoutAccountResult] = await Promise.all([
      queryableAdmin
        .from('platform_accounts')
        .select('balance_cents, currency')
        .eq('account_type', 'driver_payable')
        .eq('owner_id', driverContext.driverId)
        .maybeSingle(),
      queryableAdmin
        .from('instant_payout_requests')
        .select('id, amount_cents, fee_cents, status, requested_at')
        .eq('driver_id', driverContext.driverId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false }),
      queryableAdmin
        .from('driver_payout_accounts')
        .select('status, payouts_enabled, charges_enabled, onboarding_completed_at')
        .eq('driver_id', driverContext.driverId)
        .maybeSingle(),
    ]);

    const platformAccount = platformAccountResult.data as PlatformAccountRow | null;
    const pendingInstantPayoutRows = (instantPayoutsResult.data ?? []) as InstantPayoutRequestRow[];
    const payoutAccount = payoutAccountResult.data as DriverPayoutAccountRow | null;

    if (platformAccountResult.error || instantPayoutsResult.error || payoutAccountResult.error) {
      return errorResponse(
        'FINANCIAL_QUERY_ERROR',
        'Could not load earnings financial data. Please try again.',
        500
      );
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayDeliveries = allDeliveries.filter(
      (d) => d.actual_dropoff_at && new Date(d.actual_dropoff_at) >= todayStart
    );

    const weekDeliveries = allDeliveries.filter(
      (d) => d.actual_dropoff_at && new Date(d.actual_dropoff_at) >= weekStart
    );

    const monthDeliveries = allDeliveries.filter(
      (d) => d.actual_dropoff_at && new Date(d.actual_dropoff_at) >= monthStart
    );

    const dayBreakdown: Record<string, { count: number; earnings: number }> = {};

    weekDeliveries.forEach((delivery) => {
      if (!delivery.actual_dropoff_at) return;

      const date = new Date(delivery.actual_dropoff_at);
      const dateKey = date.toISOString().split('T')[0];

      if (!dateKey) return;

      if (!dayBreakdown[dateKey]) {
        dayBreakdown[dateKey] = { count: 0, earnings: 0 };
      }

      const dayData = dayBreakdown[dateKey];
      if (dayData) {
        dayData.count++;
        dayData.earnings += delivery.driver_payout;
      }
    });

    const today = {
      count: todayDeliveries.length,
      earnings: todayDeliveries.reduce((sum, d) => sum + d.driver_payout, 0),
    };

    const week = {
      count: weekDeliveries.length,
      earnings: weekDeliveries.reduce((sum, d) => sum + d.driver_payout, 0),
      breakdown: Object.entries(dayBreakdown)
        .map(([date, data]) => ({
          date,
          ...data,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };

    const month = {
      count: monthDeliveries.length,
      earnings: monthDeliveries.reduce((sum, d) => sum + d.driver_payout, 0),
    };

    return successResponse({
      today,
      week,
      month,
      availableBalanceCents: Number(platformAccount?.balance_cents ?? 0),
      currency: normalizeCurrency(platformAccount?.currency),
      pendingInstantPayoutRequests: pendingInstantPayoutRows.map((request) => ({
        id: request.id ?? '',
        amountCents: Number(request.amount_cents ?? 0),
        feeCents: Number(request.fee_cents ?? 0),
        status: request.status ?? 'pending',
        requestedAt: request.requested_at ?? null,
      })),
      payoutAccountStatus: {
        connected: Boolean(payoutAccount),
        status: payoutAccount?.status ?? 'not_started',
        payoutsEnabled: Boolean(payoutAccount?.payouts_enabled),
        chargesEnabled: Boolean(payoutAccount?.charges_enabled),
        onboardingCompletedAt: payoutAccount?.onboarding_completed_at ?? null,
      },
    });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
