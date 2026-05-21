# Security Review - 2026-05-20

No secret values were read, copied, or printed. This review reports only filenames, code paths, and environment variable names referenced by code.

Post-fix update: partial refund status/schema mismatch is fixed, checkout explicitly uses automatic Stripe capture, order FK validation migration was added, delivery proof upload now uses private storage with signed URLs, and production-like readiness now fails when distributed rate limiting is missing. RLS and Stripe still require staging execution.

Authentication status: PARTIAL
Authorization status: PARTIAL/PASS
Admin route protection: PASS/PARTIAL
Customer data protection: PARTIAL
Payment security: PARTIAL
Webhook security: PASS
RLS/database security: PARTIAL
Input validation: PARTIAL
Production status: PARTIAL

## Authentication

PASS/PARTIAL:
- Shared middleware exists in `packages/auth/src/middleware.ts`.
- Apps use Supabase Auth and server/client helpers from `@ridendine/db`.
- Dev auto-login requires non-production mode and `ALLOW_DEV_AUTOLOGIN === 'true'`.
- Auth routes exist for customer, chef, ops, and driver apps.

Risks:
- Runtime cookie/session behavior across four app domains was not manually verified.
- Password reset/account takeover flows need QA.
- OAuth/provider configuration cannot be verified from repo alone.

Recommended fixes:
- Add staging auth tests for signup, login, logout, password reset, session refresh, cross-app redirects, and expired sessions.
- Keep dev auto-login disabled in staging and production.

## Authorization and RBAC

PASS:
- `pnpm audit:guards` passed: 120 scanned routes, 13 allowlisted, 0 unguarded state-changing routes.
- Ops capability matrix exists in `packages/engine/src/services/platform-api-guards.ts`.
- App-specific actor contexts exist:
  - Customer context in `apps/web/src/lib/engine.ts`
  - Chef context in `apps/chef-admin/src/lib/engine.ts`
  - Driver context in `apps/driver-app/src/lib/engine.ts`
  - Ops context in `apps/ops-admin/src/lib/engine.ts`
- Chef and driver APIs include ownership checks for sensitive order/delivery actions.
- Fixture reset route is disabled in production and additionally requires ops `team_manage`.

PARTIAL:
- Many ops routes use `createAdminClient`, which bypasses RLS; app-layer capability guards must be correct.
- Read-route authorization was not penetration-tested against live sessions.
- Ops override workflow needs peer review for capability policy and audit completeness.

Recommended fixes:
- Add role-based API tests for customer, chef, driver, ops agent, ops admin, finance admin, and unauthenticated users.
- Add negative tests for cross-tenant access: customer reading another customer's order, chef reading another chef's order, driver reading another driver's delivery.

## Admin Route Protection

PASS/PARTIAL:
- Ops middleware protects most routes and public allowlists are explicit.
- `/api/engine/processors` is middleware-public but protected inside handlers by `validateEngineProcessorHeaders`.
- `/api/ops/live-board` is middleware-public but handler calls `getOpsActorContext` and `guardPlatformApi(actor, 'dashboard_read')`.
- `/api/engine/health` is guarded and reports only configured booleans for env readiness.
- `/internal/command-center/docs/[...docPath]` is middleware-protected and disabled in production unless `INTERNAL_COMMAND_CENTER_ENABLED === 'true'`; it only allows paths under `docs/` and rejects `..`.

Risks:
- Middleware-public routes with handler-level auth must remain covered by tests.
- Internal command center should remain disabled in public/staging environments unless actively needed.

Recommended fixes:
- Add explicit tests for all middleware public exceptions.
- Add a CI check that rejects new public ops routes unless allowlisted with a reason.

## Payment Security

PASS/PARTIAL:
- Stripe webhook signature verification exists in both web and ops Stripe webhook routes.
- Webhook idempotency uses `stripe_events_processed`.
- Checkout route computes totals server-side and compares supplied totals.
- Stripe secret key environment guard checks test/live key prefixes in `packages/engine/src/services/stripe.service.ts`.

Risks:
- `STRIPE_ALLOW_TEST_IN_PRODUCTION` exists as an escape hatch and should be removed or locked before production.
- Partial refund DB constraint mismatch was fixed; sandbox replay is still required.
- Provider capture model is now explicit: Stripe captures automatically at checkout.
- Payment and payout flows require sandbox verification before launch.

Recommended fixes:
- Add Stripe sandbox tests for success, failure, duplicate webhook, delayed webhook, full refund, partial refund, transfer, and payout events.
- Remove or strictly gate `STRIPE_ALLOW_TEST_IN_PRODUCTION`.

## Webhook Security

PASS:
- Web Stripe webhook reads raw body and verifies `stripe-signature`.
- Ops Stripe webhook verifies `stripe-signature`.
- Processor/cron routes validate `CRON_SECRET` or `ENGINE_PROCESSOR_TOKEN` and fail closed when neither env is configured.

