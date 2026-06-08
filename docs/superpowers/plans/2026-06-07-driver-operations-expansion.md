# Driver Operations Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Driver app into a connected operational tool covering live delivery work, driver earnings, approval/compliance, and Ops dashboard visibility without breaking existing customer, chef, driver, or ops flows.

**Architecture:** Build on the existing Driver app, Ops driver dashboard, `@ridendine/engine`, `@ridendine/db`, and cross-app contracts. Driver-specific features stay under `apps/driver-app`; Ops governance and monitoring stay under `apps/ops-admin`; shared eligibility/readiness types and pure helpers live in shared packages so both apps show the same truth.

**Tech Stack:** Next.js App Router, React 18, Supabase, `@ridendine/engine`, `@ridendine/db`, `@ridendine/types`, `@ridendine/validation`, Jest, Testing Library, PowerShell verification scripts, production smoke scripts.

---

## Non-Negotiable Safety Rules

- Each phase must pass Driver app tests before integration.
- Each phase must pass the relevant Ops tests before integration.
- Each phase must preserve `getDriverActorContext()` approval gating: dispatch actions require `drivers.status = 'approved'`.
- No driver feature may bypass `@ridendine/engine` state transitions for delivery, dispatch, payout, or governance actions.
- No customer-facing surface may receive raw driver coordinates. Keep using sanitized customer broadcasts documented in `docs/CROSS_APP_CONTRACTS.md`.
- Ops may see raw driver GPS because Ops is internal and already documented as the internal control surface.
- Every new Driver app API route must have tests for unauthenticated access, non-owner access where relevant, validation failure, and success.
- Every phase ends with:

```powershell
. .\scripts\tools\ensure-node-pnpm.ps1
$tool = Use-RidendineNodePnpm -Quiet
& $tool.PnpmCmd --filter @ridendine/driver-app test
& $tool.PnpmCmd --filter @ridendine/driver-app typecheck
& $tool.PnpmCmd --filter @ridendine/ops-admin typecheck
& $tool.PnpmCmd test:wiring-fixes
& $tool.PnpmCmd smoke:prod:contracts -- --require-auth
```

Expected: all commands exit `0`.

---

## Existing Connected Surfaces To Preserve

- Driver approval and suspension:
  - `apps/ops-admin/src/app/dashboard/drivers/page.tsx`
  - `apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx`
  - `apps/ops-admin/src/app/api/drivers/[id]/route.ts`
  - `packages/engine/src/orchestrators/platform.engine.ts`
- Driver dispatch eligibility:
  - `packages/engine/src/server.ts`
  - `packages/engine/src/orchestrators/driver-matching.service.ts`
  - `apps/driver-app/src/app/api/driver/presence/route.ts`
  - `apps/driver-app/src/app/api/location/route.ts`
- Driver delivery workflow:
  - `apps/driver-app/src/app/components/DriverDashboard.tsx`
  - `apps/driver-app/src/components/offer-alert.tsx`
  - `apps/driver-app/src/app/delivery/[id]/components/DeliveryDetail.tsx`
  - `apps/driver-app/src/app/api/deliveries/[id]/route.ts`
  - `apps/driver-app/src/app/api/deliveries/[id]/issue/route.ts`
  - `apps/driver-app/src/app/api/deliveries/[id]/proof/route.ts`
- Driver earnings and payout:
  - `apps/driver-app/src/app/earnings/components/EarningsView.tsx`
  - `apps/driver-app/src/app/settings/settings-client.tsx`
  - `apps/driver-app/src/app/api/earnings/route.ts`
  - `apps/driver-app/src/app/api/payouts/instant/route.ts`
  - `apps/ops-admin/src/app/dashboard/finance/instant-payouts/page.tsx`
- Ops live board and GPS visibility:
  - `apps/ops-admin/src/app/api/ops/live-board/route.ts`
  - `apps/ops-admin/src/hooks/use-ops-live-feed.ts`
  - `apps/ops-admin/src/lib/location-health.ts`
  - `apps/ops-admin/src/components/map/live-map.tsx`

---

## File Structure

### Create

- `packages/types/src/domains/driver-operations.ts`
  - Shared readonly types for driver readiness, shift summary, offer summary, delivery task state, earnings summary, and Ops driver signal cards.
