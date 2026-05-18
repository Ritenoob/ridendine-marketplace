# Production Readiness & Stabilization Implementation Plan

Created: 2026-05-18
Author: sean@cashflowarmy.com
Status: PENDING
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Take Ridendine from "advanced but in-flight" to **Hamilton soft-launch ready** (real money, single-zone, ops-admin as the operational brain) — proven by an end-to-end lifecycle E2E test that walks customer → chef → driver → ops → ledger with assertions at every boundary, with all production cron infrastructure firing, Stripe live mode safely cut over, and external monitoring + Sentry capturing real incidents.

## Approach

**Chosen:** Phased rollout — A (Unblock) → B (Information Flow) → C (Stripe Live) → D (Hardening) → E (Stability for Growth). Each phase has a clear gate; later phases assume earlier ones complete.
**Why:** The two in-flight plans (`marketplace-completion` Tasks 2-8 and `ops-admin-control-center`) must complete first per the user's chosen subordination. Cron infrastructure (currently 401-ing in prod per `docs/KNOWN_ISSUES_2026-05-14.md` #1) blocks any meaningful E2E run, so Phase A unblocks before Phase B can assert. Stripe live mode is irreversible and depends on Connect-Express onboarding being proven first, hence Phase C only after B's lifecycle test passes on test cards. Hardening (D) and monitoring (E) come last because they observe the system; observing a broken system gives false positives.

## Context for Implementer

This is the **terminal readiness plan** for the Hamilton soft-launch. It is subordinate to two predecessor plans whose checkboxes must reach 100% before Task 2 of this plan can start:

1. `docs/superpowers/plans/2026-05-16-marketplace-completion.md` — Tasks 2-8 open (canonical quote, modifiers, processor auth, driver delivery, ops/internal security, customer/mobile APIs, lifecycle fixtures).
2. `docs/plans/2026-05-07-ops-admin-control-center.md` — verify all tasks check-marked.

**Ops-admin is the operational brain.** Every cross-app information flow either runs through an ops-admin engine route (`/api/engine/**`) or is observable on the ops live board (`ops:live` Realtime channel + `/api/ops/live-board` snapshot). When a task here changes a cross-app contract, the ops-admin view of that data MUST update without polling.

**Customer-safe projection.** Customer apps never see raw `engine_status` or driver/chef coordinates — they see `orders.public_stage` and `tracking` payloads sanitized by `sanitizePublicOrderBroadcastPayload()` in `packages/engine/src/core/public-broadcast-sanitizer.ts`. Tests that assert customer-visible state assert against `public_stage`, not engine internals.

**Working tree noise.** `git status` currently shows ~1312 modified files; ≥99% are CRLF/LF line-ending artifacts from the WSL/Windows boundary, not real diffs (verified by sample diff on `README.md`). Task 1 adds `.gitattributes` to prevent recurrence; do NOT bulk-renormalize during this plan.

## Runtime Environment

- **Start commands (all four apps):** `pnpm dev:web` (3000), `pnpm dev:chef` (3001), `pnpm dev:ops` (3002), `pnpm dev:driver` (3003).
- **Health checks:** `GET /api/health` on every app; `GET /api/engine/health` on ops-admin (requires `engine_health` capability).
- **Production URLs:** `ridendine.ca`, `chef.ridendine.ca`, `ops.ridendine.ca`, `driver.ridendine.ca`.
- **Cron platform:** Vercel Cron, configured per `apps/ops-admin/vercel.json` (5 crons: SLA, expired-offers, payouts-chef-preview, payouts-driver-preview, reconciliation-daily).

## Out of Scope

- **Mobile-native driver app** — current PWA is sufficient for soft-launch (user confirmed).
- **Multi-zone service-area expansion** — Hamilton single-zone only; `service_areas` schema stays but only one row seeded (user confirmed).
- **Bulk CRLF renormalization of 1312 working-tree files** — high-risk noise; `.gitattributes` is the fix going forward (Task 1).
- **Replacing OSRM with paid Mapbox** — OSRM demo server is acceptable for soft-launch traffic per `docs/BUSINESS_ENGINE.md`; Mapbox provider stays a stub.
- **Customer push-notification UI** — SMS-via-Twilio remains the primary customer notification surface; the `notification_preferences` DB migration is still applied (Task 3) so the schema is ready for a later push UI plan.

## Assumptions

- Vercel project IDs and team ID in `docs/KNOWN_ISSUES_2026-05-14.md` are current. — Tasks 2, 8, 9 depend on this.
- Real chef + real driver candidates exist for Tasks 7 and 12 (Sean confirmed via `PILOT_CHEF_LAUNCH_PLAN_2026-05-14.md`). — Task 7 depends on this.
- Supabase project is on a plan that supports PITR for the backup-restore drill in Task 12. — Task 12 depends on this.
- Upstash Redis account is provisioned (or budget approved) before Task 9. — Task 9 depends on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Stripe live keys cutover (Task 8) loses real money via mis-config | Medium | High | Dry-run on staging with test mode first; safety check in `getStripeClient()` rejects test-mode keys when `NODE_ENV=production` and `STRIPE_ALLOW_TEST_IN_PRODUCTION` is unset; rollback = single env-var revert + redeploy; capture before/after Stripe balance snapshot. |
| Cron infrastructure silently regresses again (env vars accidentally dropped from Vercel) | Low | High | `GET /api/engine/health` returns `env.CRON_SECRET.configured: boolean`; uptime monitor alerts when `configured: false`; daily synthetic call to `/api/engine/processors/sla` from monitoring service verifies 200 not 401. |
| E2E lifecycle test (Task 5) becomes flaky under realtime races | Medium | Medium | Condition-based waiting (poll DB state with explicit timeout); no arbitrary `sleep()`; flakiness budget = >2 retries in 7 days triggers test-fix task, not retry. |
| RLS audit (Task 10) discovers production data exposed via PostgREST | Low | High | Audit runs on staging branch first; sensitive tables explicitly enumerated (`support_*`, `order_exceptions`, `ledger_entries`, `chef_payout_accounts`, `driver_documents`); revert plan = SQL transaction wrapping policy changes. |
| In-flight plan completion (Task 1) reveals scope creep — Tasks 2-8 of `marketplace-completion` were larger than checkboxes suggest | Medium | Medium | When entering Task 1, implementer runs `/spec` against `marketplace-completion.md` first; if total open work exceeds 2 weeks, raise to user before continuing this plan. Each phase here is a separate `/spec-implement` invocation, so a stuck Task 1 doesn't block planning re-scope. |
| Stripe API version unpinned — live-mode Connect Express capabilities (TOS acceptance flow, required fields, capability defaults) silently differ from test-mode behavior, breaking onboarding mid-flow on cutover | Medium | Medium | Task 7 inspects `packages/engine/src/services/stripe.service.ts` and verifies `new Stripe(key, { apiVersion: '<pinned-string>' })` has an explicit version string (not the SDK default). If unpinned, pin to the current stable Stripe API version BEFORE Task 7 begins, regenerate Stripe TypeScript types, and confirm the pinned version matches the Stripe Dashboard "API version" setting on both test-mode and the live-mode account. Test Connect onboarding end-to-end on the pinned version in both modes before Task 8 cutover. |

## Goal Verification

### Truths

