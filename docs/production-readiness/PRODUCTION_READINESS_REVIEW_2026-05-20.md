# Production Readiness Review - 2026-05-20

Review date: 2026-05-20
Repository: `ridendine-marketplace`
Scope: static code review, migration review, route inventory, security/payment/order-flow wiring review, and local verification commands. No secret values were read or printed.

Post-fix update: P0 implementation fixes were applied after this review. See `docs/production-readiness/FIX_EXECUTION_REPORT_2026-05-20.md` for the exact files changed, regression tests added, and remaining manual gates. This report preserves the original truth-first review context while the execution report supersedes fixed blocker status.

# Executive Summary

Current status: PARTIAL

Peer review readiness: PARTIAL
QA testing readiness: PARTIAL
Production readiness: FAIL

Ridendine is a chef-first food delivery marketplace built as a pnpm/Turborepo monorepo with four Next.js apps and shared packages backed by Supabase/Postgres. The repo is not a prototype shell: it has customer ordering, chef order management, ops control surfaces, driver workflows, central order/dispatch/payment engines, migrations, RLS policies, tests, and production build wiring.

The repo is ready for strict peer review, but not ready for public QA or production launch without fixing the P0/P1 issues in the fix plan. The strongest production signal is that forced typecheck, lint, tests, build, route guard audit, and production-data-hygiene checks all passed. The strongest launch risk is correctness around payment/refund/order state, unresolved database constraint validation, smoke E2E execution, and external-service runtime validation.

Top 5 strengths:
1. Four-app architecture is clearly separated: customer web, chef admin, ops admin, and driver app.
2. Shared engine package centralizes order, dispatch, finance, payout, SLA, audit, and state-machine behavior.
3. Checkout computes totals server-side and does not trust client prices.
4. Stripe webhook handlers verify signatures and use database idempotency.
5. RLS policies, capability guards, route guard audit, and role-specific contexts exist across the platform.

Top 5 remaining blockers after fix execution:
1. NEEDS MANUAL TEST: Stripe sandbox webhook replay, refund, transfer, payout, and reconciliation flows still need staging execution.
2. NEEDS MANUAL TEST: Clean Supabase migration replay and upgraded staging replay still need to run against real databases.
3. NEEDS MANUAL TEST: Full customer-to-chef-to-driver-to-ops lifecycle still needs two fresh-data staging passes.
4. NEEDS MANUAL TEST: Supabase RLS production-readiness pgTAP tests need Supabase CLI/test database execution.
5. PARTIAL: Observability, alert delivery, payout dry-run, load tests, and retention operations are documented but not externally proven.

# Verification Results

| Command | Status | Result |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | PASS | Lockfile up to date, dependencies already installed. |
| `pnpm typecheck --force` | PASS | Turbo ran 13 tasks successfully with no cache reliance. |
| `pnpm lint --force` | PASS | 4 lint tasks passed. |
| `pnpm test` | PASS | Unit/integration test command completed successfully. Visible suites include 909 engine tests and 285 web tests, plus package/app tests. Warnings were present but command exited 0. |
| `pnpm build --force` | PASS | All four Next.js apps built successfully. |
| `pnpm test:smoke` | FAIL | Playwright failed before executing tests because `http://127.0.0.1:3002` was already in use while config disallows reusing an existing server. |
| `pnpm verify:prod-data-hygiene` | PASS | CI/workflow scan found no production workflow seed/reset commands. |
| `pnpm audit:guards` | PASS | Scanned 120 routes, 13 allowlisted, 0 unguarded state-changing routes. |

Known command warnings:
- React `act(...)` warnings appear in some UI tests.
- Vite CJS deprecation warnings appear in Vitest output.
- Some negative-path tests intentionally log route errors.
- Smoke test also emitted a module-type warning for `packages/ui/src/tokens.ts`.

# Repo Structure

## `/apps/web`

Purpose: Customer marketplace app on port 3000.

Key files:
- `apps/web/src/app`
- `apps/web/src/app/api`
- `apps/web/src/lib/checkout/quote.ts`
- `apps/web/src/app/api/checkout/route.ts`
- `apps/web/src/app/api/webhooks/stripe/route.ts`

Production status: PARTIAL

Issues:
- Checkout and webhook logic are substantial, but Stripe sandbox end-to-end behavior still needs manual validation.
- Payment status tracking has a known partial-refund constraint mismatch through shared engine behavior.
- Customer-facing smoke tests did not run because the smoke command was blocked by an occupied ops-admin port.

## `/apps/chef-admin`

Purpose: Chef dashboard on port 3001 for onboarding, storefront, menu, availability, orders, analytics, payouts, and settings.

