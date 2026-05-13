-- ============================================================================
-- 00032_payout_concurrency_guard.sql
-- Prevent two concurrent payout runs for the same run_type (chef|driver).
-- Resolves REVIEW_2026-05-13.md finding O2 / C.5.
--
-- The partial unique index permits any number of rows in status pending/
-- completed/failed but only ONE row in status='processing' per run_type.
-- Combined with a route-level pre-check (see ops-admin payouts/execute/route.ts),
-- this prevents the "operator clicks twice" race that previously produced
-- duplicate ledger inserts and confusing payout_run.errors arrays.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS payout_runs_one_processing_per_type
  ON payout_runs (run_type)
  WHERE status = 'processing';