- `packages/validation/src/schemas/driver-operations.ts`
  - Zod schemas for readiness refresh, offer action reasons, driver settings, and notification preferences.
- `apps/driver-app/src/lib/driver-readiness.ts`
  - Pure client/server-safe helpers that compute readiness labels from driver status, presence, GPS freshness, active delivery, payout status, and compliance status.
- `apps/driver-app/src/app/api/driver/readiness/route.ts`
  - Driver-owned readiness endpoint.
- `apps/driver-app/src/app/api/driver/notification-preferences/route.ts`
  - DB-backed notification preferences endpoint.
- `apps/driver-app/src/app/api/driver/shift/route.ts`
  - Driver shift summary endpoint backed by presence and delivery history.
- `apps/ops-admin/src/lib/driver-operations.ts`
  - Ops-side formatter for the same readiness and operations signals.
- `apps/ops-admin/src/app/api/drivers/[id]/operations/route.ts`
  - Ops read endpoint for one driver's readiness, active work, location health, earnings snapshot, exceptions, and compliance state.
- `apps/driver-app/src/__tests__/driver-readiness.test.ts`
- `apps/driver-app/src/__tests__/driver-readiness-route.test.ts`
- `apps/driver-app/src/__tests__/notification-preferences-route.test.ts`
- `apps/driver-app/src/__tests__/driver-shift-route.test.ts`
- `apps/ops-admin/src/__tests__/driver-operations-route.test.ts`
- `apps/ops-admin/src/__tests__/driver-operations-panel.test.tsx`

### Modify

- `packages/types/src/domains/driver.ts`
- `packages/types/src/index.ts`
- `packages/validation/src/index.ts`
- `apps/driver-app/src/app/components/DriverDashboard.tsx`
- `apps/driver-app/src/components/offer-alert.tsx`
- `apps/driver-app/src/app/delivery/[id]/components/DeliveryDetail.tsx`
- `apps/driver-app/src/app/earnings/components/EarningsView.tsx`
- `apps/driver-app/src/app/settings/settings-client.tsx`
- `apps/driver-app/src/components/settings/notification-preferences.tsx`
- `apps/driver-app/src/hooks/use-location-tracker.ts`
- `apps/driver-app/src/app/api/offers/route.ts`
- `apps/driver-app/src/app/api/earnings/route.ts`
- `apps/driver-app/src/app/api/driver/route.ts`
- `apps/ops-admin/src/app/dashboard/drivers/page.tsx`
- `apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx`
- `apps/ops-admin/src/app/dashboard/drivers/[id]/driver-governance-actions.tsx`
- `apps/ops-admin/src/app/api/drivers/route.ts`
- `apps/ops-admin/src/lib/location-health.ts`
- `docs/CROSS_APP_CONTRACTS.md`
- `docs/LAUNCH_CHECKLIST.md`

---

## Phase 1: Shared Driver Operations Model

**Purpose:** Create one shared language for Driver and Ops. This prevents the Driver app from saying "ready" while Ops says "not dispatchable."

**Status:** Completed on 2026-06-07. Verified with focused readiness tests, Driver app tests, Driver app lint, Driver app typecheck, Types package typecheck, and `git diff --check`.

**Files:**
- Create: `packages/types/src/domains/driver-operations.ts`
- Modify: `packages/types/src/index.ts`
- Create: `apps/driver-app/src/lib/driver-readiness.ts`
- Test: `apps/driver-app/src/__tests__/driver-readiness.test.ts`

- [x] **Step 1: Add failing tests for readiness states**

Create `apps/driver-app/src/__tests__/driver-readiness.test.ts` with cases for:
- approved + online + GPS under 5 minutes old = `ready`
- approved + online + no GPS = `needs_location`
- approved + stale GPS over 90 seconds = `not_dispatchable`
- pending driver = `not_approved`
- suspended driver = `suspended`
- active delivery + offline = `active_delivery_risk`
- payout account not started = `payout_setup_needed`

Run:

```powershell
pnpm --filter @ridendine/driver-app test -- driver-readiness.test.ts
```

Expected: fail because helper does not exist.

- [x] **Step 2: Add shared operations types**

Create `packages/types/src/domains/driver-operations.ts` with:

```ts
export type DriverReadinessStatus =
  | 'ready'
  | 'needs_location'
  | 'not_dispatchable'
  | 'not_approved'
  | 'suspended'
  | 'active_delivery_risk'
  | 'payout_setup_needed';

export interface DriverReadinessSignal {
  status: DriverReadinessStatus;
  label: string;
  detail: string;
  blocksDispatch: boolean;
  priority: 'success' | 'warning' | 'danger' | 'idle';
}

export interface DriverOperationsSummary {
  driverId: string;
  approvalStatus: string;
  presenceStatus: 'offline' | 'online' | 'busy' | string;
  readiness: DriverReadinessSignal;
  lastLocationAt: string | null;
  activeDeliveryCount: number;
  availableBalanceCents: number;
  instantPayoutsEnabled: boolean;
  complianceOpenItems: number;
}
```

Export it from `packages/types/src/index.ts`.

- [x] **Step 3: Implement readiness helper**

Create `apps/driver-app/src/lib/driver-readiness.ts` with a pure `getDriverReadinessSignal(input)` function. Use the same 90-second dispatch freshness threshold used by `packages/engine/src/orchestrators/driver-matching.service.ts`.

- [x] **Step 4: Verify Phase 1**

Run:

```powershell
pnpm --filter @ridendine/driver-app test -- driver-readiness.test.ts
pnpm --filter @ridendine/types typecheck
pnpm --filter @ridendine/driver-app typecheck
```

Expected: all pass.

---

## Phase 2: Driver Readiness API And Dashboard

**Purpose:** Replace the basic online/offline experience with a real "Ready to work" panel.

**Status:** Completed on 2026-06-07. Verified with readiness route tests, dashboard readiness tests, location tracker tests, full Driver app tests, Driver app lint, Driver app typecheck, Ops app typecheck, `test:wiring-fixes`, refreshed runtime wiring docs, and production contract smoke.

**Files:**
- Create: `apps/driver-app/src/app/api/driver/readiness/route.ts`
- Modify: `apps/driver-app/src/app/components/DriverDashboard.tsx`
- Modify: `apps/driver-app/src/hooks/use-location-tracker.ts`
- Test: `apps/driver-app/src/__tests__/driver-readiness-route.test.ts`
- Test: `apps/driver-app/src/__tests__/driver-dashboard-empty-state.test.tsx`

- [x] **Step 1: Add route tests**

Test that `GET /api/driver/readiness`:
- returns `401` when no driver session exists
- returns pending/suspended status when `requireApproved: false` context exists
- returns active delivery count
- returns GPS freshness from `driver_presence.last_location_at` or `last_location_update`
- returns payout readiness from `driver_payout_accounts` and `drivers.instant_payouts_enabled`

- [x] **Step 2: Implement readiness endpoint**

Use `getDriverActorContext({ requireApproved: false })` so pending drivers can see why they are blocked. Query:
- `drivers`
- `driver_presence`
- active `deliveries`
- `driver_payout_accounts`
- `driver_documents`
- `platform_accounts` for driver payable balance

Return a `DriverOperationsSummary`.

- [x] **Step 3: Upgrade dashboard**

Modify `DriverDashboard.tsx` to show:
- approval state
- online state
- GPS freshness
- "Dispatch ready" or exact blocker
- active delivery risk if trying to go offline mid-delivery
- retry location button when GPS is blocked or stale

- [x] **Step 4: Improve location tracking feedback**

Modify `use-location-tracker.ts` so it returns:
- `lastLocation`
- `lastPostedAt`
- `permissionState`
- `locationError`
- `isPosting`

Keep existing POST cadence unchanged.

- [x] **Step 5: Verify Phase 2**

Run:

```powershell
pnpm --filter @ridendine/driver-app test -- driver-readiness-route.test.ts driver-dashboard-empty-state.test.tsx
pnpm --filter @ridendine/driver-app typecheck
```

Expected: all pass.

---

## Phase 3: Offer Decision Support

**Purpose:** Help drivers make faster, safer offer decisions while keeping dispatch state server-owned.

**Status:** Completed on 2026-06-07. Verified with engine offer broadcast tests, driver offer route/card tests, Driver app lint, Driver app typecheck, Engine typecheck, Ops app typecheck, `test:wiring-fixes`, and authenticated production contract smoke.