1. **Lifecycle observable from ops-admin.** A test-card customer can place an order and ride through `placed → cooking → on_the_way → delivered`; every transition appears on the ops-admin live board (`ops:live` channel) within 2 seconds without manual refresh, and every money movement is recorded in `ledger_entries` (`chef_payable`, `driver_payable`, `platform_revenue`).
2. **Platform is observable when broken AND the underlying system is concurrently live.** Any 5xx response, Stripe-webhook delivery failure, processor 401, or `/api/health` failure on any of the four apps triggers an alert (Sentry issue + uptime-monitor email) within 60 seconds, AND this is verified by a deliberate-misconfiguration drill: temporarily flip `CRON_SECRET` to an invalid value on a non-critical cron while the Task 5 lifecycle E2E is running against production scope, observe that the cron 401 triggers an alert within 60s, restore the env var, and document the drill timestamps + recipient confirmation in `docs/MONITORING_RUNBOOK.md`. This proves monitoring is wired AND the system being monitored is alive at the same moment.
3. **Real chef + real driver can self-serve to first paid order.** A new chef signing up at `chef.ridendine.ca/auth/signup` reaches `chef_payout_accounts.payout_enabled=true` and `storefront_state='published'` via the documented flow; a new driver does the same from `driver.ridendine.ca`. The flow does not require manual SQL outside the documented ops-approval step.

## E2E Test Scenarios

### TS-001: Customer Happy Path
**Priority:** Critical
**Preconditions:** Test chef storefront `published`, `accepting_orders=true`; customer fixture user signed in; Stripe in test mode.
**Mapped Tasks:** Task 5 (definitional), Task 2 (SLA), Task 7 (Connect)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Customer navigates `ridendine.ca/chefs/<slug>` | Storefront page renders with menu; HTTP 200 |
| 2 | Customer clicks "Add to cart" on a menu item with a required modifier | Cart updates; modifier selection enforced (Task 3 of marketplace-completion) |
| 3 | Customer goes to `/checkout`, enters address, submits with test card `4242 4242 4242 4242` | Stripe PaymentIntent created (NOT authorized client-side); webhook `payment_intent.succeeded` flips `engine_status='payment_authorized'`; `orders.public_stage='placed'` |
| 4 | DB assertion: `orders` row exists with persisted quote breakdown; `cart_items` cleared | `quote_amount_cents == stripe_amount_cents` (Task 2 of marketplace-completion) |
| 5 | Customer lands on `/orders/[id]/confirmation` | Confirmation shows order id, ETA timestamp, current stage = "Placed" |

### TS-002: Chef Accept → Prepare → Ready
**Priority:** Critical
**Preconditions:** TS-001 completed; chef fixture user signed in at `chef.ridendine.ca`.
**Mapped Tasks:** Task 5, Task 6 (ops live)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Chef opens `/dashboard/orders` | New order listed within 2s via Realtime (no refresh) |
| 2 | Chef clicks "Accept" within 5-min SLA | `engine_status='accepted'`; `public_stage='cooking'`; `order_status_history` row appended |
| 3 | Open ops-admin in parallel session, load `/dashboard` | Live board shows the order in `cooking` column without page reload |
| 4 | Chef clicks "Preparing" → "Ready for Pickup" | `engine_status='ready'`; delivery row enters `unassigned`; dispatch engine picks it up; first driver offer broadcast on `driver:{id}:offers` channel |

### TS-003: Driver Offer → Pickup → Deliver
**Priority:** Critical
**Preconditions:** TS-002 reaches `ready`; driver fixture user signed in; driver_presence row marked online with valid lat/lng inside dispatch radius.
**Mapped Tasks:** Task 5, Task 7 (driver Connect)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Driver app receives offer via Realtime broadcast | `OfferAlert` renders with addresses + payout (no GPS to customer) |
| 2 | Driver accepts within TTL | `assignment_attempts.outcome='accepted'`; delivery `accepted`; `EtaService.computeFullOnAssign` fills both polylines |
| 3 | Driver marks "Arrived at chef" → "Picked up" with proof photo | `delivery.status='picked_up'`; `proof_pickup_photo_url` populated; `EtaService.computeDropLegOnPickup` refreshes dropoff leg |
| 4 | Driver marks "Delivered" with proof-of-delivery photo | `delivery.status='delivered'`; `orders.engine_status='delivered'` → `completed`; `ledger_entries` inserts `chef_payable`, `driver_payable`, `platform_revenue` rows (idempotency key on each); `platform_accounts` balances increment via trigger |

### TS-004: Ops Live Board Accuracy Under Concurrent Updates
**Priority:** High
**Preconditions:** 5 orders in various stages (some `placed`, some `cooking`, some `on_the_way`); ops fixture user signed in.
**Mapped Tasks:** Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Ops loads `/dashboard`, `LiveBoard` mounts | Snapshot fetched from `/api/ops/live-board`; counts match DB rows |
| 2 | Script flips one order from `accepted` → `preparing` directly in DB | `ops:live` postgres_changes event arrives client-side; board column moves order; engine pressure count updates without refetch |
| 3 | Script kills the realtime connection for 5s, then restores | Within 60s a snapshot refetch repopulates state; no duplicate rows |
| 4 | Script inserts a `system_alerts` row with severity `breach` | Ops pressure counter for SLA breaches increments by 1 |

### TS-005: Refund Reverses Ledger
**Priority:** Critical
**Preconditions:** Order from TS-003 in `completed` state with full ledger triple recorded.
**Mapped Tasks:** Task 8 (Stripe live), Task 11 (reconciliation)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Customer requests refund via `/orders/[id]` | Refund request row created |
| 2 | Ops approves via `/dashboard/orders/[id]/refund` | `commerce.engine.createRefundAdjustments` invoked; Stripe refund created in test mode |
| 3 | DB assertion: 3 negative-amount `ledger_entries` rows | Each reverses the original entry's amount with `metadata.refund_for=<original-id>` |
| 4 | `platform_accounts` balances decrement by the refund amount | Verified via trigger output |

### TS-006: SLA Auto-Cancellation
**Priority:** High
**Preconditions:** Order in `payment_authorized` for >5 minutes with no chef acceptance.
**Mapped Tasks:** Task 2, Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger SLA processor manually: `POST /api/engine/processors/sla` with valid Bearer | 200 response; payload reports `chefTimeoutsCancelled >= 1` |
| 2 | DB assertion: order `engine_status='cancelled'`, `cancellation_reason='sla_breach'` | Customer sees "Cancelled — chef did not respond" |
| 3 | `system_alerts` row created with severity `breach` | Visible on ops live board |
| 4 | Stripe PaymentIntent cancelled (test mode) | Test card auth released |

### TS-007: Stripe Webhook Idempotency
**Priority:** High
**Preconditions:** A `payment_intent.succeeded` event has already been processed for an order.
**Mapped Tasks:** Task 8

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Replay same Stripe event via `stripe events resend <id>` | 200 response, second invocation a no-op |
| 2 | `stripe_events_processed` table: exactly one row for that event id | `processed_at` timestamp matches first invocation |
| 3 | `order_status_history` for the order: no duplicate `payment_authorized` row | Idempotency preserved |

### TS-008: Role-Based Access Enforcement
**Priority:** Medium
**Preconditions:** Three sessions: customer, chef, driver. Test ops route is one whose `pnpm audit:guards` check passes today.
**Mapped Tasks:** Task 10

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Customer session: `POST /api/engine/settings` | HTTP 403 with code `FORBIDDEN` |
| 2 | Chef session: `GET /api/ops/live-board` | HTTP 403 |
| 3 | Driver session: `GET /api/engine/payouts` | HTTP 403 |
| 4 | All four `/api/health` endpoints: anonymous GET | HTTP 200, no PII in payload |

## Progress Tracking

> 2026-05-18 session: code-side work shipped for Tasks 1, 2, and 4. Tasks 1 and 2 remain `[ ]` because each has operator-action remainders; Task 4 is fully `[x]`. See "Session 1 progress notes" below.

