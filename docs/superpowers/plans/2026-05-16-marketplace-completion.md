# Marketplace Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make RideN'Dine reviewable as a complete marketplace lifecycle with safe checkout, deterministic quote totals, protected APIs, driver delivery completion, ops visibility, and repeatable tests.

**Architecture:** Keep all money movement and lifecycle transitions server-owned. Reuse canonical services from API routes, make Stripe webhooks the source of payment-confirmed side effects, and prove behavior through focused API/unit tests before broader e2e wiring.

**Tech Stack:** Next.js App Router APIs, Jest, TypeScript, Supabase repositories/admin client, Stripe PaymentIntents/webhooks, `@ridendine/engine`, `@ridendine/db`.

---

### Task 1: Payment Lifecycle

**Files:**
- Modify: `apps/web/src/app/api/checkout/route.ts`
- Modify: `apps/web/src/app/api/webhooks/stripe/route.ts`
- Test: `apps/web/src/app/api/checkout/__tests__/route.test.ts`
- Test: `apps/web/src/app/api/webhooks/stripe/__tests__/stripe-webhook-route.test.ts`

- [x] Write failing tests proving checkout creates a PaymentIntent without authorizing, clearing cart, using promo, or awarding loyalty.
- [x] Write failing tests proving `payment_intent.succeeded` authorizes before kitchen submission.
- [x] Move payment-confirmed side effects to the Stripe webhook.
- [x] Verify focused tests and web typecheck.

### Task 2: Canonical Quote Service

**Files:**
- Create: `apps/web/src/lib/checkout/quote.ts`
- Create: `apps/web/src/app/api/checkout/quote/route.ts`
- Create: `apps/web/src/app/api/checkout/quote/__tests__/route.test.ts`
- Modify: `apps/web/src/app/api/checkout/route.ts`
- Test: `apps/web/src/app/api/checkout/__tests__/route.test.ts`

- [x] Write failing quote endpoint tests: endpoint total matches checkout total, stale/manipulated client values are ignored, unavailable items fail, address ownership is enforced.
- [x] Extract quote calculation and validation from checkout route into `buildCheckoutQuote`.
- [x] Use `buildCheckoutQuote` from both quote endpoint and checkout.
- [x] Persist quote breakdown and ensure Stripe amount equals persisted order total.
- [x] Run quote and checkout tests.

### Task 3: Menu Modifiers

**Files:**
- Inspect/create under `apps/chef-admin/src/app/api/menu/[id]/options`
- Inspect/create under `apps/web/src/app/api/cart` and checkout quote validation
- Inspect Supabase tables/migrations for option groups/values/order item modifiers

- [x] Write failing tests for required options, min/max, sold-out values, and server-side price deltas.
- [x] Add chef option group/value APIs if missing.
- [x] Validate selected modifiers in cart/quote/checkout using database prices.
- [x] Persist order item modifiers.
- [x] Run focused menu/checkout tests.

### Task 4: Processors and Health

**Files:**
- Modify: `apps/ops-admin/src/app/api/engine/health/route.ts`
- Modify/test processor routes under `apps/ops-admin/src/app/api/engine/processors`
- Test existing cron route tests and engine SLA/dispatch tests

- [x] Write failing health tests for missing `CRON_SECRET` and `ENGINE_PROCESSOR_TOKEN`.
- [x] Verify invalid processor token rejection and valid token acceptance.
- [x] Ensure SLA and expired-offer processing is idempotent.
- [x] Run ops processor tests.

### Task 5: Driver Delivery Flow

**Files:**
- Modify: `apps/driver-app/src/app/api/offers/route.ts`
- Create: `apps/driver-app/src/app/api/deliveries/[id]/proof/route.ts`
- Create: `apps/driver-app/src/app/api/deliveries/[id]/issue/route.ts`
- Modify relevant driver offer UI component after locating it

- [x] Write failing tests for expired/taken offer handling and proof/issue ownership guards.
- [x] Ensure UI checks `response.ok` before redirecting.
- [x] Add proof and issue endpoints.
- [x] Run driver tests.

### Task 6: Ops/Internal Security

**Files:**
- Modify internal command-center routes under `apps/ops-admin/src/app/api/internal`
- Modify `scripts/audit/check-api-route-guards.mjs`
- Test ops route guard behavior

- [x] Write failing tests/audit fixture for unguarded state-changing route.
- [x] Add explicit ops role/capability checks or local-dev-only guards.
- [x] Remove loose allowlists.
- [x] Run `pnpm audit:guards`.

### Task 7: Stable Customer/Mobile APIs

**Files:**
- Create or complete customer APIs under `apps/web/src/app/api/storefronts`
- Create: `apps/web/src/app/api/orders/[id]/payment-status/route.ts`
- Create: `apps/web/src/app/api/orders/[id]/reorder/route.ts`

- [x] Write failing tests for public storefront filtering, safe detail fields, menu availability/modifiers, payment status ownership, and safe reorder.
- [x] Implement APIs using server/admin clients with explicit ownership and public-field mapping.
- [x] Run web API tests.

### Task 8: Deterministic Lifecycle Fixtures

**Files:**
- Add fixture/reset routes or scripts gated from production.
- Update `e2e/lifecycle/*`.
- Update package scripts only if needed.

- [x] Write fixture setup/reset tests.
- [x] Add staging/local-only fixture reset.
- [x] Update lifecycle e2e to use deterministic fixture IDs/data.
- [x] Run available lifecycle smoke or document exact missing external services.

> Lifecycle smoke status (2026-05-18): `pnpm test:e2e:lifecycle:fixtures` passes (seed markers + env preflight). The full Playwright lifecycle suite (`pnpm test:e2e:lifecycle`) additionally requires a running web app, a non-production Supabase project with the lifecycle seed applied, `STRIPE_SECRET_KEY` for Stripe-gated paths, and `E2E_FIXTURE_RESET_ENABLED=true` for remote reset. Without those, the preflight is the deterministic gate.
