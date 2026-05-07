-- ==========================================
-- LOYALTY PROGRAM MIGRATION
-- 00027_loyalty_program.sql
-- ==========================================

-- loyalty_accounts: one per customer
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points_balance  INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  tier          TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id)
);

-- loyalty_transactions: audit trail for every points change
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loyalty_account_id UUID NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  order_id          UUID REFERENCES orders(id) ON DELETE SET NULL,
  points            INTEGER NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'bonus', 'expire')),
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_customer_id ON loyalty_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_account_id ON loyalty_transactions(loyalty_account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order_id ON loyalty_transactions(order_id);

-- RLS
ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own loyalty account
DROP POLICY IF EXISTS "customers_own_loyalty_account" ON loyalty_accounts;
CREATE POLICY "customers_own_loyalty_account"
  ON loyalty_accounts
  FOR ALL
  TO authenticated
  USING (
    customer_id = (
      SELECT id FROM customers WHERE user_id = auth.uid() LIMIT 1
    )
  );

-- Customers can only see their own loyalty transactions
DROP POLICY IF EXISTS "customers_own_loyalty_transactions" ON loyalty_transactions;
CREATE POLICY "customers_own_loyalty_transactions"
  ON loyalty_transactions
  FOR ALL
  TO authenticated
  USING (
    loyalty_account_id IN (
      SELECT la.id FROM loyalty_accounts la
      JOIN customers c ON c.id = la.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

-- Service role bypass (for server-side operations)
DROP POLICY IF EXISTS "service_role_loyalty_accounts" ON loyalty_accounts;
CREATE POLICY "service_role_loyalty_accounts"
  ON loyalty_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_loyalty_transactions" ON loyalty_transactions;
CREATE POLICY "service_role_loyalty_transactions"
  ON loyalty_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_loyalty_account_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_loyalty_accounts_updated_at ON loyalty_accounts;
CREATE TRIGGER trg_loyalty_accounts_updated_at
  BEFORE UPDATE ON loyalty_accounts
  FOR EACH ROW EXECUTE FUNCTION update_loyalty_account_updated_at();