- [ ] Task 1: Close out in-flight plans and add `.gitattributes` for CRLF normalization
- [ ] Task 2: Verify production cron infrastructure end-to-end
- [ ] Task 3: Apply pending migrations (notification_preferences) and regenerate types
- [x] Task 4: Cross-app information flow contract audit
- [ ] Task 5: Canonical lifecycle E2E test (Playwright)
- [x] Task 6: Ops live board completeness audit + gap fixes (audit complete; one follow-up task surfaced — see notes)
- [ ] Task 7: Chef + driver Stripe Connect Express end-to-end
- [ ] Task 8: Stripe live keys cutover and ops finance webhook
- [ ] Task 9: Distributed rate limiting (Upstash) + Sentry wire-up (code complete; gated on Vercel env-var push)
- [ ] Task 10: RLS depth audit + legal copy cutover (4/7 sensitive tables audited; 1 gap surfaced + migration drafted)
- [ ] Task 11: External monitoring + daily reconciliation owner (runbook drafted; UptimeRobot/Sentry/Stripe-alerts setup are operator)
- [ ] Task 12: Load test execution + backup-restore drill

### Session 1 progress notes (2026-05-18)

**Task 1 — partial complete:**
- `[x]` `.gitattributes` exists at repo root; `git check-attr text README.md` → `set`, `eol` → `lf`
- `[x]` `docs/BRANCH_TRIAGE_2026-05-18.md` lists every branch from `git branch -a` with disposition + verify-first deletion commands
- `[ ]` `marketplace-completion` plan: 7 of 8 task checkboxes still `[ ]` — requires separate `/spec docs/superpowers/plans/2026-05-16-marketplace-completion.md` run
- `[ ]` `ops-admin-control-center` plan: completion status not verified — requires separate `/spec docs/plans/2026-05-07-ops-admin-control-center.md` run
- `[ ]` `pnpm test:e2e:lifecycle` runs green — gated on the two predecessor plans above

**Task 2 — partial complete:**
- `[x]` Legacy duplicate `apps/ops-admin/src/app/api/cron/sla-tick/route.ts` marked deprecated in header; canonical route confirmed as `/api/engine/processors/sla` per `vercel.json`
- `[x]` Run-tracking table confirmed as `ops_processor_runs` (writer = `claimProcessorRun` in `apps/ops-admin/src/lib/processor-runs.ts`)
- `[x]` `GET /api/engine/health` payload now includes `readiness.processorRuns.<name>.lastSuccessAt` (3 tests passing: `pnpm --filter @ridendine/ops-admin test -- engine/health`)
- `[x]` `scripts/local-cron.mjs` now invokes canonical `/api/engine/processors/*` paths in dev (matches prod)
- `[x]` `docs/KNOWN_ISSUES_2026-05-14.md` updated with resolution log entry for issue #1 code-side
- `[ ]` `CRON_SECRET` and `ENGINE_PROCESSOR_TOKEN` set in Vercel `ridendine-ops-admin` production — **OPERATOR ACTION (Sean)** — code is ready; this is a Vercel env-var push only
- `[ ]` `curl ... /api/engine/processors/sla` returns 200 — gated on env-var push above
- `[ ]` `ops_processor_runs` has ≥5 rows from production within 24h of env-var push — gated on env-var push
- `[ ]` Stuck order `dd162200-b218-464c-955d-965734fae1b2` has `engine_status='cancelled'` — gated on env-var push; auto-resolves on first SLA tick post-push

**Task 4 — complete:**
- `[x]` `docs/CROSS_APP_CONTRACTS.md` documents all four boundaries (customer↔server, chef↔server, driver↔server, server→ops) with writer + reader file:line references for every payload
- `[x]` Realtime channels documented with payload whitelists and sanitizer references
- `[x]` Findings section captured: zero contract violations discovered during audit
- `[x]` Update procedure documented so future contract changes stay in sync

**Task 3 — reshaped, blocked on Sean's decision:**
- During the 2026-05-18 audit it was discovered that the launch checklist T15-referenced migration (`00026_notification_preferences.sql`) was never authored — the actual 00026 is `driver_payout_accounts.sql` and zero references to a `notification_preferences` table exist anywhere in the codebase.
- Task 3 body in this plan has been updated to reflect this reality and to capture the two paths forward (drop T15 as deferred OR author the migration), awaiting Sean's choice before the migration is created. Schema-design-without-requirements is a scope violation; the task does not proceed past the discovery until Sean weighs in.
- Migration count check: repo has 38 (`ls supabase/migrations/*.sql | wc -l`); prod is reportedly synced per the 2026-05-14 verification.

**Task 11 — runbook drafted, operator setup remaining:**
- `[x]` `docs/MONITORING_RUNBOOK.md` written — covers UptimeRobot monitor config (4 monitors, one per app), Sentry alert rules (single project, tagged by app), Stripe webhook delivery-failure alerts, synthetic monitor for engine processor freshness, daily reconciliation email recipient (`FINANCE_RECONCILIATION_EMAIL`), and the deliberate-misconfiguration drill procedure (Truth 2 verification). Drill log section ready to fill in after first run.
- `[ ]` UptimeRobot account setup + 4 monitors configured — **OPERATOR (Sean)**.
- `[ ]` Stripe Dashboard webhook delivery-failure alerts toggled ON — **OPERATOR (Sean)**.
- `[ ]` `FINANCE_RECONCILIATION_EMAIL` set in ops-admin Vercel project — **OPERATOR (Sean)**.
- `[ ]` First drill completed and drill log row recorded — gated on Task 5 (lifecycle E2E running) AND operator setup above.

