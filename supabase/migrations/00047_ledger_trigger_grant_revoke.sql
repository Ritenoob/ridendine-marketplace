-- ============================================================================
-- 00047_ledger_trigger_grant_revoke.sql
-- Follow-up to 00046: the prod grant audit (pnpm audit:db-hardening) found
-- ledger_entries_touch_platform_accounts (00019) still EXECUTE-granted to
-- anon/PUBLIC via 00029's blanket grant. It is a SECURITY DEFINER trigger
-- function (search_path already pinned at creation); trigger firing does not
-- check the DML user's EXECUTE privilege, so revoking direct-call grants is
-- safe and removes the last non-allowlisted DEFINER exposure.
-- ============================================================================

BEGIN;

REVOKE EXECUTE ON FUNCTION ledger_entries_touch_platform_accounts() FROM PUBLIC, anon, authenticated;

COMMIT;
