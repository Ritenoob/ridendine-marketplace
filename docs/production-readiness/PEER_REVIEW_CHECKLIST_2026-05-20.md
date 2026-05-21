# Peer Review Checklist - 2026-05-20

Use this checklist for engineering peer review before external QA or staging launch. Reviewers should verify code, tests, migrations, and runtime behavior where noted. Do not mark an item complete unless it is verified.

## Architecture

- [ ] Confirm four app boundaries remain clear: customer web, chef admin, ops admin, driver app.
- [ ] Confirm shared packages are used for DB access, auth, engine logic, types, validation, and utilities.
- [ ] Confirm no app bypasses `@ridendine/db` for database access.
- [ ] Confirm engine is the source of truth for order, delivery, finance, dispatch, payout, SLA, and audit behavior.
- [ ] Confirm legacy status fields and engine status fields are intentionally mapped.
- [ ] Confirm duplicate migration prefix `00039` remains resolved and migration ordering is safe for the migration tool.
- [ ] Confirm all generated types are refreshed after schema/payment status fixes.

## Security

- [ ] Verify every state-changing route is guarded with `pnpm audit:guards`.
- [ ] Review all middleware public route exceptions and document why each is public.
- [ ] Verify customer cannot access another customer's order, address, payment methods, support tickets, or notifications.
- [ ] Verify chef cannot access another chef's orders, menu, storefront, payout account, or uploads.
- [ ] Verify driver cannot access another driver's delivery, proof, earnings, presence, or payout account.
- [ ] Verify ops role/capability matrix blocks lower-privilege users from finance, team, refund, payout, and override actions.
- [ ] Verify Supabase RLS policies with anon, customer, chef, driver, ops, and service-role clients.
- [ ] Verify service-role/admin-client routes have app-layer guards and audit logs where needed.
- [ ] Verify fixture reset route is disabled outside test/dev and not exposed to production.
- [ ] Verify internal command center stays disabled in production unless explicitly approved.
- [ ] Verify public storage buckets do not expose sensitive proof/document data.
- [ ] Verify distributed rate limiting is configured in staging/production.
- [ ] Verify no secret values appear in logs, responses, exports, screenshots, or client bundles.
- [ ] Run secret scanning before PR merge.

## Payments

- [ ] Review the partial refund payment status fix and migration for `partially_refunded`.
- [ ] Confirm the business accepts immediate automatic capture at checkout as the provider model.
- [ ] Confirm Stripe PaymentIntent configuration, lifecycle side effects, ledger terminology, and UI labels align with automatic capture.
- [ ] Verify checkout quote is always server-authoritative.
- [ ] Verify client-supplied prices, totals, fees, tips, discounts, and tax are not trusted.
- [ ] Verify checkout idempotency prevents duplicate orders and PaymentIntents.
- [ ] Verify Stripe webhook signature validation rejects missing/invalid signatures.
- [ ] Verify duplicate webhook events are idempotent.
- [ ] Verify out-of-order payment events do not corrupt order state.
- [ ] Verify payment failure does not submit order to kitchen.
- [ ] Verify full refund and partial refund update Stripe, order, ledger, refund case, and audit data.
- [ ] Verify payout preview and execution reconcile with ledger entries.
- [ ] Verify Stripe transfer and payout events do not duplicate finance records.
- [ ] Review tax, tip, delivery fee, service fee, platform fee, chef payable, and driver payable math.
- [ ] Remove or strictly gate `STRIPE_ALLOW_TEST_IN_PRODUCTION`.

## Order Flow

- [ ] Confirm order statuses used in UI match engine statuses and public stages.
- [ ] Confirm allowed transitions match business policy.
- [ ] Confirm invalid transitions are rejected.
- [ ] Confirm order status history is written for every critical transition.
- [ ] Confirm domain events are emitted for payment, kitchen, dispatch, delivery, refund, and exception events.
- [ ] Confirm customer cancellation rules are enforced by order state.
- [ ] Confirm chef rejection triggers correct customer notification and payment handling.
- [ ] Confirm ready-for-pickup automatically requests dispatch.
- [ ] Confirm delivered order completion creates payout/ledger side effects.
- [ ] Confirm ops override requires a reason and writes `ops_override_logs`.
- [ ] Confirm stale unpaid orders are cleaned up or surfaced to ops.

## Driver Flow

