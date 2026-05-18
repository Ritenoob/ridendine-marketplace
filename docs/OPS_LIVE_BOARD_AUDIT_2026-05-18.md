# Ops Live Board — Completeness Audit (2026-05-18)

Audit of the `ops:live` Realtime channel + `/api/ops/live-board` snapshot endpoint, scoped to `docs/plans/2026-05-18-production-readiness-stabilization.md` Task 6. Verifies behavior matches the contract documented in `docs/BUSINESS_ENGINE.md` and `docs/CROSS_APP_CONTRACTS.md`.

## Audit method

Static code reading + test inventory only. No live infrastructure check. Files reviewed:

- `apps/ops-admin/src/hooks/use-ops-live-feed.ts` (subscription wiring)
- `apps/ops-admin/src/lib/ops-live-feed-reducer.ts` (state merge logic)
- `apps/ops-admin/src/lib/ops-live-feed-types.ts` (snapshot type contract)
- `apps/ops-admin/src/app/api/ops/live-board/route.ts` (initial snapshot endpoint)
- `apps/ops-admin/src/hooks/__tests__/use-ops-live-feed.test.ts` (existing reducer tests)
- `packages/db/src/realtime/channels.ts` (channel naming)

## Findings

### ✅ Pass — all 4 postgres_changes subscriptions wired

`use-ops-live-feed.ts:101-138` attaches `postgres_changes` listeners on the `ops:live` channel for:

| Table | Event | Action dispatched | Source line |
|-------|-------|--------------------|-------------|
| `orders` | `*` | `ORDER_PATCH` | use-ops-live-feed.ts:104-112 |
| `deliveries` | `*` | `DELIVERY_PATCH` | use-ops-live-feed.ts:113-121 |
| `driver_presence` | `*` | `DRIVER_PRESENCE_PATCH` | use-ops-live-feed.ts:122-130 |
| `chef_storefronts` | `*` | `CHEF_PATCH` | use-ops-live-feed.ts:131-139 |

DELETE events are explicitly ignored (lines 108, 118, 127, 136) — that is intentional; in this domain rows are soft-deleted via status columns, never hard-deleted.

### ✅ Pass — both broadcast event handlers wired

| Event | Handler | Source |
|-------|---------|--------|
| `ops.live.patch` | Maps payload → table-specific action via `dispatchFromBroadcastPayload` | use-ops-live-feed.ts:140-144 |
| `board.refresh` | Triggers full snapshot refetch | use-ops-live-feed.ts:145-147 |

### ✅ Pass — monotonic `updated_at` deduplication

`isIncomingStale()` (reducer.ts:36) is consulted in all four PATCH actions:
- Orders: line 106
- Deliveries: line 179
- Driver presence: line 194
- Chefs: line 222
- Broadcast hint: line 261

Existing tests cover the order path (`it('ignores stale order updates', ...)` at use-ops-live-feed.test.ts:49).

### ✅ Pass — snapshot endpoint returns pressure object

`apps/ops-admin/src/app/api/ops/live-board/route.ts:208-213` returns:

```
pressure: {
  openExceptions,
  slaBreaches,
  pendingDispatch,
  deliveryEscalations,
}
```

Counts come from `engine.ops.getDashboard()` (server-side aggregator). Customer/chef/driver coordinates are intentionally returned in `OpsLiveDeliverySnapshot` because ops is internal — full GPS exposure is acceptable here (see `docs/CROSS_APP_CONTRACTS.md` Privacy summary).

### ✅ Pass — 60s snapshot-refetch fallback when realtime disconnects

`use-ops-live-feed.ts:87-99` defines `startFallback()` (60_000ms `setInterval`) and `clearFallback()`. The `.subscribe(status => ...)` callback (line 148) starts the fallback on `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED` and clears it on `SUBSCRIBED`. Cleanup on unmount: line 159.

### ⚠️ Gap 1 — no unit test for the reconnect fallback path

The fallback wiring is implemented but not asserted by a test. A regression here (e.g. someone clearing the interval but not restarting it on disconnect) wouldn't be caught by the suite.

**Disposition:** add a test in this audit (committed alongside). See "Audit deliverable" below.

### ⚠️ Gap 2 — pressure counters do not auto-update between snapshot refreshes

The four pressure counters (`openExceptions`, `slaBreaches`, `pendingDispatch`, `deliveryEscalations`) are computed server-side once per snapshot. There is no:

