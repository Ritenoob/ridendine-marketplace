# Chef Kitchen Command — Efficiency Tools Implementation Plan

Created: 2026-06-19
Author: sean@cashflowarmy.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Context

The chef-admin app today is strong on **business intelligence** — customers, growth, earnings, analytics, and a per-order kitchen ticket workflow (`orders-list.tsx`). What it lacks is **kitchen-floor execution**: the chef has no cross-order view of *what to physically cook right now*, no morning plan for *how much to prep*, no at-a-glance *how slammed am I*, and no real *stop-the-line* control. Those are exactly the tools that let a one-person kitchen run efficiently during a rush.

This plan adds a single cohesive **Kitchen Command** surface (`/dashboard/kitchen`) that bundles three derived-view tools plus one real service control, all on **existing tables/columns only — no new tables or migrations**:

1. **Daily Prep Plan** — a morning mise-en-place checklist. For each menu item it suggests a prep quantity from recent same-weekday demand, capped at the item's `daily_limit` and net of what's already sold today.
2. **Live Prep Board** — aggregates all in-progress orders into one "make list" (e.g. *Butter Chicken ×7 across 4 orders*) so the chef batches instead of cooking ticket-by-ticket.
3. **Kitchen Load gauge** — a live read-only busy meter derived from active orders, signalling when to pause.
4. **Pause new orders** — a real stop-the-line toggle that genuinely blocks customer checkout, implemented by reusing the platform's existing `is_paused` mechanism (no schema change).

**Intended outcome:** the chef opens one screen each service and knows what to prep, what to cook next, how busy they are, and can truly stop intake when overwhelmed.

## Summary

**Goal:** Give chef-admin real kitchen-floor power via a `/dashboard/kitchen` "Kitchen Command" page (Daily Prep Plan + Live Prep Board + Kitchen Load gauge + a genuinely-enforced Pause), using only existing tables/columns.

---

## Key Findings (grounded in the code)

