# Ops Admin Control Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `apps/ops-admin` the complete operational command center for monitoring, engine control, and safe operator actions across Ride In Dine.

**Architecture:** Keep ops-admin as the control plane and wire each dashboard domain to existing guarded API routes and engine services. Prefer audited state transitions over destructive deletes for orders, payments, deliveries, and platform records.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase, `@ridendine/engine`, Jest, Playwright.

---

### Task 1: Control Center Inventory

**Files:**
- Create: `apps/ops-admin/src/app/dashboard/_components/control-center-model.ts`
- Create: `apps/ops-admin/src/app/dashboard/_components/control-center.tsx`
- Test: `apps/ops-admin/src/app/dashboard/_components/__tests__/control-center.test.ts`
- Modify: `apps/ops-admin/src/app/dashboard/page.tsx`

- [x] **Step 1: Write failing model test**

Run: `pnpm run test -- control-center.test.ts --runInBand` from `apps/ops-admin`.
Expected: FAIL because `control-center-model` does not exist.

- [x] **Step 2: Implement control center model**

Define `CONTROL_CENTER_AREAS` for live ops, engine health, dispatch, orders, chefs, drivers, customers, finance, promos, support, team, and settings. Each area must declare `href`, `apiRoutes`, `signals`, `actions`, and whether destructive delete is allowed.

- [x] **Step 3: Render control center on dashboard**

Add `ControlCenter` below the KPI row on `/dashboard`.

- [x] **Step 4: Verify**

Run: `pnpm run test -- control-center.test.ts --runInBand`.
Expected: PASS.

### Task 2: Ops Readiness Strip

**Files:**
- Create: `apps/ops-admin/src/app/dashboard/_components/ops-readiness.tsx`
- Test: `apps/ops-admin/src/app/dashboard/_components/__tests__/ops-readiness.test.tsx`
- Modify: `apps/ops-admin/src/app/dashboard/page.tsx`

- [ ] **Step 1: Write failing test**

Test that `OpsReadiness` renders DB, auth, realtime, engine health, cron processors, and finance checks from a small status object.

- [ ] **Step 2: Implement component**

Render statuses as compact badges with healthy, degraded, or down states. Link health failures to `/dashboard/settings`, `/dashboard/dispatch`, or `/dashboard/finance` depending on the failed component.

- [ ] **Step 3: Wire data**

Use existing `getEngine().ops.getDashboard()` and `/api/engine/health` response shape where available. Do not add unguarded endpoints.

### Task 3: Action Gap Audit

**Files:**
- Create: `apps/ops-admin/src/app/dashboard/_components/action-gap-model.ts`
- Test: `apps/ops-admin/src/app/dashboard/_components/__tests__/action-gap-model.test.ts`

- [ ] **Step 1: Write failing test**

Assert each domain has list, detail, create/update/deactivate or audited alternative actions.

- [ ] **Step 2: Implement gap model**

Classify gaps as `missing-ui`, `missing-api`, `needs-audit`, or `intentionally-no-delete`.

### Task 4: Complete Highest-Impact Actions

**Files:**
- Modify existing domain pages under `apps/ops-admin/src/app/dashboard/**`
- Modify guarded routes under `apps/ops-admin/src/app/api/**`

- [ ] **Step 1: Dispatch**

Ensure force assign, reassign, expire offers, and escalation are reachable from `/dashboard/dispatch` and delivery details.

- [ ] **Step 2: Orders**

Ensure status override, cancel, refund request, and audit links are reachable from order list and details.

- [ ] **Step 3: Finance**

Ensure refund queue, payout preview, payout execution, reconciliation, and instant payout decisions are reachable from finance pages.

- [ ] **Step 4: Governance**

Ensure chef/driver approval, suspension, pause, capacity, and status changes are reachable.

### Task 5: End-to-End Verification

**Files:**
- Add or extend Playwright specs under `e2e/lifecycle`

- [ ] **Step 1: Add smoke checks**

Navigate from `/dashboard` to each control center area and assert the page loads without 500s.

- [ ] **Step 2: Add action smoke checks**

Use seeded data to perform one safe action in dispatch, finance, support, promos, and governance.

- [ ] **Step 3: Run verification**

Run `pnpm --filter @ridendine/ops-admin typecheck`, focused Jest tests, and Playwright smoke tests.