Key files:
- `apps/chef-admin/src/app/dashboard`
- `apps/chef-admin/src/app/api/menu`
- `apps/chef-admin/src/app/api/orders/[id]/route.ts`
- `apps/chef-admin/src/app/api/storefront/route.ts`
- `apps/chef-admin/src/lib/engine.ts`

Production status: PARTIAL

Issues:
- Chef order ownership checks are present.
- Mark-ready is wired to platform dispatch.
- Payout setup/request routes require Stripe/payout manual validation.
- Onboarding and document flows need real Supabase Storage and approval workflow validation.

## `/apps/ops-admin`

Purpose: Operations admin app on port 3002 for orders, chefs, drivers, dispatch, finance, refunds, support, team, automation, health, and internal processors.

Key files:
- `apps/ops-admin/src/app/dashboard`
- `apps/ops-admin/src/app/api/engine`
- `apps/ops-admin/src/app/api/orders`
- `apps/ops-admin/src/app/api/stripe/webhook/route.ts`
- `apps/ops-admin/src/lib/engine.ts`
- `apps/ops-admin/src/middleware.ts`

Production status: PARTIAL

Issues:
- Capability guards and route guard audit are strong.
- Ops health/readiness exposes env configured booleans only behind ops guard.
- Internal processors are token-protected and idempotency-tracked.
- Legacy cron routes remain and should be retired or clearly excluded from production schedules.
- Smoke test port conflict happened on this app.

## `/apps/driver-app`

Purpose: Driver PWA on port 3003 for availability, delivery offers, current delivery, proof upload, earnings, history, profile, and settings.

Key files:
- `apps/driver-app/src/app`
- `apps/driver-app/src/app/api/offers/route.ts`
- `apps/driver-app/src/app/api/deliveries/[id]/route.ts`
- `apps/driver-app/src/app/api/location/route.ts`
- `apps/driver-app/src/lib/engine.ts`

Production status: PARTIAL

Issues:
- Driver ownership checks are present for delivery reads/updates and proof upload.
- Location and presence APIs exist.
- Real mobile/PWA, geolocation permission, route, proof, failed-delivery, and offline behavior require manual testing.
- Delivery proof images are uploaded to a public bucket, which should be reviewed before production.

## `/packages/auth`

Purpose: Supabase auth helpers, middleware, hooks, and role utilities.

Production status: PARTIAL

Issues:
- Shared middleware and dev auto-login guard exist.
- Runtime cookie/session behavior needs staging validation across all app domains.

## `/packages/db`

Purpose: Supabase clients, generated database types, repositories, and admin client.

Production status: PARTIAL

Issues:
- Admin client is server-only and requires service role env.
- Generated types exist, but migrations contain unresolved `NOT VALID` order FKs and duplicate `00039` migration prefix.

## `/packages/engine`

Purpose: Central business engine for order lifecycle, checkout/order creation, dispatch, delivery, finance, payouts, SLA, reconciliation, audit, and platform orchestration.

Production status: PARTIAL

Issues:
- Large test coverage and centralization are strengths.
- Payment capture is now explicit as automatic at checkout; lifecycle vocabulary still needs consolidation.
- Partial refund status mismatch was fixed locally; sandbox replay is still required.
- Driver payout calculation is aligned locally; payout reconciliation still needs staging proof.

## `/packages/types`

Purpose: Shared TypeScript types and canonical enums/statuses.

Production status: PARTIAL

Issues:
- Multiple status vocabularies exist: legacy app/order statuses, canonical statuses, and engine statuses. The state machine maps them, but drift remains a risk.

## `/packages/ui`

Purpose: Shared design tokens and UI components.

Production status: PARTIAL

Issues:
- Shared tokens/components exist.
- Build/test emitted a module-type warning for `packages/ui/src/tokens.ts`.

## `/packages/utils`

Purpose: Logging, redaction, rate limiting, security helpers, idempotency, formatting, and common utilities.

Production status: PARTIAL

Issues:
- Rate limiting supports Upstash and memory fallback.
- In production-like environments, missing Upstash degrades to per-instance memory rate limiting instead of global enforcement.

## `/packages/validation`

Purpose: Zod validation schemas.

Production status: PARTIAL

Issues:
- Validation exists, but API-by-API enforcement is not uniformly proven without deeper route tests.

## `/packages/routing`

Purpose: ETA and routing support.

Production status: PARTIAL

Issues:
- ETA service tests exist.
- Real-world ETA provider behavior and coordinates need staging validation.

## `/packages/notifications`

Purpose: Notification templates and notification-related shared code.

Production status: PARTIAL

Issues:
- Templates exist, but Resend/Twilio/push delivery was not manually validated.

