# Driver History Command Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Driver History into a delivery ledger command surface using existing completed delivery data.

**Architecture:** Keep `apps/driver-app/src/app/history/page.tsx` as the data loader. Rework `HistoryView` with local formatting helpers, KPI summary cards, recent-delivery proof, and the existing date-grouped delivery ledger.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS, Jest, Testing Library, existing `@ridendine/ui` components.

---

## File Structure

- Create `apps/driver-app/src/__tests__/history-view.test.tsx`: focused tests for the History command surface and empty state.
- Modify `apps/driver-app/src/app/history/components/HistoryView.tsx`: presentation-only command surface and delivery ledger layout.
- Create `docs/superpowers/specs/2026-06-08-driver-history-command-surface-design.md`: Phase 4 design record.
- Create `docs/superpowers/plans/2026-06-08-driver-history-command-surface.md`: Phase 4 implementation record.

---

### Task 1: Add History Command-Surface Tests

**Files:**
- Create: `apps/driver-app/src/__tests__/history-view.test.tsx`

- [x] Add a test that renders `Delivery history command center`.
- [x] Assert KPI labels `Completed deliveries`, `Total earned`, `Average payout`, and `Total distance`.
- [x] Assert `Delivery proof trail`, `Recent completion`, pickup/dropoff route copy, distance, payout, and status render for completed deliveries.
- [x] Add an empty-state test that renders zeroed metrics and `No completed deliveries yet`.
- [x] Run `corepack pnpm --filter @ridendine/driver-app test -- history-view.test.tsx --runInBand` and confirm the new test fails before implementation.

### Task 2: Rebuild History Layout

**Files:**
- Modify: `apps/driver-app/src/app/history/components/HistoryView.tsx`

- [x] Add local helpers for money, distance, date, time, status labels, and delivery route labels.
- [x] Add a command heading and KPI band above the ledger.
- [x] Add a `Delivery proof trail` panel with the most recent completed delivery.
- [x] Preserve date-grouped history rows while improving route, distance, payout, and status display.
- [x] Preserve the existing no-history state with stronger zeroed metrics.
- [x] Run the focused History test and confirm it passes.

### Task 3: Verify, Commit, Push

**Files:**
- Modified files above plus this plan and the Phase 4 design spec.

- [x] Run focused History tests.
- [x] Run full Driver app tests.
- [x] Run Driver typecheck.
- [x] Run Driver lint.
- [x] Run Driver build.
- [x] Commit Phase 4.
- [x] Push to GitHub.
- [x] Verify GitHub/Vercel statuses and production Driver deployment for the pushed commit.

---

## Self-Review

- Spec coverage: covers summary KPIs, proof trail, date-grouped ledger, empty state, tests, and verification.
- Placeholder scan: no placeholders remain.
- Type consistency: the plan consistently uses `HistoryView`, existing `Delivery` rows, and presentation-only helpers.