**Files:**
- Modify: `apps/driver-app/src/components/offer-alert.tsx`
- Modify: `apps/driver-app/src/app/api/offers/route.ts`
- Test: `apps/driver-app/src/__tests__/offers-route.test.ts`
- Create: `apps/driver-app/src/__tests__/offer-alert.test.tsx`

- [x] **Step 1: Extend offer route tests**

Add tests that the offer payload can include:
- storefront name
- order number
- customer tip
- payout
- distance
- route seconds
- expires at

Keep coordinate keys out of driver offer broadcast payloads unless the driver owns the delivery after accept.

- [x] **Step 2: Add offer alert component tests**

Test that `OfferAlert` renders:
- countdown
- payout
- distance
- pay per km
- pickup address
- dropoff address
- restaurant/storefront name when present
- error message for expired or already accepted offer

- [x] **Step 3: Improve offer UI**

Modify `offer-alert.tsx` to show:
- "Pickup from"
- "Deliver to"
- estimated route time
- payout per km
- tip included when available
- clear accept and decline loading states
- reasoned decline options: too far, unsafe, busy, other

- [x] **Step 4: Verify Phase 3**

Run:

```powershell
pnpm --filter @ridendine/driver-app test -- offers-route.test.ts offer-alert.test.tsx
pnpm --filter @ridendine/driver-app typecheck
```

Expected: all pass.

---

## Phase 4: Delivery Command Center

**Purpose:** Make every active delivery a guided workflow: pickup, proof, dropoff, exceptions, customer/chef contact, and Ops feedback.

**Status:** Completed on 2026-06-07. Verified with delivery workflow tests, proof/issue route tests, delivery engine proof metadata tests, Driver app full tests, Driver app lint, Driver app typecheck, Engine typecheck, Validation typecheck, Ops app typecheck, `test:wiring-fixes`, and authenticated production contract smoke.

**Files:**
- Modify: `apps/driver-app/src/app/delivery/[id]/components/DeliveryDetail.tsx`
- Modify: `apps/driver-app/src/app/api/deliveries/[id]/proof/route.ts`
- Modify: `apps/driver-app/src/app/api/deliveries/[id]/issue/route.ts`
- Test: `apps/driver-app/src/__tests__/delivery-detail-workflow.test.tsx`
- Test: `apps/driver-app/src/__tests__/deliveries-proof-route.test.ts`
- Test: `apps/driver-app/src/__tests__/deliveries-issue-route.test.ts`

- [x] **Step 1: Expand workflow tests**

Add tests for:
- required pickup proof before `picked_up`
- required dropoff proof before `delivered`
- issue form keeps notes on failure
- issue success shows Ops received it
- customer instructions are visible only on dropoff leg
- restaurant contact is visible only on pickup leg

- [x] **Step 2: Convert delivery detail to a task list**

Split visible UI inside the existing file into small local render functions:
- `renderWorkPanel`
- `renderRoutePanel`
- `renderContactPanel`
- `renderProofPanel`
- `renderIssuePanel`

Do not move files in this phase unless the file becomes impossible to test.

- [x] **Step 3: Route proof through the proof endpoint**

Use `POST /api/deliveries/[id]/proof` for pickup and dropoff proof instead of duplicating completion behavior through `PATCH /api/deliveries/[id]`.

- [x] **Step 4: Add location to issue submissions**

When `useLocationTracker` has a last known location, include `lat` and `lng` in issue submissions. The existing issue route already validates optional coordinates.

- [x] **Step 5: Verify Phase 4**

Run:

```powershell
pnpm --filter @ridendine/driver-app test -- delivery-detail-workflow.test.tsx deliveries-proof-route.test.ts deliveries-issue-route.test.ts
pnpm --filter @ridendine/driver-app typecheck
```

Expected: all pass.

---

## Phase 5: Earnings, Payouts, And Driver Trust

**Purpose:** Give drivers a clear financial picture and remove confusing currency/account gaps.

**Status:** Completed on 2026-06-07. Verified with failing-first instant payout fee regressions, focused Phase 5 tests, full Driver app tests, Driver app lint, Driver app typecheck, Engine typecheck, Engine payout-risk test, wiring checks, authenticated production contract smoke, `git diff --check`, and independent subagent review. Known residual output: existing React Testing Library `ReactDOMTestUtils.act` deprecation warnings.