- [ ] Verify approved driver requirement for offers, presence, location, deliveries, earnings, and payouts.
- [ ] Verify online/fresh location requirement for dispatch matching.
- [ ] Verify driver offer accept/reject is restricted to the assigned driver.
- [ ] Verify offer expiry and retry behavior.
- [ ] Verify manual assign and reassignment behavior.
- [ ] Verify delivery status transitions are valid and auditable.
- [ ] Verify pickup/dropoff proof upload is associated with the delivery and protected appropriately.
- [ ] Verify failed delivery creates an exception and ops workflow.
- [ ] Verify driver earnings match ledger and payout records.
- [ ] Verify mobile geolocation denial/offline cases are handled gracefully.

## Chef/Admin Flow

- [ ] Verify chef signup creates expected profile/state without granting premature access.
- [ ] Verify ops approval is required before privileged chef actions.
- [ ] Verify chef can only manage own storefront, kitchen, availability, menu, orders, and payouts.
- [ ] Verify menu option/value validation matches checkout quote validation.
- [ ] Verify availability and pause/disable states block customer ordering.
- [ ] Verify order acceptance/rejection/prep/ready actions update customer and ops views.
- [ ] Verify payout setup/history/request flows work in sandbox.
- [ ] Verify image upload restrictions and storage privacy.

## Ops/Admin Flow

- [ ] Verify ops dashboard, live board, health, dispatch, finance, orders, chefs, drivers, customers, support, team, and settings routes load in staging.
- [ ] Verify ops routes enforce capability-specific authorization.
- [ ] Verify refund and payout actions require finance permissions.
- [ ] Verify admin support actions notify customers and write audit records.
- [ ] Verify disable/pause chef and disable driver flows affect customer/dispatch behavior.
- [ ] Verify exports do not leak unnecessary PII and require the correct role.
- [ ] Verify processor routes require `CRON_SECRET` or `ENGINE_PROCESSOR_TOKEN`.
- [ ] Verify deprecated cron routes are not configured in production schedulers.

## Database

- [ ] Replay all migrations from scratch into a disposable database.
- [ ] Replay migrations against an upgraded copy of current staging.
- [ ] Validate `orders_customer_id_fkey` and `orders_storefront_id_fkey` after orphan checks.
- [ ] Verify all RLS policies compile and enforce expected access.
- [ ] Verify indexes exist for high-volume dashboard, order, dispatch, driver location, webhook, and ledger queries.
- [ ] Verify `stripe_events_processed`, `checkout_idempotency_keys`, and `ops_processor_runs` unique/idempotency behavior.
- [ ] Verify seed/test data does not run in production workflows.

## Deployment

- [ ] Confirm build command and app-specific environment variables for all four apps.
- [ ] Confirm Vercel/project routing for ports/apps/domains.
- [ ] Confirm all required env variables are configured in staging without exposing values.
- [ ] Confirm Supabase migrations run as part of release process or a documented manual gate.
- [ ] Confirm rollback process for app deploy and database migrations.
- [ ] Confirm preview deployments use non-production Stripe/Supabase resources.
- [ ] Confirm production uses live Stripe keys and no test-key escape hatch.
- [ ] Confirm distributed rate limiting provider is configured.
- [ ] Confirm Sentry/error reporting/uptime monitoring are configured.

## Testing

- [ ] Run `pnpm install --frozen-lockfile`.
- [ ] Run `pnpm typecheck --force`.
- [ ] Run `pnpm lint --force`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm build --force`.
- [ ] Run `pnpm test:smoke`.
- [ ] Run `pnpm verify:launch-readiness:strict`.
- [ ] Run `pnpm test:rls`.
- [ ] Run `pnpm test:stripe:sandbox`.
- [ ] Run staging E2E for customer checkout through delivery.
- [ ] Run Stripe sandbox webhook replay tests.
- [ ] Run role-based negative authorization tests.
- [ ] Run RLS tests against a real Supabase project.
- [ ] Run load tests for live board, driver location, dispatch matching, and checkout.

## Peer Review Exit Criteria

- [ ] All P0 items in `FIX_PLAN_2026-05-20.md` are fixed.
- [ ] Every reviewer can reproduce verification commands.
- [ ] Payment/refund/lifecycle/database reviewers sign off.
- [ ] Security reviewer signs off on RLS and admin route protection.
- [ ] QA owner accepts the manual staging test plan.
- [ ] No new production behavior is introduced without tests or documented manual validation steps.
