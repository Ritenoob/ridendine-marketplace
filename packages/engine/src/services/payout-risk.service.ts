// ==========================================
// Pre-finance gate — block illegal / unsafe payouts (Phase 6)
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';

export type PayoutRiskBlock = { ok: false; code: string; message: string };
export type PayoutRiskOk = { ok: true };
export type PayoutRiskResult = PayoutRiskOk | PayoutRiskBlock;

// Risk checks fail CLOSED: if a guard query errors we cannot prove the payout
// is safe (the duplicate check in particular would otherwise silently pass),
// so the line is blocked and the run can retry it later.
function riskCheckFailed(check: string, error: { message?: string }): PayoutRiskBlock {
  return {
    ok: false,
    code: 'RISK_CHECK_FAILED',
    message: `Could not verify ${check}: ${error.message ?? 'query failed'}`,
  };
}

export async function validateChefPayoutLine(
  client: SupabaseClient,
  input: {
    storefrontId: string;
    chefId: string;
    amountCents: number;
    currency: string;
    payoutRunId: string;
  }
): Promise<PayoutRiskResult> {
  if (input.amountCents <= 0) {
    return { ok: false, code: 'INVALID_AMOUNT', message: 'Payout amount must be positive' };
  }

  const { data: acct, error: acctError } = await client
    .from('platform_accounts')
    .select('balance_cents, currency')
    .eq('account_type', 'chef_payable')
    .eq('owner_id', input.storefrontId)
    .maybeSingle();
  if (acctError) {
    return riskCheckFailed('chef payable balance', acctError);
  }

  // Case-insensitive: Stripe uses lowercase codes while account rows may
  // store uppercase (e.g. 'CAD' vs 'cad').
  if (acct?.currency && String(acct.currency).toLowerCase() !== input.currency.toLowerCase()) {
    return {
      ok: false,
      code: 'CURRENCY_MISMATCH',
      message: `Payout currency ${input.currency} does not match account currency ${acct.currency}`,
    };
  }

  const bal = (acct?.balance_cents as number) ?? 0;
  if (bal < input.amountCents) {
    return {
      ok: false,
      code: 'INSUFFICIENT_BALANCE',
      message: `Chef payable balance ${bal} < requested ${input.amountCents}`,
    };
  }

  const { data: dup, error: dupError } = await client
    .from('chef_payouts')
    .select('id')
    .eq('chef_id', input.chefId)
    .eq('payout_run_id', input.payoutRunId)
    .in('status', ['pending', 'processing', 'completed'])
    .maybeSingle();
  if (dupError) {
    return riskCheckFailed('duplicate chef payout guard', dupError);
  }

  if (dup?.id) {
    return { ok: false, code: 'DUPLICATE_PAYOUT', message: 'Chef payout already recorded for this run' };
  }

  const { data: payoutAcct, error: payoutAcctError } = await client
    .from('chef_payout_accounts')
    .select('stripe_account_id, payout_enabled, is_verified')
    .eq('chef_id', input.chefId)
    .maybeSingle();
  if (payoutAcctError) {
    return riskCheckFailed('chef payout account', payoutAcctError);
  }

  if (!payoutAcct?.stripe_account_id) {
    return { ok: false, code: 'NO_STRIPE_ACCOUNT', message: 'Chef has no Stripe Connect account' };
  }
  if (payoutAcct.payout_enabled === false) {
    return { ok: false, code: 'PAYOUT_DISABLED', message: 'Chef payout account disabled' };
  }
  if (payoutAcct.is_verified !== true) {
    return { ok: false, code: 'ACCOUNT_NOT_VERIFIED', message: 'Chef payout account not verified' };
  }

  return { ok: true };
}

