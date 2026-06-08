# Driver Earnings Command Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Driver Earnings page into a finance command surface using existing earnings props and payout APIs.

**Architecture:** Keep `apps/driver-app/src/app/earnings/page.tsx` as the data loader. Rework `EarningsView` into a command layout with local presentation helpers and no new server calls except the existing instant payout request.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS, Jest, existing `@ridendine/ui` components.

---

### Task 1: Add Earnings Command-Surface Tests

**Files:**
- Modify: `apps/driver-app/src/__tests__/earnings-view.test.tsx`

- [x] Add a test that renders `Earnings command center`.
- [x] Assert KPI labels `Available now`, `Weekly earnings`, `Completed this week`, and `Pending holds`.
- [x] Assert `Payout readiness` and `Instant payouts available` render when instant payouts are enabled.
- [x] Assert pending hold copy includes the pending request amount plus fee.
- [x] Run `corepack pnpm --filter @ridendine/driver-app test -- earnings-view.test.tsx --runInBand` and confirm the new test fails before implementation.

### Task 2: Rebuild Earnings Layout

**Files:**
- Modify: `apps/driver-app/src/app/earnings/components/EarningsView.tsx`

- [x] Add small presentation helpers for payout readiness labels and KPI panels.
- [x] Replace the top-level stacked card order with a command heading and KPI band.
- [x] Create a two-column desktop grid with payout controls on the left and activity proof on the right.
- [x] Preserve existing instant payout form behavior and validation messages.
- [x] Preserve existing pending payout request details.
- [x] Preserve existing delivery pay estimate copy and breakdown labels.
- [x] Run the focused earnings test and confirm it passes.

### Task 3: Verify, Commit, Push

**Files:**
- Modified files above plus this plan and the Phase 3 design spec.

- [x] Run focused earnings tests.
- [x] Run full Driver app tests.
- [x] Run Driver typecheck.
- [x] Run Driver lint.
- [x] Run Driver build.
- [ ] Commit Phase 3.
- [ ] Push to GitHub.
- [ ] Verify GitHub/Vercel statuses and production Driver deployment for the pushed commit.
