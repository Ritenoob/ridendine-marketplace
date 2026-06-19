import Link from 'next/link';
import { Badge, Card } from '@ridendine/ui';
import {
  createAdminClient,
  listPlatformAccountsByType,
  listStorefrontRefs,
  type SupabaseClient,
} from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import { FinanceSubnav } from '../../_components/FinanceSubnav';
import { FinanceAccessDenied } from '../../_components/FinanceAccessDenied';
import { FINANCE_PAGE_ROLES } from '../../_lib/roles';

export const dynamic = 'force-dynamic';

function fmtCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function FinanceChefAccountsPage() {
  const actor = await getOpsActorContext();
  if (!actor || !hasRequiredRole(actor, [...FINANCE_PAGE_ROLES])) {
    return <FinanceAccessDenied />;
  }

  const admin = createAdminClient() as unknown as SupabaseClient;
  // The raw query tolerated load failures (error renders a fallback card);
  // a repository failure degrades the same way.
  let rows: { owner_id: string; balance_cents: number; pending_payout_cents?: number }[] | null = null;
  let error = false;
  try {
    rows = (await listPlatformAccountsByType(admin, 'chef_payable')) as unknown as {
      owner_id: string;
      balance_cents: number;
      pending_payout_cents?: number;
    }[];
  } catch {
    error = true;
  }

  const storefrontIds = (rows ?? []).map((r: { owner_id: string }) => r.owner_id);
  const storefronts =
    storefrontIds.length > 0
      ? await listStorefrontRefs(admin, storefrontIds).catch(() => [] as { id: string; name: string }[])
      : ([] as { id: string; name: string }[]);

  const nameById = new Map(
    (storefronts ?? []).map((s: { id: string; name: string }) => [s.id, s.name] as const)
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <FinanceSubnav />
        <div>
          <h1 className="text-3xl font-bold text-white">Chef payable accounts</h1>
          <p className="mt-1 text-textMuted">Balances derived from ledger_entries (chef_payable).</p>
        </div>
        {error ? (
          <Card className="border-danger/40 bg-surface p-6 text-danger">Failed to load accounts.</Card>
        ) : (
          <Card className="border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Storefronts</h2>
              <Badge className="bg-info/20 text-info">{(rows ?? []).length}</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-textMuted">
                    <th className="py-2">Name</th>
                    <th className="py-2">Balance</th>
                    <th className="py-2">Pending payout</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {(rows ?? []).map((r: { owner_id: string; balance_cents: number; pending_payout_cents?: number }) => {
                    const id = r.owner_id;
                    return (
                      <tr key={id} className="border-b border-border text-textSubtle">
                        <td className="py-3">{String(nameById.get(id) ?? id)}</td>
                        <td className="py-3 text-success">{fmtCents(r.balance_cents as number)}</td>
                        <td className="py-3">{fmtCents((r.pending_payout_cents as number) ?? 0)}</td>
                        <td className="py-3 text-right">
                          <Link
                            href={`/dashboard/finance/accounts/chefs/${id}`}
                            className="text-success hover:underline"
                          >
                            Ledger
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