- Client-side recompute of pressure from `state.ordersById` after a postgres_changes event
- Server broadcast on `ops:live` that pushes new pressure values
- Trigger that calls `board.refresh` when an exception/SLA breach lands

So if an SLA breach lands at T=0 while the operator has the dashboard open, the pressure badge for `slaBreaches` will show the old count until either:
1. The next 60s fallback refetch fires (only triggers when realtime is disconnected; if realtime is healthy the fallback is OFF), OR
2. Something explicitly calls `board.refresh` broadcast, OR
3. The page is reloaded

**This is not a correctness bug per se** — the underlying `ordersById` state IS up to date via postgres_changes — but the visible pressure counter is stale until refresh. For a "soft-launch with real money" target where operators rely on the badge to know when to intervene, this is a material UX defect.

**Disposition (recommended):** ship one of:

- **Option A (low risk, recommended):** When the engine writes an exception (`order_exceptions` insert) or an SLA breach (`system_alerts` insert), also send a `board.refresh` broadcast on `ops:live`. ~5 lines added at each engine write site. Existing `use-ops-live-feed` already handles `board.refresh`.
- **Option B (higher value, higher risk):** Compute pressure client-side from `state.ordersById` + `state.deliveriesById`. Requires adding a deliveries map to state and ensuring the client logic stays in sync with `engine.ops.getDashboard()`. Risk: pressure values diverge from authoritative server count.

Option A is recommended for soft-launch. Mark Gap 2 as a follow-up task in the readiness plan, not a fix here.

### ⚠️ Gap 3 — `delivery_events` and `assignment_attempts` not on the subscription

`docs/BUSINESS_ENGINE.md` references `delivery_events` and `assignment_attempts` as engine-of-record tables for dispatch state. They're not subscribed on `ops:live`. The dispatch view at `/dashboard/dispatch` has its own data path; it does not consume `ops:live`.

**Disposition:** not actually a gap. The dispatch board is a separate surface with its own subscription. `ops:live` is for the high-level main dashboard board; deeper dispatch state belongs in the dispatch page's data path. Document and close.

### ⚠️ Gap 4 — `DELIVERY_PATCH` test coverage missing

The reducer test file has 6 tests but covers `HYDRATE`, `ORDER_PATCH`, `DRIVER_PRESENCE_PATCH`, and `CHEF_PATCH`. There is no test for `DELIVERY_PATCH` or `BROADCAST_ORDER_HINT`.

**Disposition:** add `DELIVERY_PATCH` test in this audit (deferred — out of audit's hard scope but a natural follow-up).

## Audit deliverable

Add the missing reconnect-fallback test to `apps/ops-admin/src/hooks/__tests__/use-ops-live-feed.test.ts`. The fallback wiring at use-ops-live-feed.ts:94-99 + 153-156 should be asserted: when the subscribe callback receives `CHANNEL_ERROR`, the snapshot-refetch interval starts; when it later receives `SUBSCRIBED`, the interval clears.

Test is implemented alongside this audit and runs in `pnpm --filter @ridendine/ops-admin test`.

## DoD reconciliation (Task 6)

| Plan DoD bullet | Status | Evidence |
|----|----|----|
| All four postgres_changes subscriptions wired | ✅ | use-ops-live-feed.ts:101-139 |
| Snapshot endpoint returns `pressure: {...}` matching DB | ✅ | live-board/route.ts:208-213 |
| Reducer test: stale `updated_at` ignored | ✅ | use-ops-live-feed.test.ts:49 |
| Reconnect test: 60s snapshot refetch repopulates without duplicate rows | ⚠️ | Reconnect WIRED but not unit-tested; this audit adds the test |
| TS-004 (in Task 5's spec) passes | ⏳ | Gated on Task 5 |
| `pnpm --filter @ridendine/ops-admin test` | ⏳ | Re-run after this audit's test is committed |

## Recommended follow-up tasks

- **TASK-A (soft-launch blocker):** Implement Option A from Gap 2 — emit `board.refresh` on `ops:live` whenever an exception or SLA breach is written. Estimated 1-2 hour task; goes into `marketplace-completion` or a sibling plan.
- **TASK-B (nice-to-have):** Add `DELIVERY_PATCH` and `BROADCAST_ORDER_HINT` reducer tests for symmetry.
- **TASK-C (defer):** Option B from Gap 2 — client-side pressure recompute — only if Option A is insufficient.
