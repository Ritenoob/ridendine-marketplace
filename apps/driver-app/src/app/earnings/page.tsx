import { cookies } from 'next/headers';
import {
  createServerClient,
  createAdminClient,
  getDriverByUserId,
  getDeliveryHistory,
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

  const admin = createAdminClient() as unknown as {
    from: (rel: string) => {
      select: (cols: string) => {
        eq: (c: string, v: string) => {
          eq: (c2: string, v2: string) => {
            maybeSingle: () => Promise<{
              data: { balance_cents: number; currency?: string | null } | null;
              error?: unknown;
            }>;
            order: (c3: string, opts?: { ascending?: boolean }) => Promise<{
              data:
                | Array<{
                    id: string;
                    amount_cents: number;
                    fee_cents: number;
                    status: string;
                    requested_at: string | null;
                  }>
                | null;
              error?: unknown;
            }>;
          };
          maybeSingle: () => Promise<{
            data: {
              status?: string | null;
              payouts_enabled?: boolean | null;
              charges_enabled?: boolean | null;
              onboarding_completed_at?: string | null;
            } | null;
            error?: unknown;
          }>;
        };
      };
    };
  };
  const [acctResult, pendingInstantResult, payoutAccountResult] = await Promise.all([
    admin
      .from('platform_accounts')
      .select('balance_cents, currency')
      .eq('account_type', 'driver_payable')
      .eq('owner_id', driver.id)
      .maybeSingle(),
    admin
      .from('instant_payout_requests')
      .select('id, amount_cents, fee_cents, status, requested_at')
      .eq('driver_id', driver.id)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false }),
    admin
      .from('driver_payout_accounts')
      .select('status, payouts_enabled, charges_enabled, onboarding_completed_at')
      .eq('driver_id', driver.id)
      .maybeSingle(),
  ]);

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
          id: request.id,
          amountCents: request.amount_cents,
          feeCents: request.fee_cents,
          status: request.status,
          requestedAt: request.requested_at,
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