**Files:**
- Modify: `apps/driver-app/src/app/earnings/components/EarningsView.tsx`
- Modify: `apps/driver-app/src/app/api/earnings/route.ts`
- Modify: `apps/driver-app/src/app/settings/settings-client.tsx`
- Modify: `apps/driver-app/src/app/api/payouts/instant/route.ts`
- Modify: `packages/engine/src/services/payout-risk.service.ts`
- Test: `apps/driver-app/src/__tests__/payouts-setup-get-route.test.ts`
- Test: `apps/driver-app/src/__tests__/payouts-setup-route.test.ts`
- Create: `apps/driver-app/src/__tests__/earnings-route.test.ts`
- Create: `apps/driver-app/src/__tests__/earnings-view.test.tsx`
- Create: `apps/driver-app/src/__tests__/payouts-instant-route.test.ts`
- Create: `packages/engine/src/services/payout-risk.service.test.ts`

- [x] **Step 1: Add earnings route tests**

Test route returns:
- today count and earnings
- week count and earnings
- month count and earnings
- available balance in cents
- currency from ledger account, defaulting to `CAD`
- pending instant payout requests
- payout account status

- [x] **Step 2: Fix currency copy**

Replace "Amount (USD)" with dynamic currency copy from the API. For Ridendine Canada, display CAD unless the ledger account says otherwise.

- [x] **Step 3: Add earnings breakdown**

Show:
- base delivery pay
- tips
- bonuses
- adjustments
- instant payout fee preview
- pending payout requests
- next scheduled payout explanation

- [x] **Step 4: Add route and UI verification**

Run:

```powershell
pnpm --filter @ridendine/driver-app test -- earnings-route.test.ts earnings-view.test.tsx payouts-setup-get-route.test.ts payouts-setup-route.test.ts
pnpm --filter @ridendine/driver-app typecheck
```

Expected: all pass.

---

## Phase 6: DB-Backed Notification Preferences

**Purpose:** Replace the current local-only notification settings with real driver preferences.

**Status:** Completed on 2026-06-07. Verified with failing-first route and UI tests, DB migration contract test, Driver app typecheck, Driver app lint, Validation package typecheck, runtime wiring audit, and regenerated runtime wiring docs/Obsidian records.

**Files:**
- Create: `apps/driver-app/src/app/api/driver/notification-preferences/route.ts`
- Modify: `apps/driver-app/src/components/settings/notification-preferences.tsx`
- Modify: `packages/validation/src/schemas/driver.ts`
- Create: `supabase/migrations/00044_driver_notification_preferences.sql`
- Modify: `docs/LAUNCH_CHECKLIST.md`
- Test: `apps/driver-app/src/__tests__/notification-preferences-route.test.ts`
- Test: `apps/driver-app/src/__tests__/notification-preferences.test.tsx`
- Test: `packages/db/src/schema/phase0-business-engine.migration.test.ts`

- [x] **Step 1: Add route tests**

Test:
- unauthenticated returns `401`
- GET returns defaults when no DB row exists
- PATCH validates known event/channel keys
- PATCH stores preferences for the current driver only

- [x] **Step 2: Implement route**

Use existing driver session context. Store in the existing notification preference table if already migrated, otherwise add the smallest compatible migration only after confirming the schema in Supabase migrations.

- [x] **Step 3: Update settings UI**

Remove the copy that says preferences are stored locally. Load and save through the API.

- [x] **Step 4: Verify Phase 6**

Run:

```powershell
pnpm --filter @ridendine/driver-app test -- notification-preferences-route.test.ts
pnpm --filter @ridendine/driver-app typecheck
```

Expected: all pass.

---

## Phase 7: Ops Driver Command Surface

**Purpose:** Tie every Driver app signal back into Ops so operators can approve, monitor, intervene, and explain dispatch outcomes.

**Status:** Completed on 2026-06-07. Verified with failing-first Ops operations route/panel/live-board tests, engine driver governance test, Ops app typecheck, Ops app lint, Engine typecheck, `audit:guards`, refreshed runtime wiring docs/Obsidian records, and route-count proof updates from 122 to 123 API handlers.

