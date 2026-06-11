-- ============================================================================
-- 00045_security_and_integrity_hardening.sql
-- Pre-launch security + integrity hardening, follow-up to 00031 and 00042.
--
-- Findings addressed (verified against application code before changing):
--   S1. SECURITY DEFINER RPCs from 00008 are executable by anon/authenticated
--       (via 00029's GRANT ALL ON ALL ROUTINES + Postgres' default PUBLIC
--       EXECUTE on functions) but contain no internal role checks. Anon could
--       read platform financials (get_financial_summary) and driver PII
--       (get_available_drivers_near). Static scan of `.rpc(` call sites shows
--       every caller uses createAdminClient() (service_role), so EXECUTE is
--       revoked from PUBLIC/anon/authenticated and granted to service_role.
--   S2. 00029's ALTER DEFAULT PRIVILEGES auto-grants future routines to anon.
--   S3. ops_processor_runs (00023) has no RLS; 00029 granted ALL to
--       anon/authenticated. Only writers/readers are server-side processors
--       and the health endpoint, both via createAdminClient() (service_role,
--       which bypasses RLS), so RLS is enabled with NO permissive policies.
--   S4. WITH CHECK (true) INSERT policies from 00007 let any signed-in user
--       forge ledger entries, domain events, and storefront state changes.
--       All legitimate writers (packages/engine orchestrators, ops-admin API
--       routes) use the admin client, so the policies are dropped outright
--       (same treatment 00031 gave audit_logs_insert_all).
--   S5. "System can insert notifications" (00011) let any authenticated user
--       insert notifications for ANY user. Notification fan-out
--       (packages/engine notification-sender, ops-admin notify/announcements
--       routes) uses the admin client, so the policy is dropped.
--   I1. Missing indexes on frequently-joined FK columns.
--   I2. deliveries.order_id has no UNIQUE constraint; dispatch is
--       check-then-insert and can double-create deliveries under races.
--   F1. Ops finance dashboard summed the entire ledger_entries table in JS;
--       replaced with SQL aggregate RPCs (see finance.repository.ts).
--
-- Safe-by-default patterns used:
--   * REVOKE/GRANT and ALTER FUNCTION ... SET re-apply cleanly (idempotent).
--   * DROP POLICY IF EXISTS / CREATE INDEX IF NOT EXISTS for idempotency.
--   * The deliveries unique index is created inside a DO block that skips
--     (with a NOTICE) if duplicate order_id rows already exist, instead of
--     failing the migration.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- S1 — Lock down the SECURITY DEFINER engine RPCs from 00008.
-- These run with owner privileges and have no internal role checks. No
-- browser/anon-key code path calls them: get_ops_dashboard_stats is called by
-- apps/ops-admin/.../engine/dashboard/route.ts and ops.repository via the
-- admin client; increment_order_exception_count by packages/engine
-- support.engine (admin client); the rest have no application callers at all.
-- service_role keeps EXECUTE for server-side use.
-- Note: revoking from PUBLIC is required — Postgres grants EXECUTE on
-- functions to PUBLIC by default, so revoking only anon/authenticated would
-- leave them callable through the implicit PUBLIC grant.
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION increment_queue_size(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION decrement_queue_size(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION increment_order_exception_count(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_orders_needing_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_available_drivers_near(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_ops_dashboard_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_order_timeline(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_financial_summary(DATE, DATE) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION increment_queue_size(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION decrement_queue_size(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION increment_order_exception_count(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_orders_needing_dispatch() TO service_role;
GRANT EXECUTE ON FUNCTION get_available_drivers_near(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO service_role;
GRANT EXECUTE ON FUNCTION get_ops_dashboard_stats() TO service_role;
GRANT EXECUTE ON FUNCTION get_order_timeline(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_financial_summary(DATE, DATE) TO service_role;

-- Pin search_path on the DEFINER functions from 00008 (and the 00010
-- re-definition of get_order_timeline), which were created without it.
-- Without a pinned search_path, a DEFINER function can be hijacked via
-- attacker-controlled schemas earlier in the caller's search_path.
-- Same pattern as ledger_entries_touch_platform_accounts in 00019.
ALTER FUNCTION increment_queue_size(UUID) SET search_path = public;
ALTER FUNCTION decrement_queue_size(UUID) SET search_path = public;
ALTER FUNCTION increment_order_exception_count(UUID) SET search_path = public;
ALTER FUNCTION get_orders_needing_dispatch() SET search_path = public;
ALTER FUNCTION get_available_drivers_near(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) SET search_path = public;
ALTER FUNCTION get_ops_dashboard_stats() SET search_path = public;
ALTER FUNCTION get_order_timeline(UUID) SET search_path = public;
ALTER FUNCTION get_financial_summary(DATE, DATE) SET search_path = public;


-- ----------------------------------------------------------------------------
-- S2 — Stop auto-granting future routines to anon.
-- 00029 set ALTER DEFAULT PRIVILEGES ... GRANT ALL ON ROUTINES TO anon,
-- authenticated, service_role, so every function created after it is
-- anon-executable by default. Remove anon from the default ACL, and remove
-- the implicit PUBLIC EXECUTE default for future routines (anon would
-- otherwise still inherit EXECUTE through PUBLIC). authenticated and
-- service_role defaults are intentionally left in place — RLS-safe RPCs are
-- legitimately called by signed-in clients.
-- ----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON ROUTINES FROM PUBLIC;


-- ----------------------------------------------------------------------------
-- S3 — Enable RLS on ops_processor_runs (00023 created it with none).
-- Combined with 00029's GRANT ALL, any authenticated (or anon) key could
-- read/write processor bookkeeping. The only application access is
-- claimProcessorRun/finishProcessorRun and the engine health endpoint
-- (apps/ops-admin), all via createAdminClient() — service_role bypasses RLS,
-- so deliberately NO permissive policies are created. Table privileges are
-- also revoked from anon/authenticated as defense in depth.
-- ----------------------------------------------------------------------------
ALTER TABLE ops_processor_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE ops_processor_runs FROM anon, authenticated;


-- ----------------------------------------------------------------------------
-- S4 — Remove the WITH CHECK (true) INSERT policies from 00007.
-- Any signed-in user could forge financial ledger rows, fabricate domain
-- events, or write storefront state changes. Verified writers:
--   * ledger_entries: packages/engine (commerce/payout/platform/master-order
--     engines, ledger.service) — engine is always built from
--     createAdminClient() (getAdminEngine in packages/engine/client-helpers).
--   * domain_events: packages/engine core/event-emitter — admin client.
--   * storefront_state_changes: packages/engine kitchen/platform engines —
--     admin client; ops-admin route only SELECTs.
-- No authenticated-client write path exists, so the policies are dropped
-- outright (mirrors 00031's removal of audit_logs_insert_all). SELECT
-- policies from 00007 are unaffected.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "ledger_entries_insert_system" ON ledger_entries;
DROP POLICY IF EXISTS "domain_events_insert_system" ON domain_events;
DROP POLICY IF EXISTS "storefront_state_changes_insert" ON storefront_state_changes;


-- ----------------------------------------------------------------------------
-- S5 — Remove the notification-forging policy from 00011.
-- "System can insert notifications" was FOR INSERT TO authenticated
-- WITH CHECK (true): any signed-in user could insert notifications for any
-- other user (phishing vector). Verified fan-out writers all use the admin
-- client: packages/engine notification-sender/dispatch/offer-management/
-- order-creation/platform engines, and ops-admin customers/[id]/notify +
-- announcements routes.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;


-- ----------------------------------------------------------------------------
-- I1 — Missing FK-column indexes.
-- These columns are FK join/filter targets with no covering index. Postgres
-- does not index FK columns automatically; lookups and ON DELETE CASCADE
-- maintenance on the parent degrade to sequential scans without them.
-- Notes:
--   * order_status_history(order_id) is already covered by
--     idx_order_status_history_order_id from 00004 (kept here as a no-op
--     IF NOT EXISTS so the invariant is recorded in one place).
--   * reviews(order_id) is intentionally omitted: the UNIQUE(order_id)
--     constraint from 00001 already provides a unique index.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_id ON driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_payouts_driver_id ON driver_payouts(driver_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);


-- ----------------------------------------------------------------------------
-- I2 — Defensive unique index on deliveries(order_id).
-- Dispatch is check-then-insert (get_orders_needing_dispatch LEFT JOINs
-- deliveries and inserts when none exists), which can double-create a
-- delivery for the same order under concurrent processors. A unique index
-- makes the second insert fail instead of silently forking the delivery.
-- If duplicates already exist in this database, creation is skipped with a
-- NOTICE — dedupe manually, then re-run the CREATE UNIQUE INDEX below.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM deliveries
    GROUP BY order_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'Skipping uq_deliveries_order_id: duplicate deliveries.order_id rows exist. '
      'Dedupe with: SELECT order_id, array_agg(id) FROM deliveries GROUP BY order_id HAVING COUNT(*) > 1; '
      'then run: CREATE UNIQUE INDEX IF NOT EXISTS uq_deliveries_order_id ON deliveries(order_id);';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uq_deliveries_order_id ON deliveries(order_id);
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- F1 — SQL aggregate RPCs for ops finance liability summaries.
-- getChefLiabilitySummaries / getDriverLiabilitySummaries
-- (packages/db/src/repositories/finance.repository.ts) previously selected
-- EVERY matching ledger_entries row and summed client-side — unbounded memory
-- and transfer growth as the ledger grows. These RPCs perform the identical
-- aggregation in SQL:
--   * chef:   SUM(amount_cents)/100 per entity_id where entry_type =
--             'chef_payable', name from chef_profiles.display_name
--             (fallback 'Unknown Chef').
--   * driver: SUM(amount_cents)/100 per entity_id where entry_type IN
--             ('driver_payable','tip_payable'), name from drivers
--             first/last name (fallback 'Unknown Driver').
-- Both order by amount descending and honor a row limit (JS default was 10;
-- the ops read model passes 20).
-- SECURITY DEFINER + pinned search_path; callable only by service_role —
-- the sole caller is the ops engine read model built on the admin client.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_chef_liability_summaries(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  name TEXT,
  amount NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    le.entity_id,
    COALESCE(cp.display_name, 'Unknown Chef'),
    SUM(le.amount_cents)::numeric / 100
  FROM ledger_entries le
  LEFT JOIN chef_profiles cp ON cp.id = le.entity_id
  WHERE le.entry_type = 'chef_payable'
    AND le.entity_id IS NOT NULL
  GROUP BY le.entity_id, cp.display_name
  ORDER BY SUM(le.amount_cents) DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION get_driver_liability_summaries(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  name TEXT,
  amount NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    le.entity_id,
    COALESCE(NULLIF(TRIM(CONCAT_WS(' ', d.first_name, d.last_name)), ''), 'Unknown Driver'),
    SUM(le.amount_cents)::numeric / 100
  FROM ledger_entries le
  LEFT JOIN drivers d ON d.id = le.entity_id
  WHERE le.entry_type IN ('driver_payable', 'tip_payable')
    AND le.entity_id IS NOT NULL
  GROUP BY le.entity_id, d.first_name, d.last_name
  ORDER BY SUM(le.amount_cents) DESC
  LIMIT p_limit;
$$;

REVOKE EXECUTE ON FUNCTION get_chef_liability_summaries(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_driver_liability_summaries(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_chef_liability_summaries(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_driver_liability_summaries(INTEGER) TO service_role;

COMMIT;


-- ============================================================================
-- POST-MIGRATION CLEANUP CHECKLIST
-- ============================================================================
-- 1) If the migration logged "Skipping uq_deliveries_order_id", find and
--    dedupe the duplicate deliveries, then create the index:
--      SELECT order_id, array_agg(id ORDER BY created_at) AS delivery_ids
--      FROM deliveries GROUP BY order_id HAVING COUNT(*) > 1;
--      -- keep the first/active delivery per order, delete the rest, then:
--      CREATE UNIQUE INDEX IF NOT EXISTS uq_deliveries_order_id ON deliveries(order_id);
--
-- 2) Known residual exposure (intentionally NOT changed here):
--    00029's GRANT ALL ON ALL ROUTINES gave anon EXECUTE on every function
--    that existed at that time (e.g. increment_promo_usage from 00010, a
--    DEFINER function without role checks). This migration only revokes the
--    00008 engine RPCs plus the two new finance RPCs, and fixes the defaults
--    so the problem stops compounding. A follow-up audit should enumerate
--    remaining DEFINER functions and revoke anon/PUBLIC EXECUTE per function.
-- ============================================================================
