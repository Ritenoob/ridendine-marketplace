-- ==========================================
-- CLOSE-OF-DAY + SERVICE CONTROLS (Stages 12 & 13)
-- 00060_close_day_and_service.sql
--
-- Additive only.
--   * kitchen_daily_summaries: a saved, reopenable close-of-day report.
--   * chef_storefronts.service_state: richer service mode than is_paused alone.
--
-- service_state stays consistent with the existing is_paused guardrail: the
-- service-mode API sets is_paused = true for paused/closed so the customer app's
-- existing checkout block keeps working without any customer-app change.
--
-- RLS mirrors prior stages for the new table.
-- ==========================================

-- ------------------------------------------------------------------
-- Stage 13: storefront service state (open / paused / slow_mode / closed / overloaded)
-- ------------------------------------------------------------------
ALTER TABLE chef_storefronts
  ADD COLUMN IF NOT EXISTS service_state TEXT NOT NULL DEFAULT 'open'
    CHECK (service_state IN ('open', 'paused', 'slow_mode', 'closed', 'overloaded'));

ALTER TABLE chef_storefronts
  ADD COLUMN IF NOT EXISTS service_state_reason TEXT;

ALTER TABLE chef_storefronts
  ADD COLUMN IF NOT EXISTS prep_time_buffer_minutes INTEGER NOT NULL DEFAULT 0;

-- ------------------------------------------------------------------
-- Stage 12: kitchen_daily_summaries
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kitchen_daily_summaries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id     UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
  summary_date      DATE NOT NULL,
  orders_completed  INTEGER NOT NULL DEFAULT 0,
  gross_sales       NUMERIC(14, 2) NOT NULL DEFAULT 0,
  net_sales         NUMERIC(14, 2) NOT NULL DEFAULT 0,
  food_cost         NUMERIC(14, 2),
  packaging_cost    NUMERIC(14, 2),
  labor_cost        NUMERIC(14, 2),
  waste_value       NUMERIC(14, 2),
  refund_loss       NUMERIC(14, 2),
  prime_cost        NUMERIC(14, 2),
  avg_prep_minutes  NUMERIC(10, 2),
  late_tickets      INTEGER NOT NULL DEFAULT 0,
  top_sellers       JSONB NOT NULL DEFAULT '[]',
  sold_out_items    JSONB NOT NULL DEFAULT '[]',
  notes             TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  closed_by         UUID,
  closed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  reopened_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (storefront_id, summary_date)
);
CREATE INDEX IF NOT EXISTS idx_kitchen_daily_summaries_storefront ON kitchen_daily_summaries(storefront_id, summary_date);

DROP TRIGGER IF EXISTS update_kitchen_daily_summaries_updated_at ON kitchen_daily_summaries;
CREATE TRIGGER update_kitchen_daily_summaries_updated_at BEFORE UPDATE ON kitchen_daily_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE kitchen_daily_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chef_manage_own_daily_summaries" ON kitchen_daily_summaries;
CREATE POLICY "chef_manage_own_daily_summaries" ON kitchen_daily_summaries FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(storefront_id));
DROP POLICY IF EXISTS "ops_read_daily_summaries" ON kitchen_daily_summaries;
CREATE POLICY "ops_read_daily_summaries" ON kitchen_daily_summaries FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_daily_summaries" ON kitchen_daily_summaries;
CREATE POLICY "service_role_daily_summaries" ON kitchen_daily_summaries FOR ALL TO service_role
  USING (true) WITH CHECK (true);
