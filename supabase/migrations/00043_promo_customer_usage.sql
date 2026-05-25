-- ============================================================================
-- 00043_promo_customer_usage.sql
-- Adds per-customer promo code usage tracking to prevent abuse.
-- A customer can only use each promo code once.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS promo_code_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(promo_id, customer_id)
);

ALTER TABLE promo_code_usages ENABLE ROW LEVEL SECURITY;

-- Customers can see their own usage
CREATE POLICY "Customers can view own promo usage" ON promo_code_usages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = promo_code_usages.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- Only service_role can insert (via admin client during checkout)
CREATE POLICY "Service role manages promo usage" ON promo_code_usages
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_promo_usages_customer ON promo_code_usages(customer_id);
CREATE INDEX IF NOT EXISTS idx_promo_usages_promo ON promo_code_usages(promo_id);

COMMIT;
