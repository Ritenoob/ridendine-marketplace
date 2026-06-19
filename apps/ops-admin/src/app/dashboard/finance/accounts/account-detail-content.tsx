import Link from 'next/link';
import { Badge, Card } from '@ridendine/ui';
import {
  createAdminClient,
  getChefDisplayName,
  getDriverNameRef,
  getPlatformAccount,
  listLedgerEntriesForEntity,
  type SupabaseClient,
} from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { FinanceSubnav } from '../_components/FinanceSubnav';

function fmtCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export type AccountDetailType = 'chefs' | 'drivers';

export async function FinanceAccountDetailContent({ type, id }: { type: AccountDetailType; id: string }) {
  const accountType = type === 'chefs' ? 'chef_payable' : 'driver_payable';
  const admin = createAdminClient() as unknown as SupabaseClient;

  // The raw queries tolerated lookup errors (acctErr / ledErr rendered
  // fallback panels); repository failures degrade the same way.
  let account: Record<string, unknown> | null = null;
  let acctErr = false;
  try {
    account = await getPlatformAccount(admin, accountType, id);
  } catch {
    acctErr = true;
  }

  let title = id;
  if (type === 'chefs') {
    const chef = await getChefDisplayName(admin, id).catch(() => null);
    title = (chef?.display_name as string) ?? id;
  } else {
    const d = await getDriverNameRef(admin, id).catch(() => null);
    title =
      `${(d?.first_name as string) ?? ''} ${(d?.last_name as string) ?? ''}`.trim() || id;
  }

  let entries: Record<string, unknown>[] | null = null;
  let ledErr = false;
  try {
    entries = (await listLedgerEntriesForEntity(
      admin,
      type === 'chefs' ? 'chef' : 'driver',
      id,
      100
    )) as unknown as Record<string, unknown>[];
  } catch {
    ledErr = true;
  }

  const listHref = type === 'chefs' ? '/dashboard/finance/accounts/chefs' : '/dashboard/finance/accounts/drivers';

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <FinanceSubnav />
        <div className="flex flex-wrap items-center gap-3">
          <Link href={listHref} className="text-sm text-success hover:underline">
            ← Back to {type === 'chefs' ? 'chef' : 'driver'} accounts
          </Link>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          <p className="mt-1 text-textMuted">
            {accountType} · owner <span className="font-mono text-textSubtle">{id}</span>
          </p>
        </div>

        {acctErr || !account ? (
          <Card className="border-border bg-surface p-6 text-textSubtle">
            No platform_accounts row yet (balance may be zero until ledger activity).
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border bg-surface p-4">
              <p className="text-sm text-textMuted">Balance</p>
              <p className="mt-1 text-2xl font-bold text-success">
                {fmtCents(account.balance_cents as number)}
              </p>
            </Card>
            <Card className="border-border bg-surface p-4">
              <p className="text-sm text-textMuted">Pending payout</p>
              <p className="mt-1 text-2xl font-bold text-warning">
                {fmtCents((account.pending_payout_cents as number) ?? 0)}
              </p>
            </Card>
            <Card className="border-border bg-surface p-4">
              <p className="text-sm text-textMuted">Currency</p>
              <p className="mt-1 text-2xl font-bold text-white">{(account.currency as string) ?? 'CAD'}</p>
            </Card>
          </div>
        )}

        <Card className="border-border bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Ledger lines (entity scoped)</h2>
            <Badge className="bg-surfaceMuted text-textSubtle">{(entries ?? []).length}</Badge>
          </div>
          {ledErr ? (
            <p className="text-danger">Could not load ledger.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-textMuted">
                    <th className="py-2">When</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Order</th>
                    <th className="py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {(entries ?? []).map((e: Record<string, unknown>) => (
                    <tr key={e.id as string} className="border-b border-border text-textSubtle">
                      <td className="py-2 whitespace-nowrap">
                        {new Date(e.created_at as string).toLocaleString()}
                      </td>
                      <td className="py-2">{e.entry_type as string}</td>
                      <td className="py-2 font-mono text-success">{fmtCents(e.amount_cents as number)}</td>
                      <td className="py-2 font-mono text-xs text-textMuted">
                        {(e.order_id as string | null)?.slice(0, 8) ?? '—'}
                      </td>
                      <td className="py-2 text-textMuted">{(e.description as string) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
