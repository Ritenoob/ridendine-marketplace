-- ============================================================
-- Driver Payout Accounts (Stripe Connect Express)
-- Mirrors chef_payout_accounts structure for drivers
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_payout_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE UNIQUE,
  stripe_account_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'restricted')),
  charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_payout_accounts_driver_id
  ON driver_payout_accounts(driver_id);

ALTER TABLE driver_payout_accounts ENABLE ROW LEVEL SECURITY;

-- Drivers can read their own payout account
CREATE POLICY "Drivers can view own payout account"
  ON driver_payout_accounts
  FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

-- Service role manages all records
CREATE POLICY "Service role manages driver payout accounts"
  ON driver_payout_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
