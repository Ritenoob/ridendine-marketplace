import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@ridendine/db';
import { createCentralEngine } from '@ridendine/engine';
import { getDriverActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type PendingInstantPayoutRow = {
  amount_cents?: number | null;
  fee_cents?: number | null;
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

function pendingHoldCents(rows: PendingInstantPayoutRow[]): number {
  return rows.reduce(
    (sum, row) => sum + Number(row.amount_cents ?? 0) + Number(row.fee_cents ?? 0),
    0
  );
}

function instantFeeCents(amountCents: number): number {
  return Math.round((amountCents * 150) / 10_000);
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getDriverActorContext({ requireApproved: true });
    if (!ctx) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or driver not approved', 401);
    }

    const db = createAdminClient();

    const { data: row } = await db
      .from('drivers')
      .select('instant_payouts_enabled')
      .eq('id', ctx.driverId)
      .single();

    const instantOn = Boolean((row as { instant_payouts_enabled?: boolean } | null)?.instant_payouts_enabled);
    if (!instantOn) {
      return errorResponse('DISABLED', 'Enable instant payouts in Settings first', 400);
    }

    let body: { amountCents?: number };
    try {
      body = (await request.json()) as { amountCents?: number };
    } catch {
      return errorResponse('INVALID_JSON', 'Expected JSON body', 400);
    }

    const amountCents = Math.floor(Number(body.amountCents));
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return errorResponse('INVALID_AMOUNT', 'amountCents must be a positive integer', 400);
    }

    const { data: acct } = await (db as SupabaseClient & { from: (t: string) => SupabaseClient['from'] })
      .from('platform_accounts' as never)
      .select('balance_cents, currency')
      .eq('account_type', 'driver_payable')
      .eq('owner_id', ctx.driverId)
      .maybeSingle();

    const bal = Number((acct as { balance_cents?: number } | null)?.balance_cents ?? 0);
    const { data: pendingRows, error: pendingError } = await (db as SupabaseClient & { from: (t: string) => SupabaseClient['from'] })
      .from('instant_payout_requests' as never)
      .select('amount_cents, fee_cents')
      .eq('driver_id', ctx.driverId)
      .eq('status', 'pending');

    if (pendingError) {
      return errorResponse('FINANCIAL_QUERY_ERROR', 'Could not verify pending instant payout requests', 500);
    }

    const netAvailableCents = Math.max(0, bal - pendingHoldCents((pendingRows ?? []) as PendingInstantPayoutRow[]));
    const currentFeeCents = instantFeeCents(amountCents);
    if (amountCents + currentFeeCents > netAvailableCents) {
      return errorResponse(
        'INSUFFICIENT_BALANCE',
        'Amount plus instant payout fee exceeds available payable balance after pending instant payout requests and fees',
        400
      );
    }

    const currency = normalizeCurrency((acct as { currency?: string } | null)?.currency);
    const engine = createCentralEngine(db);
    const created = await engine.payoutAutomation.requestInstantPayout({
      driverId: ctx.driverId,
      amountCents,
      currency,
    });

    if (created.error) {
      return errorResponse('REQUEST_FAILED', created.error, 400);
    }

    return successResponse({
      requestId: created.requestId,
      feeCents: created.feeCents,
      amountCents,
      currency,
    });
  } catch (error) {
    console.error('[driver-app][instant-payout]', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