## `/supabase`

Purpose: Database migrations and seeds.

Production status: PARTIAL

Issues:
- RLS, indexes, audit tables, ledger tables, idempotency tables, and engine tables exist.
- Duplicate migration prefix `00039` exists.
- Order customer/storefront FKs remain `NOT VALID`.
- Broad anonymous read policies from `00005` are later dropped for sensitive tables in `00017`; this hardening appears present in migrations.

## `/docs`, `/scripts`, `.github`

Purpose: Architecture docs, wiring docs, operational scripts, CI workflows.

Production status: PARTIAL

Issues:
- Existing docs are extensive, but many files were already modified before this review.
- CI exists and runs core checks.
- Smoke test configuration is brittle when a dev server is already on the configured port.

# App-by-App Review

## App Review: Customer Web

Purpose: Customer marketplace, account, cart, checkout, order history, support, reviews, loyalty, referrals, and Stripe payment webhooks.

Verified routes/pages:
- `/`, `/chefs`, `/chefs/[slug]`, `/cart`, `/checkout`, `/account`, `/account/orders`, `/order-confirmation/[orderId]`, `/orders/[id]/confirmation`, auth, legal, marketing/support pages.

Verified API connections:
- Cart, checkout, checkout quote, Stripe webhook, storefronts/menu, orders, cancel/reorder/payment-status, addresses, favorites, reviews, support, profile, loyalty, referrals, upload, notifications.

Verified database connections:
- `customers`, `customer_addresses`, `carts`, `cart_items`, `chef_storefronts`, `menu_items`, `orders`, `order_items`, `promo_codes`, `loyalty_*`, `support_tickets`, `reviews`, `stripe_events_processed`, `checkout_idempotency_keys`, `ledger_entries`.

Verified external services:
- Stripe PaymentIntents and Stripe webhook verification are wired.
- Supabase Auth/Storage are wired.
- Notification env references exist, but delivery was not manually tested.

Main issues:
- Full checkout success/failure/refund flows require Stripe sandbox validation.
- Payment authorization/capture terminology does not match verified PaymentIntent configuration.
- Public testing should wait until payment/refund issues are resolved.

Security concerns:
- Customer upload uses type and size validation.
- Profile image storage is public.
- Rate limiting degrades to per-instance memory without Upstash.

Testing gaps:
- Needs E2E checkout with successful, failed, duplicate, stale-cart, and webhook retry cases.

Production-readiness status: PARTIAL

## App Review: Chef Admin

Purpose: Chef onboarding, storefront management, menu/category/options, availability, orders, analytics, payouts, reviews, settings.

Verified routes/pages:
- Dashboard, menu, availability, orders, order detail, payouts, reviews, analytics, settings, storefront setup, auth, terms/privacy.

Verified API connections:
- Menu CRUD, option/value CRUD, storefront read/create/update, availability, order actions, profile, analytics, payout setup/request/history, upload, signup.

Verified database connections:
- `chef_profiles`, `chef_storefronts`, `chef_kitchens`, `chef_availability`, `menu_categories`, `menu_items`, `menu_item_options`, `orders`, `kitchen_queue_entries`, `chef_payout_accounts`, `chef_payouts`.

Verified external services:
- Supabase Auth/Storage.
- Stripe payout setup route exists; actual Connect/payout behavior needs sandbox validation.

Main issues:
- Payout request/setup needs real provider validation.
- Chef onboarding and approval workflow needs manual end-to-end validation.
- Mark-ready dispatch is wired, but the full dispatch result must be tested with real driver presence.

Security concerns:
- Chef actor context requires approved chef for privileged context.
- Uploads are validated but stored in public buckets.

Testing gaps:
- Chef onboarding, menu option validation, availability, order acceptance/rejection, mark-ready dispatch, payout flows.

Production-readiness status: PARTIAL

## App Review: Ops Admin

Purpose: Operations control plane for orders, delivery, dispatch, finance, refunds, support, team, health, automation, and processors.

Verified routes/pages:
- Dashboard, activity, analytics, chefs, customers, deliveries, dispatch, drivers, finance, health, integrations, map, orders, promos, reports, support, team, settings, internal command center.

Verified API connections:
- Ops CRUD/list routes, engine dashboard/health/finance/dispatch/orders/payouts/refunds/rules/settings/storefronts/exceptions/reconciliation/processors, Stripe ops webhook, cron routes, fixture reset.

Verified database connections:
- Broad ops access through `createAdminClient` plus engine services across orders, deliveries, drivers, chefs, payouts, ledger, processor runs, audit, exceptions, settings.

