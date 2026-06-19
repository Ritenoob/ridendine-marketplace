# Kitchen Live Order Queue Implementation Plan

Created: 2026-06-19
Author: sean@cashflowarmy.com
Agent: Claude Code
Status: VERIFIED
Approved: No
Iterations: 0
Worktree: No
Type: Feature

## Context

The chef-admin **Kitchen Command** page (`/dashboard/kitchen`) gives the chef a prep plan, a load gauge, a service pause control, and a cook-by-item prep board — but **no live ticket queue**. To accept, start, or complete an individual order the chef must leave the kitchen surface and go to the separate **Orders** page (`/dashboard/orders`, `OrdersList`). During a rush, that context switch is exactly the friction this work removes: the goal is to "make it easy to track the entire kitchen for the chef" from one surface.

`OrdersList` already solves three of the four requested capabilities, but **only on the Orders page**: Supabase realtime (instant new-order insert + live updates), a new-order audio cue + in-app toast, and one-tap status actions. What is missing everywhere:

1. A **live order ticket queue on the Kitchen Command page** itself.
2. A **per-order prep countdown** that ticks every second and turns **red when overdue**. The existing `CountdownTimer` (`orders-list.tsx:108`) is an *accept-deadline* timer (8 min from `created_at`, auto-rejects on expiry); `getReadyTiming()` is static text recomputed only on refetch — neither is a live cook/prep countdown.
3. A **working** audio alert — `OrdersList` plays `/sounds/new-order.mp3`, but **that file does not exist** (`apps/chef-admin/public/sounds/` is absent), so the cue is silently a no-op today.

> ⚠️ **Countdown data correction (from spec-review).** `estimated_ready_at` is **never written by any chef transition** — verified in `packages/engine/src/orchestrators/master-order-engine.ts`: `chefAccept` (line 385) persists only `estimated_prep_minutes` (a duration), `markPreparing` (line 410) persists `prep_started_at`, `markReadyForPickup` persists `ready_at`. The `transitionOrder` update map (lines 288–298) has no `estimated_ready_at` branch; the column is populated only by seed data. **Therefore the prep countdown must derive its target from real written data:** prefer `estimated_ready_at` when present (seeded/legacy/any future write), else for a `preparing` order compute `prep_started_at + estimated_prep_minutes` (the live cook timer — exactly when a countdown matters most). An `accepted`-not-yet-started order shows its prep estimate statically; the live clock begins when the chef taps **Start Preparing**. This is a client-side computation over already-persisted fields — **no central-engine change, no new tables/migrations.**

This plan adds the live queue to the kitchen surface, reusing the proven realtime/action/toast infrastructure (extracted into one shared hook so it is not duplicated), adds the live cook countdown described above, and replaces the broken audio-file dependency with a dependency-free Web Audio chime.

## Summary

**Goal:** Give chefs a live, ticket-based order queue on the chef-admin Kitchen Command page with one-tap status actions, per-order cook/prep countdown timers that turn red when overdue, instant Supabase realtime updates, and new-order alerts (Web Audio chime + in-app toast + header badge) — reusing the existing order-action, realtime, and kitchen-workflow infrastructure. **Browser push notifications are deferred (YAGNI):** the always-on chime + toast + badge fully satisfy "new order alerts"; a permission-gated `Notification` adds prompt UI and branch surface beyond the literal request and can be added later if a loud-kitchen / background-tab need is confirmed.

---

## Current State (verified)

| Capability | Today | File |
|-----------|-------|------|
| Realtime orders subscription (storefront-scoped, fail-closed parse, hydrate) | ✅ Orders page only | `apps/chef-admin/src/components/orders/orders-list.tsx:188` |
| New-order audio cue | ⚠️ references missing `/sounds/new-order.mp3` → silent no-op | `orders-list.tsx:270` |
| New-order toast | ✅ Orders page only | `orders-list.tsx` + `components/orders/order-toast.tsx` |
| One-tap status actions (accept/reject/start/ready) | ✅ via shared `KITCHEN_NEXT_TRANSITION` + PATCH | `orders-list.tsx`, `packages/utils/src/order-workflow.ts` |
| Accept-deadline countdown (8 min → auto-reject) | ✅ Orders page only | `orders-list.tsx:108` |
| **Live cook/prep countdown** | ❌ none (only static `getReadyTiming` text) | — |
| **Ticket queue on Kitchen Command page** | ❌ none (prep plan + cook-by-item board only) | `apps/chef-admin/src/app/dashboard/kitchen/page.tsx` |
| Kitchen data endpoint | returns `load`/`prepPlan`/`prepBoard`/`service` | `apps/chef-admin/src/app/api/kitchen/overview/route.ts` |
| Order action API | PATCH dispatcher (`accept`/`reject`/`start_preparing`/`mark_ready`) + GET full hydrate | `apps/chef-admin/src/app/api/orders/[id]/route.ts` |
| Realtime primitives | `chefStorefrontOrdersChannel`, `createBrowserClient`, `parseOrdersRealtimeRow` (parses `status`, `prep_started_at`, `estimated_ready_at`) | `packages/db/src/realtime/`, `packages/db/src/client/browser.ts` |
| Engine timing writes | `estimated_prep_minutes` @ accept, `prep_started_at` @ start, `ready_at` @ ready — **never `estimated_ready_at`** | `packages/engine/src/orchestrators/master-order-engine.ts:288,377-427` |