PARTIAL:
- Webhook rate-limit policy for Stripe is configured fail-open. This avoids blocking Stripe retries but should be monitored.
- Dead-letter handling and alerting for repeated webhook failures are not proven.

Recommended fixes:
- Add webhook failure alerting and a replay runbook.
- Add tests for missing signature, invalid signature, duplicate event, processing event, failed event retry, and out-of-order event.

## RLS and Database Security

PASS/PARTIAL:
- RLS is enabled in migrations for core customer, chef, driver, order, delivery, notification, audit, engine, payout, and finance tables.
- Broad anonymous policies from `00005_anon_read_policies.sql` are later dropped for sensitive tables in `00017_phase_b_security_rls_hardening.sql`.
- Public read is narrowed for approved active storefronts, menu data, and reviews.

Risks:
- RLS was reviewed statically, not executed against a live Supabase project.
- Admin client bypasses RLS in many server routes.
- Order customer/storefront FK validation migration exists; staging must prove no orphaned rows before applying it.
- Public profile/menu/review policies need privacy review.

Recommended fixes:
- Run Supabase RLS tests with anon, authenticated customer, chef, driver, ops, and service-role clients.
- Add automated tests for forbidden cross-role reads/writes.
- Validate or replace unvalidated FKs.

## Input Validation

PASS/PARTIAL:
- Zod validation package exists.
- Checkout has dedicated schema and server-side quote validation.
- Upload routes validate MIME type and maximum size.
- Driver proof upload validates delivery ownership and accepted contexts.
- Rate limiting is wired on auth, checkout, upload, customer/chef/ops writes, driver location, and Stripe webhook routes.

Risks:
- Validation was not proven uniformly route-by-route.
- File uploads trust MIME type and extension mapping; content sniffing/image processing is not proven.
- Marketplace image buckets remain public where intended; delivery proof upload now uses private storage and signed URLs.

Recommended fixes:
- Add route validation tests for every mutation route.
- Add image content validation or post-upload scanning for production-sensitive uploads.
- Keep delivery proof/document buckets private with signed URL access and verify unauthenticated fetches fail.

## CORS, Rate Limits, and Abuse Controls

PARTIAL:
- Rate-limit helper can use Upstash Redis when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured.
- In production-like environments without Upstash, readiness reports `not_ready`.

Risks:
- Per-instance memory rate limiting is not sufficient for multi-instance production.
- CORS policy was not identified as a centralized production control during this static review.

Recommended fixes:
- Treat distributed rate limiting as required for staging/production readiness.
- Keep deployment readiness failing or alerting when distributed rate limiting is missing.
- Review CORS/allowed-origin behavior for all deployed domains.

## Secret Handling

PASS:
- `.gitignore` includes env file patterns.
- `git ls-files` showed `.env.example` tracked; local env-like files were untracked and not inspected.
- Source-only filename scan did not identify production source files with obvious hardcoded secrets. Matches were tests/docs/placeholders or key-prefix validation logic.
- Redaction helpers exist in `packages/utils/src/redact-sensitive.ts`.

Required env variables referenced by code include:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_WEBHOOK_SECRET_OPS`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `CRON_SECRET`
- `ENGINE_PROCESSOR_TOKEN`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `NEXT_PUBLIC_SENTRY_DSN`
- App URL and operational envs such as `NEXT_PUBLIC_APP_URL`, `OPS_ADMIN_URL`, `APP_ENV`, `VERCEL_ENV`, `GITHUB_SHA`, and feature flags.

Risks:
- Local untracked env-like files exist in the workspace. Their values were not read, but they should be protected locally and never committed.

Recommended fixes:
- Run secret scanning in CI.
- Rotate any credentials if there is uncertainty about prior exposure.
- Document exact env requirements per app and per environment.

## Critical Vulnerabilities and Fixes

| Finding | Status | Impact | Recommended fix |
| --- | --- | --- | --- |
| Partial refund writes invalid payment status | FIXED/PARTIAL | Local code/schema aligned; sandbox replay still required. | Run Stripe sandbox partial refund replay. |
| Payment auth/capture terminology mismatch | FIXED/PARTIAL | Provider capture now automatic at checkout; status vocabulary still needs later consolidation. | Run sandbox PaymentIntent inspection and lifecycle QA. |
| Order FKs not validated | FIXED/PARTIAL | Validation migration added; staging must prove zero orphan rows. | Run orphan checks and migration replay. |
| Public delivery proof storage | FIXED/PARTIAL | Driver upload now returns signed URLs from a private bucket; access needs staging QA. | Verify unauthorized proof fetch fails. |
| Distributed rate limit optional | FIXED/PARTIAL | Readiness now reports not-ready without distributed provider. | Configure Upstash in staging/prod and run strict readiness check. |

## Security Production Status

Production status: PARTIAL

The codebase has meaningful security structure and several strong controls, and the local P0/P2 security fixes are in place. Production launch still requires validating RLS in a real Supabase environment, configuring distributed rate limiting, proving sensitive storage access controls, replaying Stripe sandbox events, and completing role-based negative tests.