Verified external services:
- Stripe ops webhook for transfer/payout events.
- Cron/processor endpoints validate `CRON_SECRET` or `ENGINE_PROCESSOR_TOKEN`.

Main issues:
- Smoke E2E now uses isolated configurable ports; rerun smoke in QA.
- Legacy SLA cron route is retired; scheduler must target canonical processor routes.
- Ops override and refund workflows need staging QA and audit review.

Security concerns:
- Capability guard matrix exists and guard audit passed.
- Fixture reset route is disabled in production and additionally ops-guarded.
- Engine processors are exposed as middleware-public routes but validate their own processor/cron token.

Testing gaps:
- Need ops manual QA for refunds, assignments, overrides, finance reconciliation, and incident workflows.

Production-readiness status: PARTIAL

## App Review: Driver App

Purpose: Driver onboarding/login, presence, offers, delivery execution, proof upload, location, payouts, earnings, history, profile, settings.

Verified routes/pages:
- Home, auth login/signup, delivery detail, earnings, history, profile, settings, terms/privacy.

Verified API connections:
- Login/logout/signup, deliveries, delivery issue/proof, driver profile, presence, earnings, health, location, offers, payout setup/instant, upload.

Verified database connections:
- `drivers`, `driver_presence`, `driver_locations`, `deliveries`, `assignment_attempts`, `delivery_events`, `delivery_tracking_events`, `driver_earnings`, `driver_payouts`, `driver_payout_accounts`, `instant_payout_requests`.

Verified external services:
- Supabase Auth/Storage.
- Payout and instant payout endpoints exist, but provider behavior needs validation.

Main issues:
- Geolocation, background update behavior, proof upload, failed delivery, and reassignment need real mobile QA.
- Driver proof upload now uses private storage and signed URLs; staging access QA is required.

Security concerns:
- Driver context requires approved driver for most actions.
- Delivery ownership checks are present on sensitive delivery routes.

Testing gaps:
- End-to-end driver offer accept/decline, pickup, delivery, failed delivery, proof upload, and earnings reconciliation.

Production-readiness status: PARTIAL

# End-to-End User Flow Review

## Customer Flow

| Step | Files involved | APIs involved | Tables involved | Status | Issues | Manual test required |
| --- | --- | --- | --- | --- | --- | --- |
| Register/login | `apps/web/src/app/auth/*`, `apps/web/src/app/api/auth/*`, `packages/auth` | `POST /api/auth/signup`, `POST /api/auth/login` | Supabase auth, `customers` | PARTIAL | Runtime auth/session must be verified across domains. | Yes |
| Browse chefs/menus | `apps/web/src/app/chefs`, `apps/web/src/app/api/storefronts*` | `GET /api/storefronts`, `GET /api/storefronts/[id]/menu` | `chef_storefronts`, `menu_*`, `reviews` | PARTIAL | Public read appears wired; real production data quality unknown. | Yes |
| Add/change cart | `apps/web/src/app/cart`, `apps/web/src/app/api/cart/route.ts` | `GET/POST/PATCH/DELETE /api/cart` | `carts`, `cart_items`, `menu_items` | PARTIAL | Needs browser E2E, stale-price and option cases. | Yes |
| Checkout quote | `apps/web/src/lib/checkout/quote.ts` | `POST /api/checkout/quote` | Cart, menu, kitchen, address, promo/config tables | PASS | Server-side quote validation verified from code. | Yes |
| Payment initialization | `apps/web/src/app/api/checkout/route.ts` | `POST /api/checkout` | `orders`, `order_items`, `checkout_idempotency_keys` | PARTIAL | Order created before payment confirmation with safeguards; cleanup/reconciliation must be tested. | Yes |
| Payment success/failure | `apps/web/src/app/api/webhooks/stripe/route.ts` | `POST /api/webhooks/stripe` | `orders`, `stripe_events_processed`, `ledger_entries` | PARTIAL | Signature/idempotency verified; sandbox replay required. | Yes |
| Order tracking | `apps/web/src/app/account/orders`, `apps/web/src/app/api/orders*` | `GET /api/orders`, `GET /api/orders/[id]` | `orders`, `deliveries`, history | PARTIAL | Needs live order status sync test. | Yes |
| Cancellation/refund | `apps/web/src/app/api/orders/[id]/cancel`, ops refund routes | Cancel/refund APIs | `orders`, `refund_cases`, `ledger_entries` | PARTIAL | Partial refund DB mismatch fixed; sandbox refund replay required. | Yes |

## Chef / Restaurant Flow