**Files:**
- Create: `apps/ops-admin/src/lib/driver-readiness.ts`
- Create: `apps/ops-admin/src/lib/driver-operations.ts`
- Create: `apps/ops-admin/src/app/api/drivers/[id]/operations/route.ts`
- Modify: `apps/ops-admin/src/app/dashboard/drivers/page.tsx`
- Modify: `apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx`
- Modify: `apps/ops-admin/src/app/dashboard/drivers/[id]/driver-governance-actions.tsx`
- Modify: `apps/ops-admin/src/app/api/ops/live-board/route.ts`
- Modify: `apps/ops-admin/src/hooks/use-ops-live-feed.ts`
- Modify: `apps/ops-admin/src/lib/ops-live-feed-types.ts`
- Modify: `apps/ops-admin/src/app/dashboard/_components/drivers-column.tsx`
- Test: `apps/ops-admin/src/__tests__/driver-operations-route.test.ts`
- Test: `apps/ops-admin/src/__tests__/driver-operations-panel.test.tsx`
- Test: `apps/ops-admin/src/__tests__/live-board-drivers-column.test.tsx`
- Test: `packages/engine/src/orchestrators/platform.engine.test.ts`

- [x] **Step 1: Add Ops route tests**

Test:
- no ops session returns `401` or guarded response
- users without `ops_entity_read` cannot read
- route returns readiness
- route returns active deliveries
- route returns open exceptions
- route returns compliance document counts
- route returns payout account status and payable balance

- [x] **Step 2: Implement Ops operations route**

Use `getOpsActorContext()` and `guardPlatformApi(actor, 'ops_entity_read')`. Read:
- `drivers`
- `driver_presence`
- `deliveries`
- `order_exceptions`
- `driver_documents`
- `driver_payout_accounts`
- `platform_accounts`

- [x] **Step 3: Upgrade driver list**

Add columns:
- readiness
- GPS age
- active work
- approval/compliance blocker
- payout account status

Keep direct pending approval available. Route reject, suspend, and restore decisions to the driver detail page so Ops must record the required governance reason before mutating status.

- [x] **Step 4: Upgrade driver detail**

Add panels:
- dispatch readiness
- active delivery timeline
- location freshness
- open exceptions
- compliance documents
- earnings/payable balance
- governance actions with reason field

- [x] **Step 5: Make governance reason required**

For reject, suspend, and restore actions, require a reason string. Pass it to `PATCH /api/drivers/[id]` so `engine.platform.updateDriverGovernance` can audit it.

- [x] **Step 6: Verify Phase 7**

Run:

```powershell
pnpm --filter @ridendine/ops-admin test -- driver-operations-route.test.ts driver-operations-panel.test.tsx
pnpm --filter @ridendine/ops-admin typecheck
pnpm audit:guards
```

Expected: all pass and guard audit reports `unguarded 0`.

---

## Phase 8: Driver Approval And Compliance Enforcement

**Purpose:** Ensure a driver cannot receive real dispatch work unless Ops has approved the profile and required compliance state.

**Files:**
- Modify: `packages/engine/src/server.ts`
- Modify: `packages/engine/src/orchestrators/driver-matching.service.ts`
- Modify: `apps/driver-app/src/app/page.tsx`
- Modify: `apps/driver-app/src/app/api/auth/signup/route.ts`
- Modify: `apps/ops-admin/src/app/dashboard/compliance/page.tsx`
- Test: `packages/engine/src/server.test.ts`
- Test: `packages/engine/src/orchestrators/driver-matching.service.test.ts`
- Test: `apps/driver-app/src/__tests__/auth-login-route.test.ts`

- [ ] **Step 1: Confirm approval gate tests**

Add tests that:
- pending drivers can sign in and view onboarding/readiness blockers
- pending drivers cannot access dispatch APIs
- suspended drivers cannot access dispatch APIs
- approved drivers can access dispatch APIs
- driver matching ignores pending and suspended drivers

- [ ] **Step 2: Keep signup behavior explicit**

If closed beta still auto-approves self-serve driver signup, keep that behavior visible in code comments and Ops docs. If business wants manual approval, change signup status to `pending` and require Ops approval before dispatch.

- [ ] **Step 3: Add compliance blocker to readiness**

If required document rows are missing or rejected, readiness should say `not_dispatchable` with a compliance detail. Do not block profile/settings access.

- [ ] **Step 4: Verify Phase 8**

