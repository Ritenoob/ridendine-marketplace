# Driver Profile And Settings Command Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Driver Profile and Settings into command surfaces using existing data and APIs.

**Architecture:** Keep the existing page loaders and API calls. Rework `ProfileView` and `SettingsClient` with local presentation helpers, tokenized styles, KPI panels, and command-style layouts while preserving form, payout setup, instant payout toggle, and notification preferences behavior.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS design tokens, Jest, Testing Library, existing `@ridendine/ui` components.

---

## File Structure

- Create `apps/driver-app/src/__tests__/profile-view.test.tsx`: focused Profile command-surface and edit behavior tests.
- Create `apps/driver-app/src/__tests__/settings-client.test.tsx`: focused Settings command-surface and instant payout toggle tests.
- Modify `apps/driver-app/src/app/profile/components/ProfileView.tsx`: Profile command surface.
- Modify `apps/driver-app/src/app/settings/settings-client.tsx`: Settings command surface.
- Create `docs/superpowers/specs/2026-06-08-driver-profile-settings-command-surface-design.md`: Phase design record.
- Create `docs/superpowers/plans/2026-06-08-driver-profile-settings-command-surface.md`: Phase implementation record.

---

### Task 1: Add Profile Command-Surface Tests

**Files:**
- Create: `apps/driver-app/src/__tests__/profile-view.test.tsx`

- [x] Add a test that renders `Driver profile command center`.
- [x] Assert KPI labels `Driver status`, `Contact record`, `Vehicle record`, and `Payout setup`.
- [x] Assert account, vehicle, and payout headings render.
- [x] Add an edit behavior test that changes first name and saves through `PATCH /api/driver`.
- [x] Run `corepack pnpm --filter @ridendine/driver-app test -- profile-view.test.tsx --runInBand` and confirm the new command-surface test fails before implementation.

### Task 2: Add Settings Command-Surface Tests

**Files:**
- Create: `apps/driver-app/src/__tests__/settings-client.test.tsx`

- [x] Add a test that renders `Driver settings command center`.
- [x] Assert KPI labels `Payable balance`, `Instant payouts`, `Notification sync`, and `Account controls`.
- [x] Assert dynamic CAD balance and Earnings link render.
- [x] Add a toggle behavior test that calls `PATCH /api/driver` with `instant_payouts_enabled`.
- [x] Run `corepack pnpm --filter @ridendine/driver-app test -- settings-client.test.tsx --runInBand` and confirm the new command-surface test fails before implementation.

### Task 3: Rebuild Profile Layout

**Files:**
- Modify: `apps/driver-app/src/app/profile/components/ProfileView.tsx`

- [x] Add local helpers for status labels, status tones, vehicle labels, payout labels, and account completeness.
- [x] Add a command heading and KPI band above profile content.
- [x] Convert driver information, vehicle details, and payout account into a two-column desktop command layout.
- [x] Preserve edit, save, cancel, payout setup, payout loading, payout success, and restricted account behavior.
- [x] Replace raw palette classes with Driver design tokens.
- [x] Run the focused Profile test and confirm it passes.

### Task 4: Rebuild Settings Layout

**Files:**
- Modify: `apps/driver-app/src/app/settings/settings-client.tsx`

- [x] Add local helpers for currency formatting and instant payout state labels.
- [x] Add a command heading and KPI band above settings content.
- [x] Convert payable balance, instant payout toggle, Earnings link, and notifications into a two-column desktop command layout.
- [x] Preserve instant payout toggle request and router refresh behavior.
- [x] Replace raw palette classes with Driver design tokens.
- [x] Run the focused Settings test and confirm it passes.

### Task 5: Verify, Commit, Push

**Files:**
- Modified files above plus this plan and the phase design spec.

- [x] Run focused Profile and Settings tests.
- [x] Run full Driver app tests.
- [x] Run Driver typecheck.
- [x] Run Driver lint.
- [x] Run Driver build.
- [ ] Commit this phase.
- [ ] Push to GitHub.
- [ ] Verify GitHub/Vercel statuses and production Driver deployment for the pushed commit.

---

## Self-Review

- Spec coverage: covers Profile, Settings, payout setup, instant payout toggle, notification preferences, tokenized styling, tests, and verification.
- Placeholder scan: no placeholders remain.
- Type consistency: the plan consistently uses `ProfileView`, `SettingsClient`, and existing Driver API contracts.
