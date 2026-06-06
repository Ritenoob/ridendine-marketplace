# Compliance Ops Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add read-only Ops compliance visibility for chef and driver document coverage and expiry risk.

**Architecture:** A pure model computes compliance risk from existing document rows. Ops pages query current `chef_documents` and `driver_documents` data and render a central dashboard plus entity detail panels. No database migration or workflow mutation is included in this phase.

**Tech Stack:** Next.js App Router, React server components, Supabase admin client, TypeScript, Jest-style unit tests already used in ops-admin.

---

## File Structure

- Create: `apps/ops-admin/src/app/dashboard/compliance/compliance-model.ts`
- Create: `apps/ops-admin/src/app/dashboard/compliance/compliance-panel.tsx`
- Create: `apps/ops-admin/src/app/dashboard/compliance/page.tsx`
- Create: `apps/ops-admin/src/app/dashboard/compliance/__tests__/compliance-model.test.ts`
- Modify: `apps/ops-admin/src/components/DashboardLayout.tsx`
- Modify: `apps/ops-admin/src/app/dashboard/chefs/[id]/page.tsx`
- Modify: `apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx`
- Modify: `apps/ops-admin/src/app/dashboard/_components/control-center-model.ts`
- Modify: `apps/ops-admin/src/app/dashboard/_components/__tests__/control-center.test.ts`
- Modify vault notes under `06 - Product and Technology/App Architecture`

## Task 1: Compliance Model

**Files:**
- Create: `apps/ops-admin/src/app/dashboard/compliance/compliance-model.ts`
- Test: `apps/ops-admin/src/app/dashboard/compliance/__tests__/compliance-model.test.ts`

- [ ] **Step 1: Write failing model tests**

Create tests for an approved chef missing required documents, a driver with expired and expiring documents, and a mixed summary queue.

- [ ] **Step 2: Run focused test**

Run: `pnpm --filter @ridendine/ops-admin test -- compliance-model`

Expected locally in this environment: command is blocked because `pnpm` is not installed. If a proper Node/pnpm environment is available, expected first run is fail because the model file does not exist.

- [ ] **Step 3: Implement the model**

Define document types, labels, expiry windows, missing-required detection, and summary calculation. Keep the model independent of React and Supabase.

- [ ] **Step 4: Re-run focused test**

Run: `pnpm --filter @ridendine/ops-admin test -- compliance-model`

Expected in a proper Node/pnpm environment: pass.

## Task 2: Compliance Dashboard And Panels

**Files:**
- Create: `apps/ops-admin/src/app/dashboard/compliance/page.tsx`
- Create: `apps/ops-admin/src/app/dashboard/compliance/compliance-panel.tsx`
- Modify: `apps/ops-admin/src/app/dashboard/chefs/[id]/page.tsx`
- Modify: `apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx`

- [ ] **Step 1: Add dashboard data reads**

Read chefs with `chef_documents` and drivers with `driver_documents` using the admin client. Build compliance subjects with the model.

- [ ] **Step 2: Render the central queue**

Render summary cards, a high-risk review queue, and separate chef/driver document sections. Use links to the existing chef and driver detail pages.

- [ ] **Step 3: Render entity panels**

Fetch owner-specific document rows on chef and driver detail pages and render the reusable compliance panel near existing governance actions.

## Task 3: Ops Wiring

**Files:**
- Modify: `apps/ops-admin/src/components/DashboardLayout.tsx`
- Modify: `apps/ops-admin/src/app/dashboard/_components/control-center-model.ts`
- Modify: `apps/ops-admin/src/app/dashboard/_components/__tests__/control-center.test.ts`

- [ ] **Step 1: Add navigation**

Add `/dashboard/compliance` under the People group with a compliance/security icon.

- [ ] **Step 2: Add control-center domain**

Add a `compliance` control-center area with document review, expiry monitoring, and entity-governance links. Update tests to expect 13 domains.

## Task 4: Documentation, Verification, And Release

**Files:**
- Modify: Obsidian vault Phase 4 notes
- Modify: generated route inventory after implementation

- [ ] **Step 1: Update vault notes**

Record Phase 4 design, code wiring, dashboard purpose, source tables, and current implementation limits.

- [ ] **Step 2: Run available verification**

Run:

```powershell
git diff --check
git status --short
pnpm --filter @ridendine/ops-admin test -- compliance-model
```

Expected locally: `git diff --check` succeeds; `pnpm` remains unavailable unless the local toolchain is installed.

- [ ] **Step 3: Commit and push**

Commit message:

```text
feat(ops-admin): add compliance document dashboard
```

Push to `origin master`, then check all four Vercel production project deployments for the pushed commit.

