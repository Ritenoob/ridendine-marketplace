# Fix Execution Report - 2026-05-20

This report records the production-readiness fixes executed against the 2026-05-20 fix plan. It does not certify staging or production readiness until the manual gates below pass in real environments.

## Status Summary

Peer review readiness: PARTIAL
QA/staging readiness: PARTIAL
Production readiness: FAIL

## P0 Results

1. Partial refund payment status mismatch: FIXED
   - Canonical status is `partially_refunded`.
   - Engine constants/types and platform refund flow were updated.
   - Migration `00040_payment_status_partial_refunds_and_order_fk_validation.sql` adds the DB check value.
   - Regression coverage verifies engine-written statuses are DB-allowed.

2. Payment capture model mismatch: FIXED
   - Canonical provider model is automatic capture at checkout.
   - Checkout explicitly creates PaymentIntents with `capture_method: 'automatic'`.
   - Pickup transition no longer claims `capture_payment` or `ORDER_PAYMENT_CAPTURED`.
   - Ledger wording now describes local payment recognition instead of delayed provider capture.

3. Order customer/storefront FK validation: FIXED
   - Migration blocks deployment if orphaned `orders.customer_id` or `orders.storefront_id` rows exist.
   - Migration validates `orders_customer_id_fkey` and `orders_storefront_id_fkey` when present.
   - Staging must still run orphan detection before applying the migration.

4. Smoke E2E port conflict: FIXED
   - Playwright smoke uses isolated configurable ports: 3100-3103 by default.
   - Existing server reuse is opt-in with `PLAYWRIGHT_REUSE_EXISTING_SERVER=true` and remains disabled in CI.
   - This avoids attaching smoke tests to an unrelated process on port 3002.

5. P0 regression tests: ADDED
   - Payment status vocabulary, capture mode, pickup side effects, FK validation migration, migration prefix uniqueness, private delivery proof storage, and retired cron route are covered by targeted tests.

## P1 Results

1. Migration replay and schema drift validation: PARTIAL
   - Duplicate `00039` migration prefix was normalized by renaming scheduled orders to `00041_scheduled_orders.sql`.
   - Added launch-readiness guard for duplicate migration prefixes.
   - Clean Supabase replay and upgraded staging replay still require staging/manual execution.

2. Stripe sandbox contract suite: PARTIAL
   - Added `pnpm test:stripe:sandbox`.
   - Existing Stripe e2e script now uses automatic capture, shared driver payout math, and avoids duplicate raw ledger settlement inserts.
   - Full webhook replay, duplicate webhook, delayed webhook, transfer, payout paid, and payout failed scenarios still require Stripe sandbox execution.

3. Full lifecycle E2E: PARTIAL
   - Existing `pnpm test:e2e:lifecycle` remains the staging command.
   - Added staging runbook with required passes and evidence.
   - Needs execution against seeded staging data.

4. Supabase RLS role tests: PARTIAL
   - Added `supabase/tests/rls/production_readiness.sql`.
   - Added root `pnpm test:rls` command.
   - Needs execution with Supabase CLI/test database.

5. Dispatch and driver payout consistency: FIXED
   - Dispatch now calculates delivery `driver_payout` from the same shared calculator used for ledger payable math.
   - Unit coverage verifies delivery row payout equals the ledger source-of-truth calculation.

6. Legacy cron route retirement: FIXED
   - `/api/cron/sla-tick` now returns `410 DEPRECATED_CRON_ROUTE`.
   - Route response points schedulers to `/api/engine/processors/sla`.
   - Staging scheduler must still be verified against canonical processor routes.

## P2 Results

1. Distributed rate limiting: FIXED LOCALLY, NEEDS STAGING CONFIG
   - Production readiness now reports `not_ready` when distributed rate limiting is missing.
   - Health test verifies production-like missing Upstash config returns not-ready.

2. Private storage for sensitive media: FIXED FOR DELIVERY PROOF
   - Driver delivery proof upload bucket is private.
   - Upload response returns a signed URL and storage path instead of a public URL.
   - Marketplace-safe public image upload routes were not changed.

3. Observability and alerting: PARTIAL
   - Sentry is already wired by app config when `NEXT_PUBLIC_SENTRY_DSN` is present.
   - Added runbook requirements for uptime, webhook, processor, payment, dispatch, and reconciliation alerts.
   - External alert delivery still requires staging/prod configuration.

4. Production env and release checklist: PARTIAL
   - Added `pnpm verify:launch-readiness` and `pnpm verify:launch-readiness:strict`.
   - Added release checklist.
   - Environment values must be configured and validated outside the repo.

5. Payout and reconciliation operations: PARTIAL
   - Driver payout formula mismatch was fixed.
   - Added finance runbook gates for payout dry-run, reconciliation, holds, retries, and variance checks.
   - Provider settlement still needs sandbox/staging proof.

6. Load and performance review: PARTIAL
   - Existing `pnpm test:load:staging` remains the load smoke command.
   - Added staging validation expectations for query plans and route performance.
   - Actual load metrics require a staging target.

## P3 Results

Background jobs, status vocabulary consolidation, UX/accessibility, retention/privacy, and operational runbooks are documented as post-launch hardening tracks. No risky architecture changes were made in this pass.

## Required Manual Gates Before QA

- `pnpm verify:launch-readiness:strict` passes in staging without printing secret values.
- `pnpm test:rls` passes against a clean Supabase test database.
- Clean migration replay and staging upgrade replay both pass.
- Stripe sandbox contract run passes and webhook events reconcile exactly once.
- `pnpm test:e2e:lifecycle` passes twice against fresh staging data.
- Scheduler targets `/api/engine/processors/*`, not retired `/api/cron/*` routes.
- Delivery proof media cannot be fetched without an authorized signed URL.

## Required Manual Gates Before Production

- Sentry/error reporting alert test received.
- Uptime checks cover all four apps and critical health endpoints.
- Payment reconciliation, stuck-order, stale-processor, and dispatch alerts fire in test mode.
- Finance payout dry-run reconciles to ledger/provider data.
- Load smoke and query-plan review meet staging targets.
- Release checklist is signed off by engineering, QA, ops, and finance.
