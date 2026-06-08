# Driver Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Driver home dashboard into an operational command center using existing Driver APIs.

**Architecture:** Keep Phase 1 shell unchanged. Enhance `DriverDashboard` with focused helper functions, persistent offers state, shift duration formatting, and a responsive command-center layout.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS, Jest, existing Driver APIs.

---

### Task 1: Add Dashboard Command-Center Tests

**Files:**
- Modify: `apps/driver-app/src/__tests__/driver-dashboard-empty-state.test.tsx`

- [x] Add mocked `/api/offers` responses to existing dashboard fetch helpers.
- [x] Add a test for live shift duration using `shiftStartedAt`.
- [x] Add a test for pending offers rendering from `/api/offers`.

### Task 2: Add Dashboard Helpers And State

**Files:**
- Modify: `apps/driver-app/src/app/components/DriverDashboard.tsx`

- [x] Add `DashboardOffer` type and parser for `/api/offers`.
- [x] Add money, time, route, and shift-duration format helpers.
- [x] Add `pendingOffers`, `offersLoading`, and `offersError` state.
- [x] Hydrate offers alongside presence, earnings, readiness, and shift.

### Task 3: Rebuild Home Layout

**Files:**
- Modify: `apps/driver-app/src/app/components/DriverDashboard.tsx`

- [x] Replace the basic stacked cards with a two-column desktop command center.
- [x] Prioritize shift command, active delivery, pending offers, readiness/GPS, earnings snapshot, and quick actions.
- [x] Keep all existing shift mutation and location retry behavior.
- [x] Keep `OfferAlert` mounted for real-time offer behavior.

### Task 4: Verify, Commit, Push

**Files:**
- Modified files above plus this plan and the Phase 2 design spec.

- [x] Run focused dashboard tests.
- [x] Run full Driver app tests.
- [x] Run Driver typecheck, lint, and build.
- [x] Commit Phase 2.
- [x] Push to GitHub.
- [x] Verify Vercel production deployment is READY for the pushed commit.