- **Pause is already enforceable with zero schema change.** `engine.kitchen.validateCustomerCheckoutReadiness` (`packages/engine/src/orchestrators/kitchen.engine.ts:632`) already denies checkout when `storefront.is_paused` is true (line 662, code `STOREFRONT_PAUSED`), and `apps/web/src/app/api/checkout/route.ts:334` already returns that as a 400. The engine also already exposes audited `pauseStorefront(storefrontId, reason, actor)` (line 199) and `unpauseStorefront(storefrontId, actor)` (line 279), both gated by `canManageStorefront`, which **allows a `chef_user`/`chef_manager` to manage their own storefront** (line 756). ⇒ A real chef Pause = a thin chef-admin route over these existing methods. **No engine edit, no apps/web edit, no migration.**
- **⚠️ `accepting_orders` does NOT exist as a DB column.** It appears in zero migrations and zero entries in `packages/db/src/generated/database.types.ts`; only stale app code references it (`apps/chef-admin/src/app/api/storefront/route.ts:240,261`; `apps/web/src/app/api/storefronts/route.ts:20`). We do **not** use it. (That pre-existing dead reference is a latent bug — noted as out of scope; mention, don't fix here.)
- **Scheduled orders are gated at placement.** `scheduledFor` (`apps/web/src/lib/checkout/scheduling.ts`) is only a future-delivery timestamp; the order is still *created* synchronously at checkout and passes through the readiness gate. There is no fire-time order-creation path. ⇒ Pause blocks all new placements; orders validly placed before a pause still fulfill (documented, expected).
- **Derived-view pattern to mirror:** `apps/chef-admin/src/app/dashboard/growth/page.tsx` (client page + `loading.tsx` skeleton) backed by `app/api/growth/route.ts` (`getChefActorContext` → `createAdminClient` queries → `successResponse({ data })`).
- **Order/menu data shapes confirmed:** `app/dashboard/orders/page.tsx` selects `items:order_items ( quantity, special_instructions, menu_item:menu_items ( id, name ) )` — the Prep Board join. `menu_items` has `name, daily_limit, daily_sold, prep_time_minutes, is_available, is_sold_out, image_url`. `orders.estimated_prep_minutes` exists but is **nullable** (`database.types.ts` orders Row). `chef_storefronts` has `is_paused, is_active, max_queue_size, average_prep_minutes, estimated_prep_time_max`. Active-order vocabulary: `ACTIVE_ORDER_STATUSES = ['pending','accepted','preparing','ready_for_pickup']`.

## Design Decisions (confirmed with user)

- **Pause mechanism = reuse existing `is_paused`** via `engine.kitchen.pauseStorefront`/`unpauseStorefront`. Zero migration; already enforced at checkout; already audited (`storefront_state_changes`, `paused_by`). Accepted tradeoff: `is_paused` is shared with ops/system pause — chef Pause and ops pause use the same flag. The chef Pause is attributed to the chef (`paused_by = chef userId`, reason "Chef paused service").
- **Prep model = same-weekday average.** Suggested qty = average units sold on the last up-to-4 occurrences of today's weekday (`delivered`/`completed` orders), **capped at `daily_limit`** and **net of `daily_sold`** → `suggestedQty = max(0, min(dailyLimit, demand) - dailySold)`. Fallbacks: trailing average over the lookback window when no same-weekday history; then `daily_limit`. Sold-out / unavailable items are shown de-emphasized with suggestedQty 0.
- **Weekday timezone basis** = a single app constant `KITCHEN_TZ = 'America/Vancouver'` (chefs are BC per `chef_kitchens` defaults; deploy is `.ca`). Marked `SHORTCUT:` with upgrade trigger (derive per-storefront tz if one is ever stored). Both "today's weekday" and historical-order bucketing use it consistently.
- **Information architecture = one combined page** `/dashboard/kitchen`, three sections + service-control header, one overview API.
- **Data = existing tables/columns only. No migrations.**

---

## Tasks

### Task 1 [x] — Chef Pause/Resume API route (reuse engine `is_paused`)
- **File (new):** `apps/chef-admin/src/app/api/kitchen/pause/route.ts`, `dynamic = 'force-dynamic'`.
  - `POST` → pause: `getChefActorContext()` guard → `getEngine().kitchen.pauseStorefront(chefContext.storefrontId, 'Chef paused service', chefContext.actor)`.
  - `DELETE` → resume: `getEngine().kitchen.unpauseStorefront(chefContext.storefrontId, chefContext.actor)`.
  - Map the engine `OperationResult` to `successResponse({ isPaused })` / `errorResponse(code, message)` (e.g. `FORBIDDEN` → 403).
- **No engine change, no apps/web change** — customer checkout already blocks on `is_paused` (kitchen.engine.ts:662 → checkout/route.ts:334).
- **TDD:** unit test the route handler wiring — pause calls `pauseStorefront` with the chef's storefrontId/actor; resume calls `unpauseStorefront`; a `FORBIDDEN` engine result surfaces as 403. Mock `getEngine`/`getChefActorContext` (Next route-handler test style).
- **DoD:** route pauses/resumes via the engine; unauthorized actor blocked; typecheck/lint clean.

### Task 2 [x] — Pure kitchen-derivation helpers (chef-admin lib)
- **File (new):** `apps/chef-admin/src/lib/kitchen.ts` — pure, DB-free functions with explicit return types:
  - `computePrepPlan(menuItems, historicalOrderItems, now, tz=KITCHEN_TZ)` → per item `{ id, name, suggestedQty, soldToday, dailyLimit, prepTimeMinutes, basis, available }` where `suggestedQty = max(0, min(dailyLimit, demand) - dailySold)`; `demand = sameWeekdayAvg ?? trailingAvg ?? dailyLimit`; `basis ∈ 'same-weekday'|'trailing'|'limit'`; items with `is_sold_out || is_available===false` → `suggestedQty:0, available:false`. Weekday derived in `tz`; historical order timestamps bucketed by weekday in the same `tz`.
  - `aggregatePrepBoard(activeOrders)` → `{ menuItemId, name, totalQty, orderCount, orders:[{ shortId, qty, specialInstructions }] }[]`, sorted by `totalQty` desc.
  - `computeKitchenLoad(activeOrders, storefront)` → `{ activeCount, outstandingPrepMinutes, capacity, level }`. `level ∈ 'idle'|'steady'|'busy'|'slammed'` from `activeCount / (max_queue_size || 10)` (0→idle, <0.5 steady, <0.85 busy, ≥0.85 slammed). `outstandingPrepMinutes = sum(estimated_prep_minutes ?? (storefront.average_prep_minutes || 20))` — per-order fallback is the storefront **average**, NOT `estimated_prep_time_max` (which would overstate load).
  - Export `KITCHEN_TZ` constant with a `SHORTCUT:` comment (ceiling: single hardcoded tz; trigger: per-storefront timezone storage).
- **TDD:** `apps/chef-admin/src/lib/__tests__/kitchen.test.ts` — same-weekday avg capped at limit; trailing fallback; limit fallback; **sold-out/unavailable → 0**; **at/over daily_limit → 0 (net of daily_sold)**; **midnight-boundary order buckets to the intended weekday in KITCHEN_TZ**; prep-board aggregation across orders; four load bands; **all-null `estimated_prep_minutes` → uses average fallback**. Pure → fast, no mocks.
- **DoD:** helpers + tests green covering the three demand paths, edge cases, tz boundary, and load bands.

### Task 3 [x] — Kitchen overview API route (chef-admin)
- **File (new):** `apps/chef-admin/src/app/api/kitchen/overview/route.ts` — `GET`, `dynamic='force-dynamic'`, mirroring `app/api/growth/route.ts`:
  - `getChefActorContext()` → `createAdminClient()`.
  - Queries (only required columns): (a) storefront (`is_paused, is_active, max_queue_size, average_prep_minutes`); (b) `menu_items` for the storefront (`id,name,daily_limit,daily_sold,prep_time_minutes,is_available,is_sold_out`); (c) active orders (`ACTIVE_ORDER_STATUSES`) with `estimated_prep_minutes` + `order_items(quantity,special_instructions,menu_item:menu_items(id,name))`; (d) historical `delivered`/`completed` orders over the last ~28 days with the same items join.
  - Calls Task 2 helpers; returns `successResponse({ load, prepPlan, prepBoard, service: { isPaused, isActive } })`.
- **DoD:** assembled payload returns; typecheck/lint clean. (Behaviour covered via helper unit tests + page E2E — no redundant route test.)

### Task 4 [x] — Kitchen Command page + loading skeleton (chef-admin)
- **Files (new):** `apps/chef-admin/src/app/dashboard/kitchen/page.tsx` (client) + `loading.tsx`.
- **Layout** (mirror growth conventions: card `rounded-xl border border-divider bg-white p-5 shadow-sm`, design tokens, lucide icons, reduced-motion, mobile-first):
  - **Service Control header:** Kitchen Load gauge (level badge + active count + outstanding prep minutes) and a **Pause/Resume** toggle. Toggle calls `POST`/`DELETE /api/kitchen/pause`; when paused, show a prominent banner ("New orders are paused — customers can't check out"). Optimistic update + refetch. When `level==='slammed'` and not paused, nudge to pause.
  - **Today's Prep Plan:** checklist table — item, suggested qty (+ `basis` hint), sold-today, daily limit, prep time; sold-out/unavailable rows de-emphasized. Ephemeral client "prepped" checkboxes (no persistence — existing-data-only).
  - **Live Prep Board:** aggregated make-list cards (item ×total across N orders; expandable to per-order qty + special instructions).
  - Fetches `GET /api/kitchen/overview`; ~30s periodic refetch + manual Refresh; `loading.tsx` skeleton like growth's `PageSkeleton`.
- **DoD:** all three sections + header render; Pause toggle round-trips and banner reflects `isPaused`.

### Task 5 [x] — Sidebar navigation entry
- **File:** `apps/chef-admin/src/components/layout/sidebar.tsx` — add a `Kitchen` item (`href:'/dashboard/kitchen'`) in `navItems` near Orders/Menu, with an SVG path icon consistent with existing stroke glyphs.
- **DoD:** nav item appears; active-state highlight works on `/dashboard/kitchen`.

### Task 6 [x] — Smoke-test wiring
- **File:** `apps/chef-admin/src/__tests__/platform-smoke.test.ts` — add assertions that the Kitchen page exists and the sidebar exposes the Kitchen nav (mirroring existing customers/growth assertions). Stay in the single smoke suite (no new test class).
- **DoD:** assertions added; suite green (or, if the known WSL/Windows Jest path issue blocks execution, verify by reading the asserted strings and record the infra limitation).

---

## Files Touched (summary)

| File | Change |
|------|--------|
| `apps/chef-admin/src/app/api/kitchen/pause/route.ts` *(new)* | POST/DELETE → engine pause/unpause (reuses `is_paused`) |
| `apps/chef-admin/src/lib/kitchen.ts` *(new)* | pure prep-plan / prep-board / load helpers + `KITCHEN_TZ` |
| `apps/chef-admin/src/lib/__tests__/kitchen.test.ts` *(new)* | helper unit tests (incl. edge/tz/load cases) |
| `apps/chef-admin/src/app/api/kitchen/overview/route.ts` *(new)* | overview data API |
| `apps/chef-admin/src/app/dashboard/kitchen/page.tsx` *(new)* | Kitchen Command page |
| `apps/chef-admin/src/app/dashboard/kitchen/loading.tsx` *(new)* | loading skeleton |
| `apps/chef-admin/src/app/api/kitchen/pause/__tests__/...` *(new)* | pause-route wiring/authz test |
| `apps/chef-admin/src/components/layout/sidebar.tsx` | Kitchen nav item |
| `apps/chef-admin/src/__tests__/platform-smoke.test.ts` | wiring assertions |

**No DB migrations. No `packages/engine` changes. No `apps/web` changes.**

## Reused (do not rebuild)

- `engine.kitchen.pauseStorefront`/`unpauseStorefront` + `canManageStorefront` (chef-owns-own) — Pause rides existing audited methods.
- `engine.kitchen.validateCustomerCheckoutReadiness` is_paused gate + `apps/web` checkout consumption — already blocks paused checkout end-to-end.
- Derived-view page pattern from `dashboard/growth/page.tsx` + `api/growth/route.ts` (`getChefActorContext`, `createAdminClient`, `successResponse`).
- `order_items → menu_items` join shape from `dashboard/orders/page.tsx`.
- `ACTIVE_ORDER_STATUSES`, `orders.estimated_prep_minutes`, `chef_storefronts.{max_queue_size,average_prep_minutes}`.

## Verification

1. **Type/lint:** `pnpm typecheck` and `pnpm lint` clean for chef-admin.
2. **Unit tests:** `kitchen.ts` helper tests + pause-route wiring test green (chef-admin Jest). If the known WSL/Windows Jest path issue blocks execution, fall back to source verification and record the limitation.
3. **Pause truly blocks orders (the hard requirement):** because Pause sets `is_paused`, customer checkout is already gated. Prove it: with the storefront paused via the new route, a customer `POST /api/checkout` returns 400 `STOREFRONT_PAUSED`; after Resume it proceeds past the readiness gate. Verify against a live target if available (Tier check below); otherwise document the existing engine enforcement at `kitchen.engine.ts:662` + `checkout/route.ts:334` as the guarantee.
4. **Browser E2E (MANDATORY — UI change).** 4-tier live-target probe (Tier 1: dev server on :3001; Tier 2: start chef-admin via `pnpm dev`, poll health; Tier 3: Vercel preview — repo deploys to `chef.ridendine.ca`; Tier 4: unit-only fallback only if 1–3 documented-fail). On `/dashboard/kitchen`: confirm the three sections render; **click Pause**, re-snapshot, confirm the paused banner + overview shows `isPaused:true`; click Resume and confirm it clears. Report snapshots, not "tests pass."
5. **Regression:** dashboard/orders/menu pages and the orders kitchen workflow still load and behave unchanged; sidebar active-states unaffected; ops pause/unpause semantics still intact (chef pause writes the same `is_paused` via the same audited path).

## Autonomous Decisions

- **Load bands** (idle / steady<0.5 / busy<0.85 / slammed≥0.85 of `max_queue_size`) are sensible defaults, tunable later.
- **"Prepped" checkboxes** on the Prep Plan are ephemeral client state (existing-data-only). Upgrade trigger: persisting prep state needs a new table (out of scope).
- **Lookback window** for same-weekday demand = ~28 days (up to 4 same-weekdays); adjustable constant.
- **`KITCHEN_TZ='America/Vancouver'`** as the single weekday basis (`SHORTCUT:`; trigger: per-storefront tz storage).
- **Pre-existing `accepting_orders` references** in storefront routes are left as-is (latent bug, unrelated to this feature) — flagged, not fixed.
