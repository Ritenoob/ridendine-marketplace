-- ==========================================
-- Phase 6 — Finance hardening (Stripe execution + reconciliation + risk)
-- Additive only.
-- ==========================================

-- Drift repair (2026-05-13): chef_payouts is declared in 00004 with IF NOT EXISTS
-- but observed to be missing on at least one environment (the live ref). Re-declaring
-- it defensively here so this migration is self-contained. No-op when table exists.
CREATE TABLE IF NOT EXISTS chef_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chef_profiles(id) ON DELETE CASCADE,
  stripe_transfer_id TEXT,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  orders_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_chef_payouts_chef_id ON chef_payouts(chef_id);
CREATE INDEX IF NOT EXISTS idx_chef_payouts_status ON chef_payouts(status);

-- Chef payout runs linkage (ops batch payouts)
ALTER TABLE chef_payouts
  ADD COLUMN IF NOT EXISTS payout_run_id UUID REFERENCES payout_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chef_payouts_payout_run_id
  ON chef_payouts (payout_run_id)
  WHERE payout_run_id IS NOT NULL;

-- Driver batch payouts: instant vs batch (Stripe payout id when using balance payout)
ALTER TABLE driver_payouts
  ADD COLUMN IF NOT EXISTS stripe_payout_id TEXT;

CREATE INDEX IF NOT EXISTS idx_driver_payouts_stripe_transfer_id
  ON driver_payouts (stripe_transfer_id)
  WHERE stripe_transfer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_driver_payouts_stripe_payout_id
  ON driver_payouts (stripe_payout_id)
  WHERE stripe_payout_id IS NOT NULL;

-- Connect + risk gate for driver transfers / instant payouts
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS payout_blocked BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN drivers.stripe_connect_account_id IS
  'Stripe Connect account id (acct_*) for transfers and instant payouts.';

COMMENT ON COLUMN drivers.payout_blocked IS
  'When true, engine blocks payout execution until ops clears the flag.';

-- Stripe event amount snapshot for reconciliation variance (webhook populates)
ALTER TABLE stripe_events_processed
  ADD COLUMN IF NOT EXISTS stripe_amount_cents BIGINT;

CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_amount
  ON stripe_events_processed (processed_at DESC)
  WHERE stripe_amount_cents IS NOT NULL;

-- High-variance flag for finance triage
ALTER TABLE stripe_reconciliation
  ADD COLUMN IF NOT EXISTS variance_flagged BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_stripe_reconciliation_variance_flagged
  ON stripe_reconciliation (variance_flagged, created_at DESC)
  WHERE variance_flagged = true;