### Reuse (no reinvention)
- **Realtime:** `chefStorefrontOrdersChannel(storefrontId)`, `parseOrdersRealtimeRow`, `createBrowserClient` from `@ridendine/db`.
- **Actions/labels:** `KITCHEN_NEXT_TRANSITION`, `KITCHEN_REJECT_TRANSITION`, `KitchenActionableStatus`, `getKitchenWorkflowStep`, `formatCurrency` from `@ridendine/utils`; PATCH `/api/orders/[id]`.
- **UI:** `Card`, `Badge`, `Button`, `LiveIndicator`, `ORDER_STATUS_LABELS` from `@ridendine/ui`; `OrderToast` from `components/orders/order-toast.tsx`.
- **Kitchen data:** extend the existing `/api/kitchen/overview` active-orders query (already fetched for the prep board) rather than adding a new endpoint.

---

## Autonomous Decisions

1. **Surface the queue ON the Kitchen Command page**, alongside (not replacing) the prep plan and cook-by-item board, placed high (most time-sensitive). Leave the Orders-page `OrdersList` as the detailed order log.
2. **Extract one shared realtime hook** (`useStorefrontOrdersRealtime`) and refactor `OrdersList` to consume it, so the kitchen queue does not duplicate ~80 lines of subscription/hydration logic (which the `/code-review` "re-implements existing code" pass would flag). **The hook's own unit test owns realtime-behavior coverage** (the existing `orders-list-readiness.test.tsx` mocks `channel.on` as a no-op and never delivers a payload, so it does **not** cover the extracted path — Task 1 adds real coverage and an OrdersList parity assertion; see Task 1 tests).
3. **Web Audio chime, not an mp3 asset** — `playNewOrderChime()` synthesizes a short two-tone beep via `AudioContext`; no binary committed, no missing-file failure. The same util replaces the broken `new Audio('/sounds/new-order.mp3')` call in `OrdersList`.
4. **Browser push notifications deferred (YAGNI).** Always-on chime + toast + header badge deliver "new order alerts." A permission-gated `Notification` is the one piece outside the literal request; defer until a confirmed loud-kitchen / background-tab need.
5. **Extend `/api/kitchen/overview`** with a `tickets[]` array + `storefrontId` (reusing its existing active-orders query) for initial render; realtime keeps the queue live between the page's existing 30s reconciliation poll.
6. **Cook/prep countdown target resolution (real data only):** prefer `estimated_ready_at` when non-null; else if `status === 'preparing'` and `prep_started_at` and `estimated_prep_minutes` → `prep_started_at + estimated_prep_minutes·60000`; else (e.g. `accepted`, not started) show the prep estimate statically; else "No prep estimate". `pending` orders are pinned to the top with a "New — accept" indicator.

---

## Progress Tracking

Tasks: 6 | Completed: 6 | Remaining: 0

