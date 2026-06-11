-- ============================================================================
-- 00046_legacy_definer_function_lockdown.sql
-- Completes the follow-up audit required by 00045's post-migration checklist
-- (item 2): enumerate the SECURITY DEFINER functions that predate 00029's
-- GRANT ALL ON ALL ROUTINES and revoke anon/PUBLIC EXECUTE per function.
--
-- Full enumeration of DEFINER functions across 00001–00045 and their
-- disposition:
--
--   Locked down here:
--     * increment_promo_usage(UUID)        (00010) — mutates promo_codes
--       usage counters with owner privileges and no role check; 00010 even
--       granted it to authenticated explicitly. Verified: the only
--       application path is packages/db promo.repository
--       incrementPromoCodeUsage(), reachable only from server-side code via
--       the admin client (no browser .rpc() call sites). service_role keeps
--       EXECUTE; search_path is pinned (00010 created it without one).
--     * log_audit_change()                  (00007, redefined 00014) — DEFINER
--       trigger function created without a pinned search_path. Trigger firing
--       does not check the DML user's EXECUTE privilege (that is checked at
--       CREATE TRIGGER time), so revoking direct EXECUTE is safe and the
--       search_path pin closes the schema-hijack window.
--
--   Pinned search_path only (grants intentionally kept):
--     * is_ops_admin(UUID), get_chef_id(UUID), get_customer_id(UUID),
--       get_driver_id(UUID)                 (00003) — DEFINER RLS helpers
--       referenced inside row-security policy expressions; the querying role
--       (authenticated, and anon on public browse tables) must hold EXECUTE
--       or every policied query fails. They are read-only and return only
--       the caller-supplied user's own role-entity id / boolean, so the
--       exposure is acceptable; the missing search_path pin is not.
--
--   Already handled (no action here):
--     * 00008 engine RPCs + get_order_timeline(UUID) — revoked and pinned in
--       00045 S1.
--     * get_chef_liability_summaries / get_driver_liability_summaries —
--       created locked-down in 00045 F1.
--     * is_platform_staff / is_finance_staff / is_support_staff (00025) —
--       created with pinned search_path; EXECUTE for anon/authenticated is
--       deliberate (RLS helpers).
--     * ledger_entries_touch_platform_accounts (00019) — DEFINER trigger
--       created with pinned search_path.
--
--   Not DEFINER (invoker rights — no privilege escalation; left untouched):
--     * update_updated_at_column (00001), populate_order_item_name (00006),
--       sync_order_status_history / sync_driver_presence_location /
--       sync_notification_body / sync_promo_code_fields / sync_kitchen_address
--       (00010), orders_public_stage_from_engine /
--       orders_sync_public_stage_from_engine (00019),
--       update_loyalty_account_updated_at (00027).
--
-- All statements are idempotent (REVOKE/GRANT/ALTER FUNCTION SET re-apply
-- cleanly), matching 00045's conventions.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. increment_promo_usage — service_role only.
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION increment_promo_usage(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_promo_usage(UUID) TO service_role;
ALTER FUNCTION increment_promo_usage(UUID) SET search_path = public;

-- ----------------------------------------------------------------------------
-- 2. log_audit_change — DEFINER trigger function: pin search_path, remove
--    direct-call grants (trigger execution is unaffected).
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION log_audit_change() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION log_audit_change() SET search_path = public;

-- ----------------------------------------------------------------------------
-- 3. 00003 RLS helpers — pin search_path; EXECUTE grants stay (required by
--    policy expressions evaluated as the querying role).
-- ----------------------------------------------------------------------------
ALTER FUNCTION is_ops_admin(UUID) SET search_path = public;
ALTER FUNCTION get_chef_id(UUID) SET search_path = public;
ALTER FUNCTION get_customer_id(UUID) SET search_path = public;
ALTER FUNCTION get_driver_id(UUID) SET search_path = public;

COMMIT;
