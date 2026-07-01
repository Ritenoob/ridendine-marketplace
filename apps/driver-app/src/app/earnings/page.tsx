import { cookies } from 'next/headers';
import {
  createServerClient,
  createAdminClient,
  getDriverByUserId,
  getDeliveryHistory,
  getDriverEarningsFinancialData,
} from '@ridendine/db';
import { DriverShell } from '@/components/layout/driver-shell';
import EarningsView from './components/EarningsView';

export const dynamic = 'force-dynamic';

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

export default async function EarningsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text">Please sign in</h2>
          <p className="mt-2 text-textMuted">You need to be signed in to view earnings</p>
        </div>
      </div>
    );
  }

  const driver = await getDriverByUserId(supabase as any, user.id);

  if (!driver) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text">Driver profile not found</h2>
          <p className="mt-2 text-textMuted">Please contact support</p>
        </div>
      </div>
    );
  }

  const completedDeliveries = await getDeliveryHistory(supabase as any, driver.id, { limit: 20 });

  const admin = createAdminClient();
  const {
    platformAccountResult: acctResult,
    instantPayoutsResult: pendingInstantResult,
    payoutAccountResult,
  } = await getDriverEarningsFinancialData(admin as any, driver.id);

  if (acctResult.error || pendingInstantResult.error || payoutAccountResult.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text">Earnings unavailable</h2>
          <p className="mt-2 text-textMuted">We could not load your payout balances. Please try again.</p>
        </div>
      </div>
    );
  }

  const acct = acctResult.data;
  const payoutAccount = payoutAccountResult.data;

  const instantEnabled = Boolean(
    (driver as { instant_payouts_enabled?: boolean }).instant_payouts_enabled
  );

  return (
    <DriverShell
      title="Earnings"
      subtitle="Track delivery pay, payout balance, tips, and instant payout settings"
    >
      <EarningsView
        deliveries={completedDeliveries}
        availableBalanceCents={(acct?.balance_cents as number) ?? 0}
        currency={normalizeCurrency(acct?.currency)}
        instantPayoutsEnabled={instantEnabled}
        pendingInstantPayoutRequests={(pendingInstantResult.data ?? []).map((request) => ({
          id: request.id ?? '',
          amountCents: Number(request.amount_cents ?? 0),
          feeCents: Number(request.fee_cents ?? 0),
          status: request.status ?? 'pending',
          requestedAt: request.requested_at ?? null,
        }))}
        payoutAccountStatus={{
          connected: Boolean(payoutAccount),
          status: payoutAccount?.status ?? 'not_started',
          payoutsEnabled: Boolean(payoutAccount?.payouts_enabled),
          chargesEnabled: Boolean(payoutAccount?.charges_enabled),
          onboardingCompletedAt: payoutAccount?.onboarding_completed_at ?? null,
        }}
      />
    </DriverShell>
  );
}