| Step | Status | Files involved | Issues |
| --- | --- | --- | --- |
| Chef onboarding | PARTIAL | `apps/chef-admin/src/app/auth/signup`, `apps/chef-admin/src/app/api/auth/signup`, `apps/chef-admin/src/app/api/storefront/onboarding-status` | Approval and document verification need staging QA. |
| Menu creation/editing | PARTIAL | `apps/chef-admin/src/app/api/menu*` | CRUD routes exist; option/value and validation coverage needs QA. |
| Availability controls | PARTIAL | `apps/chef-admin/src/app/api/storefront/availability/route.ts` | Runtime calendar/open-close behavior needs QA. |
| Order acceptance/rejection | PARTIAL | `apps/chef-admin/src/app/api/orders/[id]/route.ts` | Ownership checks exist; SLA and notification behavior needs runtime validation. |
| Prep/ready handoff | PARTIAL | `packages/engine/src/orchestrators/platform.engine.ts`, dispatch orchestrator | Mark-ready triggers dispatch; full driver matching must be tested. |
| Payout visibility | PARTIAL | Chef payout routes and finance engine | Requires payout provider sandbox/staging validation. |

## Driver Flow

| Step | Status | Files involved | Issues |
| --- | --- | --- | --- |
| Driver onboarding | PARTIAL | `apps/driver-app/src/app/api/auth/signup/route.ts` | Approval/document process needs staging validation. |
| Availability | PARTIAL | `apps/driver-app/src/app/api/driver/presence/route.ts`, `driver_presence` | Real presence freshness and stale-location behavior need testing. |
| Dispatch assignment | PARTIAL | `packages/engine/src/orchestrators/dispatch-orchestrator.ts`, `driver-matching.service.ts` | Matching logic exists; real driver pool and edge cases need QA. |
| Accept/reject delivery | PARTIAL | `apps/driver-app/src/app/api/offers/route.ts` | Driver mismatch validation exists; full offer expiry/retry needs QA. |
| Pickup/delivery | PARTIAL | `apps/driver-app/src/app/api/deliveries/[id]/route.ts` | Status changes wired; proof/location/manual failure need QA. |
| Payout logic | PARTIAL | ledger, payout, instant payout services | Ledger exists; actual provider settlement needs validation. |

## Operations Admin Flow

| Step | Status | Files involved | Issues |
| --- | --- | --- | --- |
| View live orders | PARTIAL | `apps/ops-admin/src/app/api/ops/live-board/route.ts`, dashboard pages | Guarded; live refresh behavior needs runtime validation. |
| Assign/override drivers | PARTIAL | engine dispatch routes, delivery routes | Manual assign/reassign exists; needs staging QA. |
| Manage chefs/drivers/customers | PARTIAL | ops admin API routes | Guarded; detailed role capability QA required. |
| Refunds | FAIL/PARTIAL | refund routes, platform engine, commerce engine | Partial refund status mismatch blocks confidence. |
| Health/monitoring | PARTIAL | `apps/ops-admin/src/app/api/engine/health/route.ts` | Readiness exists; external uptime/error tracking not fully wired. |
| Audit lifecycle | PARTIAL | `audit_logs`, `order_status_history`, `domain_events`, `ops_override_logs` | Audit tables exist; completeness needs workflow testing. |

# Payment Review

Stripe integration status: PARTIAL
Webhook verification status: PASS
Idempotency status: PASS/PARTIAL
Order/payment reconciliation status: PARTIAL
Refund support: PARTIAL/FAIL
Payout support: PARTIAL
Ledger/accounting status: PARTIAL
Production status: FAIL

Verified payment strengths:
- Checkout computes the quote server-side from cart/menu/address/config and compares supplied client totals to the server quote.
- Stripe PaymentIntent creation uses a Stripe idempotency key.
- Web webhook verifies `stripe-signature` with `STRIPE_WEBHOOK_SECRET`.
- Webhook events are claimed in `stripe_events_processed` to prevent duplicate processing.
- Payment success reconciles PaymentIntent amount against order total before completing payment and submitting to kitchen.
- Ledger service has idempotency keys and entries for customer capture, tax, chef/driver/platform payables, tips, refunds, and payouts.

Critical risks:
- PARTIAL: Partial refund code/schema are aligned on `partially_refunded`; Stripe sandbox replay is still required.
- PARTIAL: Provider capture is explicit as automatic at checkout; local lifecycle naming still needs long-term consolidation.
- PARTIAL: Orders are created before confirmed payment. There are safeguards, but stale unpaid orders need cleanup/reconciliation tests.
- PARTIAL: Ops Stripe webhook handles finance events while the web Stripe webhook handles payment/refund events; event ownership must be documented and tested in staging.
- NEEDS MANUAL TEST: Refunds, failed payment, duplicate webhook, delayed webhook, and payout events need Stripe sandbox verification.

