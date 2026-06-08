# Driver Shift Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit driver shift start/end workflow, keep driver presence synchronized, and expose shift state to Ops.

**Architecture:** Reuse existing `driver_shifts` and `driver_presence.current_shift_id`. Keep `GET /api/driver/shift` as the read model, add `POST` to start a shift and `DELETE` to end it, then wire the Driver dashboard and Ops operations summary to the same contract.

**Tech Stack:** Next.js App Router route handlers, Supabase admin client, Jest/Testing Library, shared `@ridendine/types`, existing Ridendine response helpers.

---

## Files

- Modify: `apps/driver-app/src/app/api/driver/shift/route.ts`
- Modify: `apps/driver-app/src/__tests__/driver-shift-route.test.ts`
- Modify: `apps/driver-app/src/app/components/DriverDashboard.tsx`
- Modify: `apps/driver-app/src/__tests__/driver-dashboard-empty-state.test.tsx`
- Modify: `apps/ops-admin/src/lib/driver-operations.ts`
- Modify: `apps/ops-admin/src/app/dashboard/drivers/driver-operations-panel.tsx`
- Modify: `apps/ops-admin/src/__tests__/driver-operations-route.test.ts`
- Modify: `packages/types/src/domains/driver-operations.ts`
- Modify: `docs/superpowers/plans/2026-06-07-driver-operations-expansion-results.md`
- Modify: `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\15 - Phased Improvement Execution Plan.md`

## Task 1: Driver Shift API Red Tests

- [ ] **Step 1: Add POST start-shift test**

Add a test in `apps/driver-app/src/__tests__/driver-shift-route.test.ts` that imports `POST`, calls it with an approved driver context, expects the route to create a `driver_shifts` row, upsert `driver_presence` with `status: 'online'` and `current_shift_id`, and return an on-shift summary.

- [ ] **Step 2: Add POST idempotency test**

Add a test where `driver_presence.current_shift_id` already points to an open shift. Expect `POST` to avoid inserting a new shift and return the existing on-shift summary.

- [ ] **Step 3: Add DELETE active-delivery block test**

Add a test that imports `DELETE`, returns one active delivery from the `deliveries` query, and expects `409` with `ACTIVE_DELIVERY_BLOCK`.

- [ ] **Step 4: Add DELETE close-shift test**

Add a test where an open shift exists and no active deliveries exist. Expect `DELETE` to set `ended_at`, update presence to `offline`, clear `current_shift_id`, and return an off-shift summary.

- [ ] **Step 5: Run the focused test and confirm RED**

Run:

```powershell
pnpm --filter @ridendine/driver-app test -- driver-shift-route.test.ts
```

Expected before implementation: the new tests fail because `POST` and `DELETE` are missing.

## Task 2: Driver Shift API Implementation

- [ ] **Step 1: Extract read-summary helper**

Refactor `apps/driver-app/src/app/api/driver/shift/route.ts` so `GET`, `POST`, and `DELETE` can return the same `DriverShiftOperationsSummary`. Keep the existing GET response shape unchanged.

- [ ] **Step 2: Implement POST**

Implement `POST /api/driver/shift`:

- Use `getDriverActorContext()` with the existing approved-only default.
- Load current presence.
- If presence has `current_shift_id`, load that shift and return summary when it is still open.
- Otherwise insert a `driver_shifts` row for the driver.
- Upsert `driver_presence` with `status: 'online'`, `current_shift_id`, and `updated_at`.
- Return the summary.

- [ ] **Step 3: Implement DELETE**

Implement `DELETE /api/driver/shift`:

- Use `getDriverActorContext()` with the existing approved-only default.
- Load active deliveries.
- If active deliveries exist, return `409 ACTIVE_DELIVERY_BLOCK`.
- Load current presence and open shift.
- If no open shift exists, upsert offline presence and return off-shift summary.
- Otherwise set `driver_shifts.ended_at` and `updated_at`, then upsert presence with `status: 'offline'`, `current_shift_id: null`, and `updated_at`.
- Return the summary.

- [ ] **Step 4: Run the focused driver route test and confirm GREEN**

Run:

```powershell
pnpm --filter @ridendine/driver-app test -- driver-shift-route.test.ts
```

Expected after implementation: all driver shift route tests pass.

## Task 3: Shared Ops Shift Contract

- [ ] **Step 1: Add shared shift summary fields**

Extend `OpsDriverOperationsSummary` in `apps/ops-admin/src/lib/driver-operations.ts` with:

- `shift.isOnShift`
- `shift.currentShiftId`
- `shift.startedAt`
- `shift.endedAt`
- `shift.durationMinutes`
- `shift.totalDeliveries`
- `shift.totalEarnings`
- `shift.totalDistanceKm`