Run:

```powershell
pnpm --filter @ridendine/engine test -- server.test.ts driver-matching.service.test.ts
pnpm --filter @ridendine/driver-app test -- auth-login-route.test.ts driver-readiness-route.test.ts
pnpm typecheck
```

Expected: all pass.

---

## Phase 9: Cross-App Wiring, Docs, And Smoke Proof

**Purpose:** Make the new Driver/Ops section auditable in the same style as the rest of Ridendine.

**Files:**
- Modify: `docs/CROSS_APP_CONTRACTS.md`
- Modify: `docs/LAUNCH_CHECKLIST.md`
- Create or modify: `docs/superpowers/plans/2026-06-07-driver-operations-expansion-results.md`
- Modify: production smoke scripts only if new critical routes need coverage.

- [ ] **Step 1: Update cross-app contracts**

Document:
- `GET /api/driver/readiness`
- `GET/PATCH /api/driver/notification-preferences`
- `GET /api/driver/shift`
- `GET /api/drivers/[id]/operations`
- how readiness maps to dispatch eligibility
- what Driver sees vs what Ops sees

- [ ] **Step 2: Extend smoke coverage**

Add read-only authenticated production probes for:
- Driver `/api/driver/readiness`
- Driver `/api/driver/shift`
- Ops `/api/drivers/[sample]/operations` only if a stable sample driver fixture exists

- [ ] **Step 3: Run full local verification**

Run:

```powershell
. .\scripts\tools\ensure-node-pnpm.ps1
$tool = Use-RidendineNodePnpm -Quiet
& $tool.PnpmCmd lint
& $tool.PnpmCmd typecheck
& $tool.PnpmCmd test
& $tool.PnpmCmd build
& $tool.PnpmCmd test:wiring-fixes
& $tool.PnpmCmd audit:guards
```

Expected: all exit `0`.

- [ ] **Step 4: Run production verification after push/deploy**

Run:

```powershell
$env:RIDENDINE_SMOKE_EMAIL='sean@ridendine.ca'
$env:RIDENDINE_SMOKE_PASSWORD='password123'
& $tool.PnpmCmd smoke:prod:contracts -- --require-auth
& $tool.PnpmCmd smoke:prod
```

Expected: all customer, chef, driver, and ops checks pass.

---

## Phase Order And Commit Boundaries

Commit after each phase with these messages:

```powershell
git commit -m "feat(driver): add shared operations readiness model"
git commit -m "feat(driver): add readiness dashboard and API"
git commit -m "feat(driver): improve delivery offer decision support"
git commit -m "feat(driver): expand delivery command workflow"
git commit -m "feat(driver): clarify earnings and payout status"
git commit -m "feat(driver): persist notification preferences"
git commit -m "feat(ops): add driver operations command surface"
git commit -m "feat(driver): enforce approval and compliance readiness"
git commit -m "docs(driver): record driver operations wiring proof"
```

Push only after each phase passes local verification.

---

## Final Acceptance Criteria

- Driver can sign in and see exact approval/readiness state.
- Pending or suspended drivers cannot access dispatch actions.
- Approved drivers can go online only with clear GPS/readiness feedback.
- Driver offers include enough information to decide quickly.
- Active delivery workflow shows pickup, dropoff, proof, contact, issue reporting, and next action.
- Driver earnings show CAD-aware balances, payout timing, instant payout status, and fees.
- Notification preferences are server-backed.
- Ops driver list shows approval, GPS health, readiness, active work, and compliance state.
- Ops driver detail shows readiness, location health, active delivery context, exceptions, earnings, payout status, compliance, and governance actions.
- `sean@ridendine.ca / password123` remains able to test all four apps.
- Full local gate and production smoke pass after deployment.

---

## Self-Review

- Scope coverage: all three requested areas are covered: delivery knowledge, earnings clarity, and Ops-connected approval/monitoring.
- Approval wiring: preserved through `getDriverActorContext()` and `engine.platform.updateDriverGovernance`.
- Dispatch wiring: preserved through `driver_presence`, GPS freshness, and `driver-matching.service.ts`.
- Ops wiring: extended from existing driver list/detail/live-board surfaces instead of creating a separate control plane.
- Safety: no customer coordinate exposure added.
- Testability: each phase includes focused tests and verification commands.