# Database and Schema Review

Database status: PARTIAL

Verified support exists for:
- Customers, addresses, chefs/storefronts/kitchens, drivers, menus/options, carts, orders, order items, payments via Stripe IDs/status fields, refunds, payouts, delivery assignments, driver status/location, audit logs, notifications, support tickets, loyalty/referrals, service areas, domain events, SLA timers, exceptions, and ledgers.

Strengths:
- Migrations are extensive.
- Important indexes exist on order, delivery, ledger, dispatch, payout, event, and status fields.
- RLS is enabled across core domain tables.
- Sensitive broad anonymous policies from `00005` are later dropped in `00017`.

Issues:
- PARTIAL: Order FK validation migration exists; staging must prove no orphaned rows before applying it.
- PARTIAL: `orders.payment_status` now includes canonical `partially_refunded`; sandbox refund replay remains.
- PASS/PARTIAL: Duplicate migration prefix `00039` was normalized; clean replay still required.
- PARTIAL: Some early duplicated tables/policies are repaired later, but migration history should be replay-tested against a clean database and an upgraded database.

# Security Review

Authentication status: PARTIAL
Authorization status: PARTIAL/PASS
Admin route protection: PASS/PARTIAL
Customer data protection: PARTIAL
Payment security: PARTIAL
Webhook security: PASS
RLS/database security: PARTIAL
Input validation: PARTIAL
Production status: PARTIAL

Verified strengths:
- Supabase auth middleware is shared.
- Dev auto-login is disabled in production unless both non-production and explicit env allow it.
- Admin client is server-only.
- Ops capability guard matrix exists.
- `pnpm audit:guards` found 0 unguarded state-changing routes.
- Stripe webhook signature verification exists.
- Processor/cron endpoints validate `CRON_SECRET` or `ENGINE_PROCESSOR_TOKEN`.
- File uploads validate MIME type and size.
- Logs have sensitive redaction helpers.

Security concerns:
- Rate limiting falls back to per-instance memory in production-like environments if Upstash is missing.
- Public storage buckets are used for profile/menu/storefront images and driver delivery proof images.
- Production env values are required but not verified from repo alone.
- RLS needs staging verification with real anon/auth/service-role clients.
- Admin/service-role use is broad in ops routes; capability guards are the main app-layer control.

# API and Route Wiring Review

Full API map: `docs/production-readiness/API_MAP_2026-05-20.md`

Summary:
- API handlers exist for customer, chef, ops, driver, health, cron/processor, and Stripe webhook surfaces.
- HTTP methods were extracted from source route files.
- State-changing route guard audit passed.
- Complex routes are marked PARTIAL or NEEDS MANUAL TEST because static source and unit tests do not prove full provider/runtime behavior.

Major API risks:
- Smoke E2E did not execute.
- Legacy cron routes are still present.
- Internal command center docs route is disabled in production unless explicitly enabled and is middleware-protected, but should remain off in public environments.
- Refund, payout, dispatch, and processor routes need staging QA.

# Frontend/UI Production Review

## UI Review: Customer Web

Strengths:
- Main marketplace, cart, checkout, account, orders, and support screens exist.
- Build succeeded.
- UI tests exist for several customer flows.

Problems:
- Browser smoke did not execute.
- Checkout UX must be tested with real Stripe states and webhook timing.
- Mobile and accessibility need full QA pass.

Missing states:
- Runtime payment failures, stale carts, no drivers, rejected chef, cancelled/refunded orders, delayed webhooks.

Production status: PARTIAL

## UI Review: Chef Admin

Strengths:
- Dedicated screens for orders, menu, availability, storefront, payouts, reviews, analytics, and settings.

Problems:
- Real kitchen workflow and SLA edge cases need manual QA.
- Payout setup is not production-proven from repo alone.

Missing states:
- No pending orders, auto-rejected orders, dispatch failure after ready, payout unavailable, Stripe/Storage errors.

Production status: PARTIAL

## UI Review: Ops Admin

Strengths:
- Broad operational pages exist, including dispatch, finance, health, map, team, support, and reports.

Problems:
- Some static build sizes suggest lightweight or placeholder-like pages that need visual/runtime review.
- No successful smoke screenshot pass was completed.

Missing states:
- Processor down, webhook failed, refund failed, no eligible drivers, stale driver location, payout variance.

Production status: PARTIAL

## UI Review: Driver App

Strengths:
- Driver home, offers, delivery detail, proof upload support, earnings, history, profile, and settings exist.

Problems:
- Needs real mobile/PWA geolocation testing.
- Proof uploads and failed-delivery flows need manual QA.

