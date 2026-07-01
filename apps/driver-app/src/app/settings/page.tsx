import { cookies } from 'next/headers';
import {
  createServerClient,
  createAdminClient,
  getDriverByUserId,
  getDriverPayablePlatformAccount,
  type SupabaseClient,
} from '@ridendine/db';
import { DriverShell } from '@/components/layout/driver-shell';
import SettingsClient from './settings-client';

export const dynamic = 'force-dynamic';

export default async function DriverSettingsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-text">Please sign in</p>
      </div>
    );
  }

  const driver = await getDriverByUserId(supabase as never, user.id);
  if (!driver) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-text">Driver profile not found</p>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: acct } = await getDriverPayablePlatformAccount(
    admin as unknown as SupabaseClient,
    driver.id
  );

  return (
    <DriverShell
      title="Settings"
      subtitle="Payout preferences and driver notifications"
    >
      <SettingsClient
        driver={driver}
        balanceCents={(acct?.balance_cents as number) ?? 0}
        currency={acct?.currency ?? 'CAD'}
      />
    </DriverShell>
  );
}