- [ ] **Step 2: Add failing Ops test**

Update `apps/ops-admin/src/__tests__/driver-operations-route.test.ts` so the fixture includes `driver_presence.current_shift_id` and `driver_shifts` data. Expect `/api/drivers/[id]/operations` to return the new `shift` object.

- [ ] **Step 3: Confirm RED**

Run:

```powershell
pnpm --filter @ridendine/ops-admin test -- driver-operations-route.test.ts
```

Expected before implementation: the new `shift` expectation fails.

- [ ] **Step 4: Query and map shift state**

Update `getOpsDriverOperationsSummary()` to select `current_shift_id` from `driver_presence`, query `driver_shifts` when a current shift exists, calculate `durationMinutes`, and return the `shift` object.

- [ ] **Step 5: Confirm GREEN**

Run:

```powershell
pnpm --filter @ridendine/ops-admin test -- driver-operations-route.test.ts
```

Expected after implementation: all Ops driver operations tests pass.

## Task 4: Driver Dashboard Shift Controls

- [ ] **Step 1: Add dashboard red tests**

Update `apps/driver-app/src/__tests__/driver-dashboard-empty-state.test.tsx`:

- Mock `GET /api/driver/shift`.
- Expect an off-shift dashboard to show `Start shift`.
- Click `Start shift` and expect `POST /api/driver/shift`.
- Mock an on-shift state and expect `End shift`.
- Mock active deliveries and expect ending to be blocked by copy before the user calls the endpoint.

- [ ] **Step 2: Confirm RED**

Run:

```powershell
pnpm --filter @ridendine/driver-app test -- driver-dashboard-empty-state.test.tsx
```

Expected before implementation: the new shift button expectations fail.

- [ ] **Step 3: Implement dashboard state**

Update `DriverDashboard.tsx` to:

- Fetch `/api/driver/shift` during dashboard hydration.
- Track `isOnShift`, `currentShiftId`, `shiftStartedAt`, and shift loading/error state.
- Replace the main online/offline work toggle with `Start shift` and `End shift`.
- Call `POST /api/driver/shift` to start and `DELETE /api/driver/shift` to end.
- Refresh readiness after successful shift actions.
- Keep the lower-level presence status label and existing GPS retry behavior.

- [ ] **Step 4: Confirm GREEN**

Run:

```powershell
pnpm --filter @ridendine/driver-app test -- driver-dashboard-empty-state.test.tsx
```

Expected after implementation: dashboard tests pass.

## Task 5: Ops Shift Visibility UI

- [ ] **Step 1: Add Ops panel expectation**

Update an existing Ops UI test if one exists for `DriverOperationsPanel`; otherwise keep route-level coverage and add shift display directly to the panel.

- [ ] **Step 2: Render shift card**

Update `apps/ops-admin/src/app/dashboard/drivers/driver-operations-panel.tsx` to render:

- Shift state.
- Started timestamp or `Not on shift`.
- Duration.
- Shift totals.

- [ ] **Step 3: Run Ops tests**

Run:

```powershell
pnpm --filter @ridendine/ops-admin test -- driver-operations-route.test.ts
```

Expected: route contract still passes.

## Task 6: Documentation And Verification

- [ ] **Step 1: Update phase results**

Append Phase 10 scope, tests, known risks, and rollback path to `docs/superpowers/plans/2026-06-07-driver-operations-expansion-results.md`.

- [ ] **Step 2: Update Obsidian phase note**

Append Driver Operations Expansion Phase 10 to the Obsidian phased execution plan.

- [ ] **Step 3: Run local verification**

Run:

```powershell
pnpm --filter @ridendine/driver-app test -- driver-shift-route.test.ts
pnpm --filter @ridendine/driver-app test -- driver-dashboard-empty-state.test.tsx
pnpm --filter @ridendine/ops-admin test -- driver-operations-route.test.ts
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:wiring-fixes
pnpm audit:guards
git diff --check
```

Expected: all commands pass. If a production-smoke command later runs, it should use only safe GET/contract checks for shift lifecycle.

- [ ] **Step 4: Commit, push, and remote proof**

Commit the Phase 10 changes, push to GitHub, wait for GitHub Actions, wait for all four Vercel deployments, then run production contract smoke and broad production smoke.

## Self-Review

- Spec coverage: The plan covers Driver API, Driver UI, Ops API contract, Ops UI, docs, and verification.
- Placeholder scan: No task relies on a future placeholder or undefined file.
- Type consistency: The plan reuses the existing `DriverShiftOperationsSummary` for Driver responses and adds one Ops `shift` object to `OpsDriverOperationsSummary`.