export async function validateDriverBatchPayoutLine(
  client: SupabaseClient,
  input: {
    driverId: string;
    amountCents: number;
    payoutRunId: string;
  }
): Promise<PayoutRiskResult> {
  if (input.amountCents <= 0) {
    return { ok: false, code: 'INVALID_AMOUNT', message: 'Payout amount must be positive' };
  }

  const { data: drv, error: drvError } = await client
    .from('drivers')
    .select('stripe_connect_account_id, payout_blocked')
    .eq('id', input.driverId)
    .maybeSingle();
  if (drvError) {
    return riskCheckFailed('driver payout eligibility', drvError);
  }

  if (drv?.payout_blocked === true) {
    return { ok: false, code: 'PAYOUT_BLOCKED', message: 'Driver payouts suspended' };
  }
  if (!drv?.stripe_connect_account_id) {
    return { ok: false, code: 'NO_STRIPE_ACCOUNT', message: 'Driver has no Stripe Connect account' };
  }

  const { data: acct, error: acctError } = await client
    .from('platform_accounts')
    .select('balance_cents')
    .eq('account_type', 'driver_payable')
    .eq('owner_id', input.driverId)
    .maybeSingle();
  if (acctError) {
    return riskCheckFailed('driver payable balance', acctError);
  }

  const bal = (acct?.balance_cents as number) ?? 0;
  if (bal < input.amountCents) {
    return {
      ok: false,
      code: 'INSUFFICIENT_BALANCE',
      message: `Driver payable balance ${bal} < requested ${input.amountCents}`,
    };
  }

  const { data: dup, error: dupError } = await client
    .from('driver_payouts')
    .select('id')
    .eq('driver_id', input.driverId)
    .eq('payout_run_id', input.payoutRunId)
    .in('status', ['pending', 'processing', 'completed'])
    .maybeSingle();
  if (dupError) {
    return riskCheckFailed('duplicate driver payout guard', dupError);
  }

  if (dup?.id) {
    return { ok: false, code: 'DUPLICATE_PAYOUT', message: 'Driver payout already recorded for this run' };
  }

  return { ok: true };
}

export async function validateInstantPayoutRequest(
  client: SupabaseClient,
  input: { requestId: string; driverId: string; amountCents: number }
): Promise<PayoutRiskResult> {
  if (input.amountCents <= 0) {
    return { ok: false, code: 'INVALID_AMOUNT', message: 'Amount must be positive' };
  }

  const { data: req, error: reqError } = await client
    .from('instant_payout_requests')
    .select('id, status, amount_cents, fee_cents')
    .eq('id', input.requestId)
    .maybeSingle();
  if (reqError) {
    return riskCheckFailed('instant payout request', reqError);
  }

  if (!req) {
    return { ok: false, code: 'NOT_FOUND', message: 'Instant payout request not found' };
  }
  if (req.status !== 'pending') {
    return { ok: false, code: 'NOT_EXECUTABLE', message: `Request status is ${req.status}` };
  }
  if ((req.amount_cents as number) !== input.amountCents) {
    return { ok: false, code: 'AMOUNT_MISMATCH', message: 'Amount does not match stored request' };
  }
  const feeCents = Number((req as { fee_cents?: number | null }).fee_cents ?? 0);

  const { data: drv, error: drvError } = await client
    .from('drivers')
    .select('stripe_connect_account_id, payout_blocked, instant_payouts_enabled')
    .eq('id', input.driverId)
    .maybeSingle();
  if (drvError) {
    return riskCheckFailed('driver instant payout eligibility', drvError);
  }

  if (drv?.payout_blocked === true) {
    return { ok: false, code: 'PAYOUT_BLOCKED', message: 'Driver payouts suspended' };
  }
  if (drv?.instant_payouts_enabled !== true) {
    return { ok: false, code: 'INSTANT_DISABLED', message: 'Instant payouts not enabled for driver' };
  }
  if (!drv?.stripe_connect_account_id) {
    return { ok: false, code: 'NO_STRIPE_ACCOUNT', message: 'Driver has no Stripe Connect account' };
  }

  const { data: acct, error: acctError } = await client
    .from('platform_accounts')
    .select('balance_cents')
    .eq('account_type', 'driver_payable')
    .eq('owner_id', input.driverId)
    .maybeSingle();
  if (acctError) {
    return riskCheckFailed('driver payable balance', acctError);
  }

  const bal = (acct?.balance_cents as number) ?? 0;
  const requiredCents = input.amountCents + feeCents;
  if (bal < requiredCents) {
    return {
      ok: false,
      code: 'INSUFFICIENT_BALANCE',
      message: `Driver payable balance ${bal} < requested ${requiredCents} including instant payout fee`,
    };
  }

  return { ok: true };
}
