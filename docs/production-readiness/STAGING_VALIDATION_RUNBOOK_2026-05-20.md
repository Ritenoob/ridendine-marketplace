# Staging Validation Runbook - 2026-05-20

Run this against a non-production staging environment. Do not print, paste, or commit secret values.

## Preflight

1. Confirm staging has isolated Supabase, Stripe test mode, Upstash, Sentry, and scheduler configuration.
2. Confirm no production Supabase URL, live Stripe key, or production storage bucket is used.
3. Run:

```bash
pnpm verify:launch-readiness:strict
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Expected result: all commands pass. If any command fails, block QA and attach the command, error summary, and affected files.

## Database Replay

1. Create a clean Supabase test database.
2. Run all migrations from scratch.
3. Run:

```bash
pnpm db:generate
pnpm test:rls
```

Expected result:
- No duplicate migration prefixes.
- `orders_payment_status_check` allows `partially_refunded`.
- `orders_customer_id_fkey` and `orders_storefront_id_fkey` are validated.
- Sensitive tables have no anonymous policies.

Before applying to an upgraded staging copy, run orphan checks for:
- `orders.customer_id` missing from `customers.id`.
- `orders.storefront_id` missing from `chef_storefronts.id`.

## Stripe Sandbox Contract

Run:

```bash
pnpm test:stripe:sandbox
```

Then replay real Stripe test webhook events through the web webhook endpoint:
- successful `payment_intent.succeeded`
- failed `payment_intent.payment_failed`
- duplicate `payment_intent.succeeded`
- delayed/retried event after successful processing
- full refund
- partial refund
- transfer created
- payout paid
- payout failed

Expected result:
- Each Stripe event is claimed exactly once.
- Duplicate events return idempotent replay responses.
- `orders.payment_status`, `stripe_webhook_events`, `ledger_entries`, `refund_cases`, and payout records reconcile.
- Partial refunds write `partially_refunded`.
- No frontend price or role value is trusted for final payment math.

## Lifecycle E2E

Run:

```bash
pnpm test:e2e:lifecycle
```

Manual staging pass:
1. Customer signs up/logs in.
2. Customer browses a storefront and menu.
3. Customer checks out with Stripe test card.
4. Chef accepts, starts preparation, and marks ready.
5. Ops verifies live order and dispatch state.
6. Driver goes available, accepts, picks up, and delivers.
7. System completes order.
8. Customer sees delivered/completed order and can review.
9. Ops verifies order history, audit logs, domain events, delivery row, assignment attempts, ledger entries, and payout visibility.

Expected result: pass twice on fresh data.

## Scheduler Validation

Confirm production/staging scheduler targets only canonical processor routes:
- `/api/engine/processors/sla`
- other `/api/engine/processors/*` routes as configured

Expected result:
- `/api/cron/sla-tick` returns `410`.
- `ops_processor_runs` shows current successful canonical processor runs.
- Stale processor alert fires when a processor is intentionally paused in staging.

## Storage Validation

1. Upload marketplace-safe storefront/menu images.
2. Upload driver delivery proof.
3. Attempt unauthenticated fetch of delivery proof storage URL/path.
4. Fetch delivery proof with authorized ops/driver/customer flow.

Expected result:
- Public marketplace images remain accessible where intended.
- Delivery proof is not publicly fetchable.
- Delivery proof access uses short-lived signed URLs.

## Load and Query Review

Run:

```bash
LOAD_BASE_URL=https://staging.example.invalid pnpm test:load:staging
```

Review query plans for:
- live ops board
- order list routes
- dispatch matching
- driver location writes
- webhook idempotency claim

Expected result:
- No unbounded order/admin queries.
- Pagination is present for growing lists.
- Driver location writes and dispatch matching meet staging latency targets.