Missing states:
- Offline/poor network, denied location permission, expired offer, reassignment, failed delivery, payout unavailable.

Production status: PARTIAL

# Order Lifecycle

Full lifecycle map: `docs/production-readiness/ORDER_LIFECYCLE_MAP_2026-05-20.md`

Verified:
- `packages/engine/src/orchestrators/order-state-machine.ts` defines allowed order and delivery transitions.
- `packages/types/src/engine/transitions.ts` defines actor/action transitions and required audit for most critical lifecycle changes.
- `MasterOrderEngine` validates transitions, writes status history, emits domain events, and supports ops override.
- Chef mark-ready calls dispatch.
- Driver delivery completion calls platform order completion.

Main risks:
- Multiple status vocabularies remain in code: legacy DB/app status, engine status, canonical status, public stage, payment status.
- Delivery status synchronization can drift between `orders.status` and `orders.engine_status`.
- Provider capture is now explicit at checkout; lifecycle vocabulary still needs consolidation.
- Partial refund status is aligned locally; sandbox replay remains required.

# Dispatch and Delivery Review

Driver availability: PARTIAL
Assignment logic: PARTIAL
Location tracking: PARTIAL
ETA logic: PARTIAL
Delivery fee logic: PARTIAL
Admin override: PARTIAL/PASS
Failed delivery handling: PARTIAL
Production status: PARTIAL

Verified:
- Driver matching considers approved drivers, online presence, fresh location, distance, workload, declines, expiries, and fairness.
- Assignment attempts exist and offers can expire or be accepted/declined.
- Driver route validates that a driver owns the delivery before sensitive updates.
- Ops manual assign/reassign paths exist.

Issues:
- Driver payout on delivery creation uses a fixed base fee calculation while ledger payable uses order delivery fee, creating possible payout/display mismatch.
- ETA/location behavior needs real coordinates and mobile testing.
- Failed delivery and reassignment need manual QA.

# Testing Review

Existing tests:
- Unit/integration tests across packages and apps.
- Engine has large state/finance/dispatch test coverage.
- Web has visible 285 passing tests.
- Route guard audit exists.
- Production data hygiene check exists.
- Playwright smoke/e2e commands exist.

Missing critical tests:
- Stripe sandbox checkout success, failure, duplicate webhook, partial/full refund, and payout/reconciliation.
- Supabase RLS policy tests against real anon/auth/service-role contexts.
- Full customer to chef to driver to ops order lifecycle E2E.
- Mobile driver geolocation/proof/offline tests.
- Ops refund/override audit tests.
- Load tests against order list, dispatch, and driver location updates.

Broken tests:
- `pnpm test:smoke` failed due to port conflict before tests ran.

Recommended test plan:
- See `docs/production-readiness/QA_TEST_PLAN_2026-05-20.md`.

Production testing status: PARTIAL

# Deployment Review

Build command: `pnpm build`
Dev command: `pnpm dev`, app-specific `pnpm dev:web`, `pnpm dev:chef`, `pnpm dev:ops`, `pnpm dev:driver`
Test command: `pnpm test`, `pnpm test:smoke`, `pnpm test:e2e`
Deployment target: Next.js apps, likely Vercel from repo conventions and workflow references.
Status: PARTIAL

Required environment variables referenced:
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
- Additional app URL and operational envs listed in the security review.

Known deployment blockers:
- Smoke tests need rerun after isolated-port fix.
- Clean and upgraded staging migration replay not yet executed.
- Order FK validation migration needs staging orphan checks.
- Partial refund/payment status fix needs Stripe sandbox replay.
- External services not validated from repo alone.

# Performance and Scalability Review

Major risks:
- Admin/live board routes can query many operational records and need pagination/backpressure review.
- Driver location update frequency can create write volume and rate-limit pressure.
- Per-instance memory rate limiting is not adequate for multi-instance production.
- Dispatch and SLA processors need idempotency and schedule monitoring in production.

Database risks:
- Some indexes exist for core status/order/delivery/ledger queries.
- Need query plan review for ops dashboards, live board, dispatch matching, finance reports, and order history.

Frontend risks:
- Full bundle analysis not performed.
- Runtime screenshots/mobile responsiveness still need smoke/browser QA.

Queue/background job needs:
- Current processors are HTTP endpoints.
- Production should use monitored scheduled jobs or a queue for webhooks, notifications, dispatch retries, SLA processing, reconciliation, and payout execution.

Status: PARTIAL

# Observability and Operations Review

Logs: PARTIAL
Audit trail: PARTIAL/PASS
Health checks: PARTIAL/PASS
Payment monitoring: PARTIAL
Order monitoring: PARTIAL
Admin action monitoring: PARTIAL
Production status: PARTIAL

