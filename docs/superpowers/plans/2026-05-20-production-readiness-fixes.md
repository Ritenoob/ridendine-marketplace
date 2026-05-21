# Production Readiness Fix Execution Plan - 2026-05-20

## Scope

Implement the actionable items from `docs/production-readiness/FIX_PLAN_2026-05-20.md` without restructuring the platform or making risky payment/auth/schema changes beyond documented P0 fixes.

## Execution Approach

1. Add failing regression coverage for the P0 issues before changing implementation.
2. Fix P0 defects in payment status vocabulary, capture-model wiring, order FK validation, isolated smoke-test ports, and regression coverage.
3. Convert P1/P2 external-service items into executable guardrails, staging commands, and runbooks.
4. Keep manual validation explicit where local code cannot prove Stripe sandbox, Supabase staging, scheduler, observability, payout settlement, or load behavior.
5. Run targeted tests first, then broader verification commands.

## Completed Implementation Targets

- Canonicalized partial refunds to `partially_refunded`.
- Added migration to allow `partially_refunded` and validate order customer/storefront FKs after orphan checks.
- Made checkout PaymentIntent capture mode explicit as `automatic`.
- Removed provider-capture side effects from pickup transition.
- Preserved existing ledger entry type while updating wording to payment recognition.
- Made smoke tests use isolated configurable ports with explicit opt-in for server reuse.
- Added P0 regression tests for payment status, capture model, migration prefix uniqueness, FK validation, and delivery proof storage.
- Made dispatch driver payout use the shared delivery-fee payout calculator.
- Retired legacy SLA cron route in favor of `/api/engine/processors/sla`.
- Added production-readiness verification script and package scripts.
- Added Supabase pgTAP production-readiness RLS/schema guard.
- Added staging validation, release, and operations runbooks.

## Deferred Manual Gates

These cannot be fully proven from the local repo alone:

- Stripe sandbox webhook replay and payout events.
- Full staged customer, chef, driver, and ops lifecycle run.
- Supabase clean replay and upgraded staging migration replay.
- Sentry, uptime, processor, payment, dispatch, and reconciliation alert delivery.
- Load and database query-plan measurements against staging.
- Data retention job execution on staging data.