**Task 10 — partial audit complete, one gap surfaced:**
- `[x]` 4 of 7 sensitive tables audited and recorded in `docs/RLS_AUDIT_2026-05-18.md`: `ledger_entries` ✅, `chef_payout_accounts` ✅, `order_exceptions` ✅, `driver_documents` ⚠️ (gap).
- `[x]` Gap: `driver_documents` has driver-self ALL policy but NO ops-read policy. Ops driver-approval flow (Gate 5 of PILOT_CHEF_LAUNCH_PLAN) currently relies on the engine's admin-client bypass. Migration drafted in the audit doc; awaits Sean's decision (apply explicit policy vs document the admin-client reliance).
- `[ ]` `support_threads`, `support_messages`, `audit_log` — deferred to a follow-up audit session (TASK-D in the audit doc).
- `[ ]` Legal copy replacement, DRAFT banner removal — **operator deliverable** (Sean's reviewed text).
- `[ ]` Verification SQL run on staging — gated on staging environment work (Task 5).

**Task 9 — code complete, blocked on operator step:**
- `[x]` Audit confirmed all 4 apps already ship Sentry config (`sentry.{client,server,edge}.config.ts` × 4 apps) reading `NEXT_PUBLIC_SENTRY_DSN`; full audit at `docs/INFRA_AUDIT_2026-05-18.md`.
- `[x]` Audit confirmed Upstash rate-limit provider already fully implemented at `packages/utils/src/rate-limit/index.ts` with memory fallback + degraded-mode signaling; 5 tests passing.
- `[x]` Added per-app tags (`initialScope: { tags: { app: <name> } }`) to all 12 sentry config files so issues are filterable by source app in the shared Sentry project (Path A from the infra audit).
- `[ ]` `UPSTASH_REDIS_REST_URL` + `_TOKEN` set in prod scope on all 4 Vercel projects — **OPERATOR ACTION (Sean)**.
- `[ ]` `NEXT_PUBLIC_SENTRY_DSN` set in prod scope on all 4 Vercel projects — **OPERATOR ACTION (Sean)**.
- `[ ]` Test errors triggered + captured in Sentry per app (verification, after env vars set).

**Task 6 — complete:**
- `[x]` Static-code audit confirmed all four `postgres_changes` subscriptions wired (`orders`, `deliveries`, `driver_presence`, `chef_storefronts`) plus both broadcast handlers (`ops.live.patch`, `board.refresh`) on `ops:live`. Captured in `docs/OPS_LIVE_BOARD_AUDIT_2026-05-18.md`.
- `[x]` Reducer monotonic `updated_at` deduplication confirmed in all 4 PATCH actions; existing stale-update test covers `ORDER_PATCH`.
- `[x]` 60s snapshot-refetch fallback on disconnect confirmed wired (`startFallback` / `clearFallback` in `use-ops-live-feed.ts`).
- `[x]` Snapshot endpoint returns server-computed `pressure` object (openExceptions, slaBreaches, pendingDispatch, deliveryEscalations).
- `[x]` Added 3 reducer tests for the previously uncovered `DELIVERY_PATCH` action (attach, orphan-ignore, stale-reject); full reducer suite 9/9 passing.
- **One material gap surfaced** (`docs/OPS_LIVE_BOARD_AUDIT_2026-05-18.md` Gap 2): pressure counters do not auto-update between snapshot refreshes when realtime is healthy. Audit recommends emitting `board.refresh` on `ops:live` from the engine when an exception or SLA breach is written. Tracked as TASK-A (follow-up) in the audit doc; soft-launch blocker.
- Reconnect fallback path itself is wired but not unit-tested (would require React-Testing-Library + supabase channel mocking) — deferred as a code-coverage follow-up, not a correctness gap.

**Diagnostic note from Vercel runtime logs (2026-05-18 12:46 UTC):** zero `/api/engine/processors/*` or `/api/cron/*` paths appear in the last 24h of production runtime logs for `prj_RgQF9FvEBdpW4v8px65TaPLJQnsY`. This confirms the cron still isn't firing in production — operator action on env vars is the unblocker.

## Implementation Tasks

### Task 1: Close Out In-Flight Plans + CRLF Hygiene

**Objective:** Drive the two predecessor plans (`marketplace-completion` Tasks 2-8 and `ops-admin-control-center`) to 100% before any later task here starts, add `.gitattributes` to prevent CRLF noise from recurring, and produce a one-shot branch-triage document categorizing the seven `claude/*` feature branches. This is a coordinator task — most code work happens inside the predecessor plans via `/spec-implement` on each.

**Files:**
- Resume: `docs/superpowers/plans/2026-05-16-marketplace-completion.md` (drive Tasks 2-8 to checked)
- Resume: `docs/plans/2026-05-07-ops-admin-control-center.md` (drive remaining tasks to checked)
- Create: `.gitattributes` (root) — `* text=auto eol=lf` plus explicit binary classes
- Create: `docs/BRANCH_TRIAGE_2026-05-18.md` — per-branch disposition (keep/merge/delete) for each `claude/*` + `complete/*` + `docs/*` remote branch
- Modify: `docs/plans/2026-05-18-production-readiness-stabilization.md` (this plan) — update Progress Tracking when Task 1 closes

**Key Decisions:**
- **DO NOT bulk-renormalize the 1312 CRLF files**. `.gitattributes` handles new commits; existing CRLF normalizes on next edit. A `git add --renormalize .` mega-commit is dangerous reviewer noise.
- Predecessor plans run via separate `/spec-implement` invocations. When entering Task 1, implementer invokes `/spec docs/superpowers/plans/2026-05-16-marketplace-completion.md` first; only after that plan's verify passes does this task continue.
- Branch triage doc must include the GitHub PR number (if any) and last-commit date per branch — use `git log --format='%cd %s' -n 1 <branch>`.

**Definition of Done:**
- [ ] `marketplace-completion` plan: all 8 task checkboxes are `[x]`; verify step ran green
- [ ] `ops-admin-control-center` plan: all task checkboxes are `[x]`
- [ ] `.gitattributes` exists at repo root; `git check-attr text .` returns `set`
- [ ] `docs/BRANCH_TRIAGE_2026-05-18.md` lists every branch from `git branch -a` with disposition
- [ ] Verify: `pnpm test:e2e:lifecycle` runs green (existing lifecycle smoke survives in-flight changes) — RUN THIS STEP LAST, after every predecessor task checkbox above is marked `[x]`. The script depends on `marketplace-completion` Task 8 (lifecycle fixtures), which is part of what this task drives to completion; running it earlier will produce false negatives that look like regressions but are actually missing fixtures.

---

### Task 2: Verify Production Cron Infrastructure End-to-End

**Objective:** Resolve the silent 401 cron failures documented in `docs/KNOWN_ISSUES_2026-05-14.md` #1 — every cron in `apps/ops-admin/vercel.json` must execute and produce observable side-effects in production. This unblocks Phase B's E2E lifecycle test, which relies on the SLA processor firing.

**Files:**
- Verify (no edits expected): `packages/utils/src/processor-auth.ts` — fail-closed semantics already correct
- Modify: `apps/ops-admin/src/app/api/engine/health/route.ts` — add per-processor "last successful run" timestamp from `processor_runs` table to the readiness payload (so monitoring can alert on staleness, not just env presence)
- Test: `apps/ops-admin/src/app/api/engine/health/__tests__/route.test.ts` — assert health includes `processorRuns: {sla: {lastSuccessAt: ...}, expiredOffers: ..., ...}`
- Modify: `docs/KNOWN_ISSUES_2026-05-14.md` — mark issue #1 resolved with PR/commit reference; do not delete the entry

**Key Decisions:**
- Vercel env vars (`CRON_SECRET`, `ENGINE_PROCESSOR_TOKEN`) are set via `vercel env add` (CLI) or the dashboard — Sean owns the secret values; this task documents the procedure but does not check secrets into the repo. The actual env-var push is an operator action, not a code commit. The DoD verify command is what proves the secrets are set.
- The fail-closed `validateEngineProcessorHeaders` in `packages/utils/src/processor-auth.ts:11` is correct and should not change.
- Issue RD-MP4ZNSEA-AJKX (stuck order) is expected to auto-resolve on next SLA tick after env vars set — confirm by querying `orders.engine_status` for that order id.

**Definition of Done:**
- [ ] `CRON_SECRET` and `ENGINE_PROCESSOR_TOKEN` set in Vercel `ridendine-ops-admin` project (production scope) — verified by `vercel env ls --environment production` showing both keys
- [ ] `curl -H "Authorization: Bearer $CRON_SECRET" -X POST https://ops.ridendine.ca/api/engine/processors/sla` returns 200 (not 401)
- [ ] Legacy duplicate `apps/ops-admin/src/app/api/cron/sla-tick/route.ts` is either removed or explicitly documented as retired (one of `/api/cron/sla-tick` or `/api/engine/processors/sla` is the canonical cron target; the other is removed). `apps/ops-admin/vercel.json` `crons[].path` value confirms which route is canonical. Document the decision in `docs/KNOWN_ISSUES_2026-05-14.md` resolution notes.
- [ ] Run-tracking table (`processor_runs` or whatever table name `claimProcessorRun` writes to in `apps/ops-admin/src/lib/processor-runs.ts` — verify by reading that file before asserting) has at least 5 rows from production for the canonical SLA processor within 24 hours of env-var push
- [ ] Order `dd162200-b218-464c-955d-965734fae1b2` has `engine_status='cancelled'` with `cancellation_reason='sla_breach'`
- [ ] `GET /api/engine/health` payload includes `readiness.processorRuns.sla.lastSuccessAt` populated
- [ ] Verify: `pnpm --filter @ridendine/ops-admin test -- engine/health`

---

### Task 3: Apply Pending Migrations + Regenerate Types

**Objective:** Reconcile launch-checklist gate T15 with reality, verify all 38 repo migrations are applied in production, and regenerate types if drift exists. Surface the discovered gap that the launch checklist's referenced migration was never authored, and decide its disposition with Sean before authoring.

**Files:**
- Verify: `supabase/migrations/` — actual 00026 is `driver_payout_accounts.sql`; latest is 00038. **No `notification_preferences` migration has been authored.** Zero references to the table exist anywhere in the codebase (verified by `grep -rln "notification_preferences" packages apps` on 2026-05-18). T15 as originally written is unactionable.
- Modify: `packages/db/src/generated/database.types.ts` — regenerate via `pnpm db:generate` (note: file lives in `src/generated/`, not `src/`)
- Modify: `docs/LAUNCH_CHECKLIST.md` — replace T15 with either "deferred to push-notification UI plan" (recommended given current Out of Scope on push UI) OR author a minimal schema-only migration. Requires Sean's decision before authoring; schema-design-without-requirements is a scope violation.

**Key Decisions:**
- The 2026-05-18 session discovered T15 references a non-existent file. Two paths forward, gated on Sean's input:
  (a) **Drop T15 from launch checklist** — push-notification UI is out of scope per this plan; preferences UI doesn't exist; an unused table is dead weight. Document the deferral with a follow-up reference.
  (b) **Author `supabase/migrations/00039_notification_preferences.sql`** as a forward-compatible schema (user_id PK, channel jsonb with `{sms, email, push}` keys defaulting to all `true`, RLS = owner-or-platform-role). This is the version expected by the launch checklist's prose, but the actual columns/policies require schema design.
- Migration count check: `ls supabase/migrations/*.sql | wc -l` returned 38 on 2026-05-18. Prod is reportedly synced per recent verification.
- `pnpm db:generate` is a safe re-run regardless of which path is chosen; it only re-derives types from the live schema.
- `Trivial:` does NOT apply — migrations have non-trivial RLS implications and schema design is not trivial.

**Definition of Done:**
- [ ] T15 disposition recorded in `docs/LAUNCH_CHECKLIST.md` — either marked deferred with rationale, OR marked `[x]` with new migration filename
- [ ] If path (b) chosen: `supabase/migrations/00039_notification_preferences.sql` exists, applied to prod, and `pnpm db:generate` regenerated types in `packages/db/src/generated/database.types.ts`
- [ ] Local migration count `ls supabase/migrations/*.sql | wc -l` matches prod `select count(*) from supabase_migrations.schema_migrations`
- [ ] Verify: `pnpm typecheck` from repo root

---

### Task 4: Cross-App Information Flow Contract Audit

**Objective:** Produce an authoritative `docs/CROSS_APP_CONTRACTS.md` enumerating every cross-app data hop — what each app reads, writes, broadcasts, and listens for — with concrete file:line references. The doc is the contract that Task 5 (E2E test) asserts against. Existing `docs/APP_CONNECTIONS.md` covers the shape; this task adds rigor (payload schemas, channel names, sanitizer references).

**Files:**
- Create or update: `docs/CROSS_APP_CONTRACTS.md` (existing file referenced by `LAUNCH_CHECKLIST.md` A.2; create if missing, expand if present)
- Reference (read-only): `packages/engine/src/core/event-emitter.ts` (channel + event names)
- Reference (read-only): `packages/engine/src/core/public-broadcast-sanitizer.ts` (whitelist payloads)
- Reference (read-only): `apps/ops-admin/src/app/api/ops/live-board/route.ts` (ops snapshot shape)
- Reference (read-only): `docs/business-rules/*.md` (ownership rules)

**Key Decisions:**
- Document FOUR cross-app boundaries with full payload schemas: (a) customer → server (checkout, cart, order); (b) chef admin → server (accept/prepare/ready); (c) driver app → server (offer-response, location, status); (d) server → ops via `ops:live` Realtime + snapshot endpoint.
- For each boundary, capture: **What** (payload TypeScript type), **Who** (auth required), **When** (trigger event), **Where** (file:line of writer + reader).
- This is a documentation task — no production code edits expected. If during the audit a contract violation is found (e.g., a route bypasses sanitization), capture it as a finding in the doc with a follow-up task ID, not a fix here.

**Definition of Done:**
- [ ] `docs/CROSS_APP_CONTRACTS.md` exists with four boundary sections (customer→server, chef→server, driver→server, server→ops)
- [ ] Each boundary cites a writer file:line and a reader file:line for every payload kind
- [ ] Realtime channels documented: `order:{orderId}`, `driver:{driverId}:offers`, `ops:live` with allowed events + payload whitelist references
- [ ] Findings section lists any contract violations discovered during audit (zero is acceptable; documented is required)
- [ ] Verify: `markdownlint docs/CROSS_APP_CONTRACTS.md` (if markdownlint installed) or visual inspection link-check

---

### Task 5: Canonical Lifecycle E2E Test (Playwright)

**Objective:** A single Playwright spec walks the full marketplace lifecycle (TS-001 → TS-005 chained), asserting at every cross-app boundary that DB state, realtime payloads, and UI all agree. This is the regression gate for every later phase — Tasks 6-12 cannot mark `complete` if this test fails.

**Files:**
- Create: `e2e/lifecycle/full-marketplace-lifecycle.spec.ts`
- Create: `e2e/lifecycle/helpers/db-assertions.ts` — typed Supabase-admin helpers for state polling (`waitForOrderStatus`, `waitForLedgerEntry`, `waitForDeliveryStatus`)
- Create: `e2e/lifecycle/helpers/realtime-recorder.ts` — subscribes to `order:{id}`, `driver:{id}:offers`, `ops:live` and records received events for assertion
- Modify: `playwright.config.ts` — add `web-lifecycle` project pointing at staging URL set; gate behind env var `RIDENDINE_E2E_STAGING_URL`
- Modify: `package.json` — add `test:e2e:lifecycle:full` script

**Key Decisions:**
- **Single chained spec, not five separate**: walking the full lifecycle in one test ensures the implementation can't pass each scenario in isolation while failing on a state handoff.
- **Condition-based waiting** per `docs/KNOWN_ISSUES_2026-05-14.md` test design: poll DB state with explicit timeout (15s max per hop), never `await page.waitForTimeout()`. See `e2e/lifecycle/customer.spec.ts` for existing pattern to follow.
- **Realtime assertions**: the test subscribes to all three Realtime channels at test start and records every event; final assertion section verifies the expected event sequence (`order_update` with `cooking`, then `on_the_way`, then `delivered`; `offer` broadcast; `ops:live` postgres_changes for orders + deliveries).
- **Fixtures**: relies on Task 8 of the `marketplace-completion` plan ("Deterministic Lifecycle Fixtures"). Test failure should reference that plan if fixtures are missing.
- **Targets staging by default**, not production — env-gated. Running against production requires explicit `RIDENDINE_E2E_ALLOW_PROD=true` env var.
- **Staging environment prerequisite — gate before any code is written.** Before authoring the spec, confirm: (a) `RIDENDINE_E2E_STAGING_URL` is set and resolvable to a deployed staging environment (separate Vercel deployments + Supabase project from production); (b) staging Supabase project has `marketplace-completion` Task 8 fixtures applied (deterministic IDs for chef, storefront, menu item, modifier, customer); (c) the staging storefront is `storefront_state='published'` and `accepting_orders=true`; (d) the staging URLs and the path to provision new staging environments are documented in `docs/ENVIRONMENT_VARIABLES.md` under a new `Staging` block. If staging does not exist as a separate environment, Task 5 is BLOCKED until Sean provisions it — escalate before writing test code; do not redirect to production.

**Definition of Done:**
- [ ] `e2e/lifecycle/full-marketplace-lifecycle.spec.ts` exists and contains assertions for all five TS-001 → TS-005 scenarios linked above
- [ ] Test runs green at least 3 consecutive times against staging (`RIDENDINE_E2E_STAGING_URL=... pnpm test:e2e:lifecycle:full`)
- [ ] Realtime channel events asserted in correct order: `order_update(cooking) → order_update(on_the_way) → order_update(delivered)`
- [ ] Ledger triple assertion: 3 `ledger_entries` rows with types `chef_payable`, `driver_payable`, `platform_revenue`, all linked by `order_id`
- [ ] Verify: `RIDENDINE_E2E_STAGING_URL=<staging-url> pnpm test:e2e:lifecycle:full --reporter=dot`

---

### Task 6: Ops Live Board Completeness Audit + Gap Fixes

**Objective:** Verify the `ops:live` Realtime channel actually delivers what `docs/BUSINESS_ENGINE.md` claims it does — `postgres_changes` on `orders`, `deliveries`, `driver_presence`, and `chef_storefronts`, plus engine pressure counters, plus broadcast handlers for `ops.live.patch` and `board.refresh`. Fix any gaps found. Targets TS-004.

**Files:**
- Verify/modify: `apps/ops-admin/src/app/dashboard/_components/use-ops-live-feed.ts` (or wherever `useOpsLiveFeed` lives) — confirm all four table subscriptions are wired
- Verify/modify: `apps/ops-admin/src/lib/ops-live-feed-reducer.ts` — confirm monotonic `updated_at` deduplication
- Verify/modify: `apps/ops-admin/src/app/api/ops/live-board/route.ts` — confirm snapshot returns engine pressure counts (exceptions, SLA breaches today, pending dispatch, escalations)
- Test: `apps/ops-admin/src/lib/__tests__/ops-live-feed-reducer.test.ts` — assert reducer rejects stale updates by `updated_at`
- Test: `apps/ops-admin/src/app/api/ops/live-board/__tests__/route.test.ts` — assert pressure counts match seeded fixture state

**Key Decisions:**
- The hard part is **proving the connection survives reconnects**. Add a 60s snapshot-refetch fallback test: kill the socket, wait 65s, assert state matches DB.
- Pressure counters (engine_status='exception', SLA breaches today, pending dispatch, escalations) MUST be computed server-side in the snapshot endpoint — don't trust client to count.
- Don't add bulk-action UI here — that's `dashboard_actions` capability work and is part of `ops-admin-control-center` (already closed by Task 1).

**Definition of Done:**
- [ ] All four `postgres_changes` subscriptions wired on `ops:live`: orders, deliveries, driver_presence, chef_storefronts
- [ ] Snapshot endpoint returns `pressure: {exceptions: number, slaBreachesToday: number, pendingDispatch: number, escalations: number}` matching DB
- [ ] Reducer test: stale `updated_at` is ignored (state preserved)
- [ ] Reconnect test: 60s snapshot refetch repopulates without duplicate rows
- [ ] TS-004 (in Task 5's spec) passes
- [ ] Verify: `pnpm --filter @ridendine/ops-admin test`

---

### Task 7: Chef + Driver Stripe Connect Express End-to-End

**Objective:** Take a real chef and a real driver through the full Stripe Connect Express onboarding flow on test mode — from `chef-admin/auth/signup` to `chef_payout_accounts.payout_enabled=true`, and from `driver-app/auth/signup` to `drivers.stripe_connect_account_id` populated. Webhook updates flow correctly. Targets Pilot Chef Launch Plan Gates 2 + 5.

**Files:**
- Verify: `packages/engine/src/services/stripe.service.ts` — `getStripeClient()` must construct `new Stripe(key, { apiVersion: '<explicit-pinned-string>' })`; if `apiVersion` is absent (SDK default), pin it to the current stable Stripe API version before any Connect onboarding test runs
- Verify (likely no edits): `apps/chef-admin/src/app/api/payouts/setup/route.ts` — Connect account creation
- Verify (likely no edits): `apps/driver-app/src/app/api/payouts/setup/route.ts` (or wherever driver setup lives — check `apps/driver-app/src/app/api/` layout)
- Verify (likely no edits): `apps/web/src/app/api/webhooks/stripe/route.ts` — handles `account.updated` events to flip `payout_enabled`
- Test: `apps/chef-admin/src/app/api/payouts/setup/__tests__/route.test.ts` — assert account creation + redirect URL signed
- Modify: `docs/PILOT_CHEF_LAUNCH_PLAN_2026-05-14.md` — mark Gates 2 and 5 as `[x]` with date

**Key Decisions:**
- **Test on REAL person (Sean) first**, not just unit tests. Stripe Connect onboarding has UX cliffs that only show up on the hosted form (SIN/SSN entry, bank verification microdeposits, document upload). Unit tests cover the API; the real person reaching `payout_enabled=true` is the truth.
- The chef-admin storefront onboarding-status endpoint (`apps/chef-admin/src/app/api/storefront/onboarding-status/route.ts`, currently untracked) is the right place to expose "Stripe ready? Yes/No" to the chef dashboard. If the file is empty/missing, scope its creation into this task.
- Driver Connect uses the same flow but additionally requires `driver_documents` rows (licence + insurance) per `PILOT_CHEF_LAUNCH_PLAN_2026-05-14.md` Gate 5 — document upload UI must work.

**Definition of Done:**
- [ ] Real chef account reaches `chef_payout_accounts.payout_enabled=true` and `chef_payout_accounts.status='enabled'`
- [ ] Real driver account reaches `drivers.stripe_connect_account_id IS NOT NULL` and `drivers.payout_blocked=false`
- [ ] `apps/web/src/app/api/webhooks/stripe/route.ts` handles `account.updated` event idempotently — replay does not double-update
- [ ] Onboarding-status endpoint returns accurate `payout_enabled` boolean for both chef and driver flows
- [ ] PILOT_CHEF_LAUNCH_PLAN Gates 2 and 5 marked `[x]`
- [ ] Verify: `pnpm --filter @ridendine/chef-admin test -- payouts/setup` + manual real-account walkthrough recorded in `docs/PILOT_CHEF_LAUNCH_PLAN_2026-05-14.md`

---

### Task 8: Stripe Live Keys Cutover + Ops Finance Webhook

**Objective:** Switch all four apps from `sk_test_` to `sk_live_` keys on Vercel, configure the live-mode Stripe webhook signing secrets, register the ops-admin Stripe finance webhook (currently unconfigured per `docs/PROD_FIXES_2026-05-14.md`), and verify a real-card test order rides through Gate 9. Targets Pilot Chef Launch Plan Gates 8 + 9.

**Files:**
- Verify: `packages/engine/src/services/stripe.service.ts` — `getStripeClient()` safety check rejects mode mismatch
- Modify: `apps/ops-admin/src/app/api/stripe/webhook/route.ts` — confirm route handles the finance-webhook events (charges, transfers, payouts) per `stripe-webhook-finance.ts`
- Test: `packages/engine/src/services/__tests__/stripe-webhook-idempotency.test.ts` — assert TS-007 (replayed event is no-op)
- Modify: `docs/PILOT_CHEF_LAUNCH_PLAN_2026-05-14.md` — mark Gates 8 and 9 `[x]`
- Modify: `docs/PROD_FIXES_2026-05-14.md` — mark the ops finance webhook as configured

**Key Decisions:**
- **Cutover order matters**: (1) provision live keys in Vercel env (4 apps); (2) create live Stripe webhook endpoint pointing at `ridendine.ca/api/webhooks/stripe`; (3) register live finance webhook at `ops.ridendine.ca/api/stripe/webhook`; (4) redeploy all 4 apps; (5) run Gate 9 happy path with real card. Reverse order = brief production outage.
- **Test mode allowance**: `STRIPE_ALLOW_TEST_IN_PRODUCTION` env var stays UNSET in production after this task — it was only for soft-launch testing per launch checklist T3.
- Customer-Connect environments are separate (test-mode Connect accounts are NOT valid in live-mode) — chef + driver must re-onboard for live mode per `PILOT_CHEF_LAUNCH_PLAN_2026-05-14.md` Gate 8 step 5. Build a re-onboarding nudge into both chef-admin AND driver-app dashboards (the driver PWA, not just chef-admin — drivers don't see chef-admin).
- **Test-mode account invalidation is mandatory.** Before flipping any app to live keys, run a one-time script that, for every row in `chef_payout_accounts` and every `drivers.stripe_connect_account_id`, calls `stripe.accounts.retrieve(id)` against the test-mode key, reads `livemode`, and if `false` sets `chef_payout_accounts.payout_enabled = false` + `chef_payout_accounts.status = 'requires_live_onboarding'` (or equivalent driver-side flag). Otherwise a chef who completed test-mode onboarding (Task 7) silently blocks the first real payout.
- This task is the irreversible-money-movement gate — get sign-off per `LAUNCH_CHECKLIST.md` T4/T9/F1 before executing.

**Definition of Done:**
- [ ] All four Vercel projects have `STRIPE_SECRET_KEY` set to `sk_live_*` in production scope
- [ ] Live Stripe webhook endpoint exists in Stripe Dashboard pointing at `https://ridendine.ca/api/webhooks/stripe`, signing secret matches `STRIPE_WEBHOOK_SECRET` in web Vercel project
- [ ] Live finance webhook exists pointing at `https://ops.ridendine.ca/api/stripe/webhook`, signing secret matches `STRIPE_WEBHOOK_SECRET_FINANCE` (or named per code) in ops Vercel project
- [ ] **Test-mode invalidation script run pre-cutover**: every test-mode Connect account in `chef_payout_accounts` and every test-mode `drivers.stripe_connect_account_id` is flagged for re-onboarding (`payout_enabled=false`, status set to a sentinel like `requires_live_onboarding`); chef-admin dashboard and driver-app show a re-onboarding banner to affected users
- [ ] Test order with real card from a real account reaches `engine_status='delivered'` via Gate 9; Stripe live-mode dashboard shows the PaymentIntent + payout transfers
- [ ] TS-007 (idempotency test) passes in CI
- [ ] PILOT_CHEF_LAUNCH_PLAN Gates 8 and 9 marked `[x]`
- [ ] Verify: `STRIPE_TEST_MODE_CHECK=true pnpm --filter @ridendine/engine test -- stripe`

---

### Task 9: Distributed Rate Limiting (Upstash) + Sentry Wire-Up

**Objective:** Resolve launch-checklist gates T14 (distributed rate limiter) and the gap noted in `LAUNCH_CHECKLIST.md` A.5.4. Per-instance in-memory rate limiting is dev-only; production needs Upstash Redis backing. `@sentry/nextjs` is already in `package.json` (root) — wire it up across all four apps for runtime + edge.

**Files:**
- Modify: `packages/utils/src/rate-limit-provider.ts` (or wherever `getRateLimitProviderStatus` lives — discovered via the health route at `apps/ops-admin/src/app/api/health/route.ts:4`) — add Upstash Redis provider behind `UPSTASH_REDIS_REST_URL` env var
- Verify: `apps/{web,chef-admin,ops-admin,driver-app}/sentry.{client,server,edge}.config.ts` — already exist (per Task 1 git status); confirm `dsn` reads from env var per app
- Modify: each app's `.env.example` — add `SENTRY_DSN_<APPNAME>`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` with empty values + comment "set in Vercel env"
- Test: `packages/utils/src/__tests__/rate-limit-provider.test.ts` — assert Upstash provider chosen when env vars set; in-memory fallback otherwise

**Key Decisions:**
- Upstash provider is preferred over self-hosted Redis (Vercel-native, no infra ops). `@upstash/redis` and `@upstash/ratelimit` are the supported packages.
- **Don't replace `getRateLimitProviderStatus` logic** — extend it. The health route already reports provider readiness; this task ensures `provider: 'upstash'` (not `'memory'`) in prod.
- **Sentry is already configured per app** (per the untracked `sentry.*.config.ts` files in git status). This task verifies they read DSNs from env vars and that env vars are set in Vercel. If config files don't exist, scope their creation in.
- Trigger a real error in each app to confirm it lands in Sentry — visual evidence, not a unit test.

**Definition of Done:**
- [ ] `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` set in production scope on all 4 Vercel projects
- [ ] `GET /api/health` on each app reports `rateLimit: {ready: true, provider: 'upstash'}`
- [ ] Rate limit kick-in: hammer `POST /api/checkout` 100x in 60s from one IP → 429s start appearing per Upstash counters
- [ ] Each app has a Sentry DSN configured and a deliberate test error (added then reverted) appears in the Sentry project
- [ ] `.env.example` documents the new env vars
- [ ] `LAUNCH_CHECKLIST.md` T14 marked `[x]`
- [ ] Verify: `pnpm --filter @ridendine/utils test -- rate-limit-provider`

---

### Task 10: RLS Depth Audit + Legal Copy Cutover

**Objective:** Resolve `LAUNCH_CHECKLIST.md` L1/L2 (legal copy placeholders) and IRR-033 (RLS depth on support / sensitive tables). Audit RLS on the highest-value tables and fix any over-permissive policies. Replace draft legal copy with reviewed text. Targets TS-008.

**Files:**
- Audit (no edits expected unless gaps found): `supabase/migrations/*_*.sql` — review RLS policies on `support_threads`, `support_messages`, `order_exceptions`, `ledger_entries`, `chef_payout_accounts`, `driver_documents`, `audit_log`
- Create if gaps found: `supabase/migrations/00039_rls_hardening.sql` (or next sequential number) — tighten the policies discovered as over-permissive
- Modify: `apps/web/src/app/terms/page.tsx` — replace placeholder with legally-reviewed text (text provided by Sean's lawyer/Termly)
- Modify: `apps/web/src/app/privacy/page.tsx` — replace placeholder with legally-reviewed text
- Test: `supabase/tests/rls/sensitive_tables.sql` — assert customer role cannot SELECT from `ledger_entries`, `chef_payout_accounts`, etc.
- Modify: `docs/LAUNCH_CHECKLIST.md` — mark L1, L2 `[x]`

**Key Decisions:**
- **Legal copy is non-engineering work** — Sean provides reviewed text (Termly/Iubenda/lawyer output). This task PASTES the reviewed text into the existing page files; it does not draft legal language.
- **RLS audit method**: for each sensitive table, run two psql queries on staging: (a) `SET ROLE authenticator; SET request.jwt.claim.sub = '<test-customer-uuid>'; SELECT * FROM <table>;` should return 0 rows or error; (b) `SET request.jwt.claim.sub = '<test-ops-uuid>';` should return rows. Document the result table per audited table.
- **`pnpm audit:guards`** is the API-route guard audit (different from RLS); this task expects that script already passes from Task 6 of `marketplace-completion`. If it fails here, that's a regression to fix in this task.
- The "DRAFT" banner currently shown to users (per `docs/LEGAL_DISCLAIMERS_2026-05-14.md`) is removed when the reviewed copy lands.

**Definition of Done:**
- [ ] Each sensitive table audit row recorded in `docs/RLS_AUDIT_2026-05-18.md`: table name, policy excerpt, customer-role test result, ops-role test result
- [ ] If gaps found: `supabase/migrations/00039_rls_hardening.sql` applied to prod; new policies pass the audit tests
- [ ] `apps/web/src/app/terms/page.tsx` and `/privacy/page.tsx` show legally-reviewed text (not "DRAFT — auto-generated placeholder")
- [ ] DRAFT banner removed from production web app
- [ ] TS-008 (in Task 5's spec) passes
- [ ] `pnpm audit:guards` exits 0
- [ ] `LAUNCH_CHECKLIST.md` L1 + L2 + S1 marked `[x]`
- [ ] Verify: `psql $STAGING_DATABASE_URL -f supabase/tests/rls/sensitive_tables.sql`

---

### Task 11: External Monitoring + Daily Reconciliation Owner

**Objective:** Wire production observability — UptimeRobot (or BetterStack/Vercel monitor) hits `/api/health` on every app, Stripe webhook delivery-failure alerts route to Sean, and a daily `Stripe ↔ ledger_entries` reconciliation runs unattended with the report emailed to the assigned finance owner. Closes Pilot Chef Launch Plan Gate 10 and `LAUNCH_CHECKLIST.md` T8 + F3.

**Files:**
- Verify: `apps/ops-admin/src/app/api/cron/reconciliation-daily/route.ts` — confirm it produces a complete report (already exists; verify completeness)
- Modify (if needed): the reconciliation route handler — after computing the diff, send the report via `packages/notifications` to `FINANCE_RECONCILIATION_EMAIL` env var; current behavior may only log to console
- Create: `docs/MONITORING_RUNBOOK.md` — documents which uptime monitor watches which URL, alert routing rules, paging schedule
- Modify: `docs/LAUNCH_CHECKLIST.md` — mark T8, F3, P1, P2 `[x]`
- Test: `apps/ops-admin/src/app/api/cron/reconciliation-daily/__tests__/route.test.ts` — assert email-send invoked when diff non-zero

**Key Decisions:**
- UptimeRobot is the default choice — free tier supports 4 monitors at 5-min interval, sufficient for the four `/api/health` endpoints. BetterStack is a paid alternative if Sean prefers richer features.
- **Reconciliation owner assignment is org policy, not code** — `FINANCE_RECONCILIATION_EMAIL` env var holds the email. This task picks a default (Sean's email) and documents the override.
- Stripe webhook delivery-failure alerts are configured in the Stripe Dashboard, not in code. The task documents the configuration steps; verification = trigger a webhook failure on staging and confirm email lands.

**Definition of Done:**
- [ ] UptimeRobot has 4 monitors configured (one per app `/api/health`), 5-min interval, alerting to Sean's email
- [ ] Stripe Dashboard webhook alert configured: ≥1 delivery failure in 24h → email
- [ ] `FINANCE_RECONCILIATION_EMAIL` set in ops-admin Vercel project
- [ ] Reconciliation cron run produces a sent email; recipient can open the diff report
- [ ] `docs/MONITORING_RUNBOOK.md` exists with the URL→monitor→alert mapping
- [ ] `LAUNCH_CHECKLIST.md` T8, F3, P1, P2 marked `[x]`
- [ ] Verify: `pnpm --filter @ridendine/ops-admin test -- reconciliation-daily`

---

### Task 12: Load Test Execution + Backup-Restore Drill

**Objective:** Run the existing load-smoke script against staging with realistic concurrency, capture an SLO baseline, and execute one PITR (point-in-time recovery) restore drill on the staging Supabase project to measure real RPO/RTO. Closes `LAUNCH_CHECKLIST.md` IRR-024 and the deferred items in `docs/BACKUP_AND_ROLLBACK.md`.

**Files:**
- Verify: `scripts/load/run-load-smoke.mjs` exists and runs; confirm targets configurable via env vars
- Create: `docs/LOAD_REPORT_2026-05-18.md` — concurrency × P50/P95/P99 latency × error-rate per critical endpoint
- Create: `docs/BACKUP_RESTORE_DRILL_2026-05-18.md` — captured RPO/RTO from the actual drill, restore procedure walked
- Modify: `docs/RUNBOOK_DEPLOY.md` and `docs/BACKUP_AND_ROLLBACK.md` — fill in the `TBD` RPO/RTO with measured values
- Modify: `docs/LAUNCH_CHECKLIST.md` — mark T12 (E2E lifecycle), IRR-024, and Appendix A.5 items related to load + backup `[x]`

**Key Decisions:**
- **PITR drill is non-destructive**: Supabase PITR creates a fork of the production database at a point in time — restoring it does not affect the live database. Use a separate Supabase project URL for the restored copy and run smoke against it before tearing down.
- **Load targets for soft-launch**: 50 concurrent customers browsing + 5 concurrent checkouts/min for 10 minutes. This matches "Hamilton single-zone, ~2 chefs, ~5 drivers" sizing. Document the targets so growth phases can adjust.
- **SLO baseline**: P95 < 500ms on `/api/chefs` (cold cache), P95 < 1000ms on `/api/checkout`, error rate < 0.5% across all endpoints. If staging fails these on soft-launch sizing, that's a hard problem to surface BEFORE real customers arrive.

**Definition of Done:**
- [ ] `pnpm test:load:staging` runs to completion; report captured at `docs/LOAD_REPORT_2026-05-18.md`
- [ ] PITR restore drill complete; restored project URL captured in `docs/BACKUP_RESTORE_DRILL_2026-05-18.md` with measured RPO + RTO
- [ ] `docs/RUNBOOK_DEPLOY.md` and `docs/BACKUP_AND_ROLLBACK.md` have measured values replacing every `TBD`
- [ ] SLO baseline either meets or has documented mitigation: P95 < 1000ms on `/api/checkout`, error rate < 0.5%
- [ ] `LAUNCH_CHECKLIST.md` IRR-024 and Appendix A.5 backup/load items marked `[x]`
- [ ] Verify: `pnpm test:load:staging --dry-run` exits 0 (script integrity); load report file exists at the documented path

## Deferred Ideas

These surfaced during planning but are intentionally NOT in this plan. Captured so they aren't lost:

- **Surge / dynamic pricing activation** — engine code exists at `packages/engine/src/services/surge-pricing.service.ts` but no ops UI to activate it. Phase 3 work post-soft-launch.
- **Customer push notifications via service worker** — `notification_preferences` schema lands in Task 3, but the customer-facing push UI is deferred. SMS via Twilio stays primary.
- **Bulk CRLF renormalization** — `.gitattributes` (Task 1) prevents recurrence; a one-shot mass renormalize is high-risk reviewer noise and offers no functional gain.
- **Mobile-native driver app** — current PWA acceptable for soft-launch (user-confirmed out-of-scope).
- **Multi-zone service-area expansion** — Hamilton single-zone only (user-confirmed out-of-scope).
- **OWASP ZAP penetration scan** — `LAUNCH_CHECKLIST.md` S3 marked optional; deferred unless security review demands it.

## Open Questions

- **Who owns the legal copy delivery for Task 10?** Sean is on the hook for providing reviewed Terms + Privacy text — confirm source (Termly, lawyer, Iubenda) and timeline before Task 10 starts.
- **Hamilton service-area polygon precision** — current default polygon in `service_areas` seed is a placeholder. Before Gate 9 (real money first order, Task 8), the polygon should reflect the actual Hamilton kitchen + delivery zone. Resolve in or before Task 7.
- **Sentry project structure** — one project shared across 4 apps, or 4 separate Sentry projects? Affects DSN env-var shape in Task 9. Recommend one project with environment + release tags; confirm with Sean.