Verified:
- Structured logger and sensitive redaction exist.
- `audit_logs`, `domain_events`, `order_status_history`, `ops_override_logs`, `order_exceptions`, `system_alerts`, `stripe_events_processed`, and `ops_processor_runs` exist.
- Ops engine health route reports component/readiness state behind ops guard.
- Processor run tracking exists for canonical processors.

Missing:
- External error reporting configuration is optional and not verified.
- Uptime checks, alert routing, webhook dead-letter workflow, and on-call runbooks are not proven from repo alone.
- Payment reconciliation is implemented but needs real Stripe data validation.

# Peer Review Checklist

Full checklist: `docs/production-readiness/PEER_REVIEW_CHECKLIST_2026-05-20.md`

Peer reviewers should prioritize:
- Partial refund/payment status regression coverage and sandbox replay.
- Automatic Stripe capture semantics and lifecycle vocabulary.
- Order status vocabulary and transition drift.
- RLS and service-role boundaries.
- Ops capability matrix and audit completeness.
- Dispatch payout and finance ledger reconciliation.
- Migration replay from clean and existing database.

# Manual QA Test Plan

Full test plan: `docs/production-readiness/QA_TEST_PLAN_2026-05-20.md`

QA should run in staging with:
- Stripe sandbox and webhook forwarding.
- Supabase project with migrations applied from scratch.
- Seeded but non-production test data.
- At least one approved customer, chef, ops admin, and driver.
- Cron/processor secrets configured.
- Upstash or equivalent distributed rate limit provider configured.

# Critical Fix Plan

Full fix plan: `docs/production-readiness/FIX_PLAN_2026-05-20.md`

P0 - before peer review:
1. Fix partial refund payment status mismatch.
2. Validate or replace unvalidated order FKs.
3. Fix smoke E2E port conflict.
4. Document actual Stripe capture model and align code/comments/tests.

P1 - before QA/staging:
1. Run clean database migration replay and upgraded-database replay.
2. Add Stripe sandbox tests for payment/refund/webhook idempotency.
3. Validate full customer-chef-driver-ops lifecycle E2E.
4. Validate RLS with real Supabase roles.

P2 - before production:
1. Require distributed rate limiting.
2. Move sensitive proof/document uploads to private buckets or signed URL access.
3. Add monitoring, alerting, and runbooks.
4. Finalize payout/reconciliation manual controls.

P3 - post-launch:
1. Bundle/load analysis.
2. More resilient background queue architecture.
3. Improved operational analytics and support tooling.

# Suggested Improvements

1. Make one lifecycle document the source of truth for order, delivery, payment, refund, and payout statuses, then enforce it with tests.
2. Add a Stripe sandbox contract test suite for every payment event the business depends on.
3. Add a migration replay job against a disposable Supabase/Postgres database.
4. Treat production distributed rate limiting as required readiness, not degraded.
5. Convert driver proof and sensitive operational media to private storage with signed URLs.
6. Add ops runbooks for failed payment, failed dispatch, refund dispute, stuck webhook, stale driver, and payout variance.
7. Add a reconciliation dashboard that compares orders, ledger entries, Stripe events, refunds, transfers, and payout runs.
8. Add load tests for live board, dispatch matching, order history, and driver location updates.
9. Keep Playwright smoke on isolated configurable ports; use server reuse only by explicit local opt-in.
10. Add CI artifacts for build route lists, smoke screenshots, and failed API response traces.

# Final Readiness Decision

Production Readiness Score: 64 / 100

Peer Review Ready: PARTIAL
QA/Staging Ready: PARTIAL
Production Ready: NO

Reason:
The platform has substantial production-oriented architecture, tests, route guards, and successful builds, but payment/refund correctness, database constraint validation, smoke E2E reliability, external service validation, and operational readiness are not complete enough for real users, payments, orders, chefs, drivers, and ops.

Top blockers:
1. Stripe sandbox replay and reconciliation are not yet executed.
2. Clean migration replay and upgraded staging migration replay are not yet executed.
3. Full lifecycle E2E is not yet proven on staging.
4. Supabase RLS guard tests need a real test database run.
5. Full Stripe/Supabase/cron/payout/notification runtime behavior is unverified.
6. Payout provider settlement/reconciliation is unverified.
7. Multiple order/payment/delivery status vocabularies create drift risk.
8. Production distributed rate limiting is optional/degraded.
9. Delivery proof images are public.
10. Observability and operational runbooks are incomplete.

Recommended next action:
Fix the P0 issues, rerun all verification commands including smoke E2E, then start peer review focused on payment/refund/lifecycle/database/security before inviting external QA.