- [x] Task 1: Extract shared `useStorefrontOrdersRealtime` hook; refactor `OrdersList`; add real realtime coverage
- [x] Task 2: `sound.ts` — `playNewOrderChime()` (Web Audio); swap into `OrdersList`
- [x] Task 3: `PrepCountdown` live timer component (target resolution per Decision #6; green -> amber -> red/overdue)
- [x] Task 4: Extend `/api/kitchen/overview` with `tickets[]` + `storefrontId` (pure `mapActiveOrdersToTickets` in `kitchen.ts`)
- [x] Task 5: `KitchenOrderQueue` component (hook + chime + countdown + actions + toast + badge; in-flight-aware reconcile)
- [x] Task 6: Mount `KitchenOrderQueue` on the Kitchen Command page; merge realtime with the 30s poll

---

## Tasks

### Task 1 — Shared realtime hook + real coverage
**Files:** `apps/chef-admin/src/hooks/use-storefront-orders-realtime.ts` (new), `apps/chef-admin/src/hooks/__tests__/use-storefront-orders-realtime.test.ts` (new), `apps/chef-admin/src/components/orders/orders-list.tsx` (refactor), `apps/chef-admin/src/__tests__/orders-list-readiness.test.tsx` (extend mock to deliver a realtime event)

Extract the realtime subscription from `OrdersList` into a hook:
```ts
useStorefrontOrdersRealtime(storefrontId: string | null, {
  onInsert(order),          // hydrated full order (or parsed row if hydrate disabled)
  onUpdate(order),
  onConnectionChange(status),
  hydrate?: boolean,        // default true → fetch /api/orders/:id and emit the full order
})
```
Preserve EXACTLY today's behavior: channel `chefStorefrontOrdersChannel(storefrontId)`, `event: '*'` postgres_changes filtered `storefront_id=eq.{id}`, fail-closed `parseOrdersRealtimeRow` (ignore malformed rows, never tear down the channel), best-effort hydrate via `/api/orders/:id`, connection-status mapping (SUBSCRIBED→connected, CHANNEL_ERROR/TIMED_OUT/CLOSED→disconnected, else connecting), channel cleanup on unmount / storefront change. Refactor `OrdersList` to drive `setOrders`/`addToast`/sound/`setRealtimeStatus` from the hook callbacks; delete its inline subscription `useEffect`.

- **DoD:** `OrdersList` behavior unchanged (insert prepend + hydrate, toast, sound, live indicator); inline subscription removed; `tsc --noEmit` clean.
- **Tests:**
  - **Hook unit test (owns realtime coverage):** mock `createBrowserClient` channel + `fetch` — a delivered INSERT calls `onInsert` with the hydrated order; UPDATE calls `onUpdate`; a malformed payload is ignored (no callback) and the channel is **not** removed; connection states map correctly; unmount calls `removeChannel`.
  - **OrdersList parity:** extend `orders-list-readiness.test.tsx` so the mocked channel **captures** the `postgres_changes` handler and the test delivers a synthetic INSERT — assert the new order is prepended, a toast appears, and the chime is triggered. (Today's mock fires `SUBSCRIBED` only and never invokes the handler; that gap is why parity needs this.)
- **Verify:** `npm test -- use-storefront-orders-realtime orders-list-readiness --silent`; `tsc --noEmit`.

### Task 2 — Web Audio chime util
**Files:** `apps/chef-admin/src/lib/sound.ts` (new), `apps/chef-admin/src/lib/__tests__/sound.test.ts` (new), `orders-list.tsx` (swap broken mp3 call)

`playNewOrderChime(): void` — lazily create/resume a shared `AudioContext`, play a short two-tone oscillator beep, no-op gracefully when `AudioContext` is unavailable or autoplay is blocked (try/catch, `console.debug`). Replace `new Audio('/sounds/new-order.mp3')` in `OrdersList` with `playNewOrderChime()`.
- **DoD:** new-order cue audible after a user gesture; no missing-asset dependency; nothing throws on unsupported browsers.
- **Tests:** Unit — mock `window.AudioContext`: chime creates + starts an oscillator; a missing `AudioContext` does not throw.
- **Verify:** `npm test -- sound --silent`; `tsc --noEmit`.

### Task 3 — Live cook/prep countdown component
**Files:** `apps/chef-admin/src/components/kitchen/prep-countdown.tsx` (new), `apps/chef-admin/src/components/kitchen/__tests__/prep-countdown.test.tsx` (new)

`PrepCountdown({ estimatedReadyAt, prepStartedAt, estimatedPrepMinutes, status })` — resolve the target timestamp per **Decision #6**, then a single `setInterval(1000)` (cleared on unmount) derives state from `Date.now()` each tick (no drift accumulation):
- target present, `> ~5 min` left → `text-primary`, "Ready in M:SS"
- target present, `0 < t ≤ ~5 min` → `text-warning`
- target present, `≤ 0` → `text-danger`, "Mm over"; pulse only when `prefers-reduced-motion` is unset
- no target but `estimatedPrepMinutes` present (accepted, not started) → muted "Prep ~Nm"
- otherwise → muted "No prep estimate"
- **DoD:** thresholds cross green→amber→red correctly; overdue shows minutes over; `preparing` order with `prep_started_at` past its prep window renders the red overdue state; reduced-motion respected; `aria-label` summary with `aria-live="off"`.
- **Tests:** Component (fake timers) — (a) a `preparing` order whose `prep_started_at + estimatedPrepMinutes` is in the future shows green "Ready in"; (b) the same past its window shows red "over"; (c) an `accepted` order with no `prep_started_at` shows "Prep ~Nm"; (d) no estimate → "No prep estimate".
- **Verify:** `npm test -- prep-countdown --silent`.

### Task 4 — Kitchen tickets in the overview endpoint
**Files:** `apps/chef-admin/src/lib/kitchen.ts` (+`mapActiveOrdersToTickets`, `KitchenTicket`; widen `ActiveOrder` with **optional** fields), `apps/chef-admin/src/lib/__tests__/kitchen.test.ts` (extend), `apps/chef-admin/src/app/api/kitchen/overview/route.ts` (widen active-orders select + **single batched** customer query + add `tickets` & `storefrontId` to payload)

Widen the active-orders select to exactly:
```
'id, order_number, status, created_at, special_instructions, customer_id, estimated_ready_at, estimated_prep_minutes, prep_started_at, order_items ( quantity, special_instructions, menu_item:menu_items ( id, name ) )'
```
Resolve customer names with **one batched query** — `adminClient.from('customers').select(...).in('id', customerIds)` — mirroring the customer-name resolution in `apps/chef-admin/src/app/api/orders/route.ts` (reuse its exact column/name logic; do not invent fields). Build `customersById`, then `mapActiveOrdersToTickets(activeOrders, customersById): KitchenTicket[]` (pure). Append `tickets` and `storefrontId` to the `successResponse` payload — additive; `load`/`prepPlan`/`prepBoard`/`service` unchanged.

Widen `ActiveOrder` with the new fields **all optional/nullable** so the historical-orders cast (`route.ts:74`) and the existing consumers — `computeKitchenLoad`, `aggregatePrepBoard` (verified to read only `id`/`estimated_prep_minutes`/`order_items` at `kitchen.ts:188,221`) — are unaffected:
```ts
interface KitchenTicket {
  id; orderNumber; status; createdAt;
  prepStartedAt: string | null; estimatedReadyAt: string | null; estimatedPrepMinutes: number | null;
  specialInstructions: string | null; customerName: string | null;
  items: { name: string; quantity: number; specialInstructions: string | null }[];
  totalQty: number;
}
```
- **DoD:** `/api/kitchen/overview` returns `tickets` (active orders with item lines, customer name, and all countdown inputs) and `storefrontId`; existing payload fields unchanged; customer enrichment is a single query (no N+1).
- **Tests:** Unit — `mapActiveOrdersToTickets` maps fields, sums `totalQty`, carries `prepStartedAt`/`estimatedPrepMinutes`/`estimatedReadyAt`, handles missing customer/menu_item (pure function, no DB mock).
- **Verify:** `npm test -- kitchen --silent`; `tsc --noEmit`.

### Task 5 — KitchenOrderQueue component
**Files:** `apps/chef-admin/src/components/kitchen/kitchen-order-queue.tsx` (new), `apps/chef-admin/src/components/kitchen/__tests__/kitchen-order-queue.test.tsx` (new)

`KitchenOrderQueue({ tickets, storefrontId })` — compact, glanceable ticket cards:
- **Sort:** `pending` pinned first; then by resolved countdown target (overdue/most-negative first; "No ETA"/accepted-not-started sort last).
- Each card: order number + `Badge` status + qty×item summary + special-instructions note + prominent `PrepCountdown` (fed `prepStartedAt`/`estimatedReadyAt`/`estimatedPrepMinutes`/`status`) + one-tap primary action (`KITCHEN_NEXT_TRANSITION[status]`) and `Reject` for `pending`. Optimistic PATCH to `/api/orders/:id` with per-button disabling; revert + error surface on failure.
- Uses `useStorefrontOrdersRealtime` (Task 1): on INSERT → prepend + `playNewOrderChime()` + `addToast` + bump a header "new" badge; on UPDATE → **merge by id** (preserve `estimated_prep_minutes`, which the thin realtime row omits); drop orders that leave the active statuses. `LiveIndicator` shows connection state.
- **In-flight-aware reconcile (fixes the poll-clobber window):** seed queue state from the `tickets` prop; on each poll, reconcile by id rather than blanket-resetting — keep local/optimistic state for any order with an in-flight (or just-completed, <~3s) action; otherwise adopt the poll snapshot; remove ids no longer in the active set. This prevents a just-advanced status button from visibly reverting for up to 30s.
- **DoD:** queue renders sorted tickets with live countdowns and working actions; a new realtime order chimes + toasts + appears instantly; an optimistic status advance is not reverted by the next poll; connection indicator reflects state.
- **Tests:** Component (1 functional) — renders tickets in urgency order; clicking the primary action PATCHes `/api/orders/:id` with the correct `action` (mock `fetch`) and optimistically advances status; a subsequent stale-poll `tickets` prop with the old status does **not** revert the in-flight order.
- **Verify:** `npm test -- kitchen-order-queue --silent`; `tsc --noEmit`.

### Task 6 — Mount on the Kitchen Command page
**Files:** `apps/chef-admin/src/app/dashboard/kitchen/page.tsx` (add `tickets` + `storefrontId` to `OverviewPayload`, render `KitchenOrderQueue`)

Add `tickets: KitchenTicket[]` and `storefrontId: string` to the page's `OverviewPayload`; the existing 30s poll now also reconciles the queue. Render `<KitchenOrderQueue tickets={data.tickets} storefrontId={data.storefrontId} />` as a new "Live Order Queue" section above the Prep Plan (most time-sensitive first).
- **DoD:** Kitchen Command page shows the live queue; new orders appear instantly with sound; countdowns tick and redden when overdue; the 30s poll reconciles via the in-flight-aware merge (no visible status revert).
- **Tests:** covered by the Task 5 component test + the browser E2E below.
- **Verify:** build + browser E2E (see Verification).

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Refactoring VERIFIED `OrdersList` (Task 1) regresses Orders-page realtime | Hook unit test owns realtime coverage; `orders-list-readiness` extended to deliver a real INSERT and assert prepend+toast+chime (today's mock never fires the handler). Behavior parity is the DoD. |
| Countdown target is null for real orders (`estimated_ready_at` unwritten) | **Resolved by design:** target derives from `prep_started_at + estimated_prep_minutes` (verified written by `markPreparing`/`chefAccept`), preferring `estimated_ready_at` only if present. E2E asserts a real `preparing` order shows a live numeric countdown. |
| Realtime update overwritten by a stale 30s poll → button visibly reverts | In-flight-aware reconcile (Task 5): keep optimistic/realtime state for orders with an in-flight or just-completed action; adopt poll only for untouched rows. |
| `storefront_id` unavailable client-side for channel scoping | Task 4 adds `storefrontId` to the overview payload explicitly. |
| Widening `ActiveOrder` breaks existing kitchen consumers | New fields declared optional/nullable; consumers verified to read only `id`/`estimated_prep_minutes`/`order_items` (`kitchen.ts:188,221`). |
| Autoplay policy blocks the chime before any user gesture | `AudioContext` created/resumed on first action click; chime best-effort, never throws. |
| Customer enrichment N+1 | Single batched `in('id', customerIds)` query mirroring `/api/orders`. |

## Goal Verification

- Live ticket queue on `/dashboard/kitchen` with one-tap accept/start/ready/reject → Task 5/6 + browser E2E.
- Per-order countdown ticks and turns red when overdue, **for a real `preparing` order** (not the null/"No estimate" state) → Task 3 tests + E2E.
- New order appears instantly via Supabase realtime (no 30s wait) → Task 1 hook coverage + E2E.
- New-order audio + toast + badge fires → Task 2 + Task 5.
- No new tables/migrations, no central-engine change; existing endpoints/utilities reused → diff review.

## Verification (E2E)

Runtime profile: **Full** (UI). chef-admin runs on port **3001**.

1. **Automated:** `npm test --silent` (chef-admin + utils suites, 0 failures), `tsc --noEmit` (0 errors), `eslint`.
2. **Live-target probe** (per verification rules — WSL cannot reach Windows-path `node_modules`, so record each tier's outcome): Tier 1 health-check a running `:3001`; Tier 2 attempt `pnpm --filter chef-admin dev` in background, poll `:3001` up to 60s; Tier 3 detect deploy backends (`vercel.json`) → `vercel whoami` → preview deploy if logged in (clean up after); Tier 4 `UNIT_VERIFIED` fallback only if Tiers 1–3 all documented-fail.
3. **Browser E2E** (tier per `browser-automation.md`): open `/dashboard/kitchen` → confirm the Live Order Queue renders active tickets sorted by urgency → click **Start Preparing** on an accepted order → re-snapshot, confirm status advanced AND a live numeric countdown now ticks (proves the `prep_started_at + estimated_prep_minutes` path, not "No prep estimate") → trigger/accept an order and confirm it appears instantly with chime + toast → confirm a just-advanced status does not revert within 30s → let a preparing ticket pass its prep window and confirm the countdown turns red "over". Report observed snapshot evidence, not "tests pass".

---

_Plan ready for review._
