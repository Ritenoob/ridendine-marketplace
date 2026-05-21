# Release Checklist - 2026-05-20

Use this before any external QA, public test, staging promotion, or production launch.

## Environment

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configured per environment.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured per environment.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured only server-side.
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` configured.
- [ ] `STRIPE_SECRET_KEY` configured with test key in staging and live key only in production.
- [ ] `STRIPE_WEBHOOK_SECRET` configured.
- [ ] `STRIPE_WEBHOOK_SECRET_OPS` configured if ops webhook uses a separate endpoint secret.
- [ ] `CRON_SECRET` configured.
- [ ] `ENGINE_PROCESSOR_TOKEN` configured.
- [ ] `UPSTASH_REDIS_REST_URL` configured for production-like environments.
- [ ] `UPSTASH_REDIS_REST_TOKEN` configured for production-like environments.
- [ ] `NEXT_PUBLIC_SENTRY_DSN` configured.
- [ ] Optional notification providers configured: `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

Do not paste values into tickets, logs, docs, or chat.

## Required Commands

- [ ] `pnpm verify:launch-readiness:strict`
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm test:rls`
- [ ] `pnpm test:e2e:lifecycle`
- [ ] `pnpm test:stripe:sandbox`
- [ ] `pnpm test:load:staging`

## Database

- [ ] Clean migration replay passes.
- [ ] Existing staging upgrade replay passes.
- [ ] Generated database types match final schema.
- [ ] Order FK orphan checks return zero rows.
- [ ] RLS tests pass for customer, chef, driver, ops, support, finance, and anonymous boundaries.

## Payments

- [ ] Stripe PaymentIntent capture mode is automatic at checkout.
- [ ] Successful payment submits order to kitchen exactly once.
- [ ] Failed payment marks local order/payment state correctly.
- [ ] Duplicate webhook is idempotent.
- [ ] Full refund reconciles order, refund case, ledger, and Stripe state.
- [ ] Partial refund writes `partially_refunded`.
- [ ] Transfer/payout webhook scenarios are visible to finance.
- [ ] No frontend-provided price is trusted for final charge math.

## Operations

- [ ] Scheduler uses canonical `/api/engine/processors/*` routes.
- [ ] Legacy `/api/cron/sla-tick` is not configured in scheduler.
- [ ] Processor stale-run alert tested.
- [ ] Payment reconciliation alert tested.
- [ ] Dispatch stuck-order alert tested.
- [ ] Failed delivery workflow tested.
- [ ] Payout dry-run reviewed by finance/ops.

## Storage and Privacy

- [ ] Marketplace images are public only where intended.
- [ ] Delivery proof media uses private storage and signed URLs.
- [ ] Unauthorized delivery proof fetch fails.
- [ ] Retention requirements are documented for locations, proof images, support, audit, and analytics records.

## Signoff

- [ ] Engineering signoff.
- [ ] QA signoff.
- [ ] Operations signoff.
- [ ] Finance/payment signoff.
- [ ] Rollback owner and rollback steps confirmed.
