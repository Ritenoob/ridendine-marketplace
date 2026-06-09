# Responsive Brand Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix production mobile/desktop responsive gaps and align the shared brand logo with the official RideNDine mark.

**Architecture:** Keep changes scoped to existing app surfaces: shared UI logo, Chef header layout, Driver route/login redirect safety, Customer CSP, and a reusable Playwright smoke script. Use regression checks before production code changes and verify locally before pushing.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS, Jest, Node test runner, Playwright, Vercel production checks.

---

## File Structure

- Modify `packages/ui/src/assets/logo.tsx`: official color order and icon asset rendering.
- Modify `apps/chef-admin/src/components/layout/header.tsx`: mobile header overflow fix.
- Modify `apps/chef-admin/src/app/dashboard/layout.tsx`: dashboard shell shrink/overflow constraint.
- Add `apps/chef-admin/src/__tests__/header-responsive.test.ts`: header contract test.
- Modify `apps/driver-app/src/app/auth/login/page.tsx`: safe redirect normalization.
- Add `apps/driver-app/src/app/dashboard/page.tsx`: compatibility redirect to Driver home.
- Add `apps/driver-app/src/app/auth/login/redirect-target.ts`: shared redirect helper.
- Add `apps/driver-app/src/__tests__/login-redirect-target.test.ts`: redirect helper regression tests.
- Add `apps/driver-app/src/__tests__/dashboard-compat-route.test.ts`: compatibility route regression test.
- Modify `apps/web/next.config.js`: CSP/image remote policy.
- Add `scripts/smoke/responsive-production-smoke.cjs`: production responsive audit.
- Add `scripts/smoke/responsive-production-smoke.test.cjs`: smoke configuration tests.
- Modify `package.json`: add `smoke:responsive`.
- Add this plan and the design spec.

---

### Task 1: Responsive Smoke Tests

**Files:**
- Create: `scripts/smoke/responsive-production-smoke.test.cjs`
- Create: `scripts/smoke/responsive-production-smoke.cjs`
- Modify: `package.json`

- [x] Write a failing Node test that imports `responsive-production-smoke.cjs`, expects Customer/Ops/Chef/Driver targets, expects mobile and desktop viewports, and expects Driver to use `/auth/login?redirect=%2F` rather than `/dashboard`.
- [x] Run `node --test scripts/smoke/responsive-production-smoke.test.cjs` and confirm it fails because the smoke module does not exist.
- [x] Implement the smoke module with exported `TARGETS`, `VIEWPORTS`, `isMeaningfulOverflow`, and `runResponsiveSmoke`.
- [x] Add `smoke:responsive` to `package.json`.
- [x] Run the Node test again and confirm it passes.

### Task 2: Driver Redirect Hardening

**Files:**
- Create: `apps/driver-app/src/app/auth/login/redirect-target.ts`
- Create: `apps/driver-app/src/__tests__/login-redirect-target.test.ts`
- Create: `apps/driver-app/src/app/dashboard/page.tsx`
- Create: `apps/driver-app/src/__tests__/dashboard-compat-route.test.ts`
- Modify: `apps/driver-app/src/app/auth/login/page.tsx`

- [x] Write redirect helper tests for `/`, `/profile`, `/settings`, `/dashboard`, full external URLs, protocol-relative URLs, and empty values.
- [x] Write a route-file test that asserts `/dashboard` redirects to `/`.
- [x] Run the focused Driver tests and confirm they fail before implementation.
- [x] Implement `resolveDriverRedirectTarget`, use it from login, and add the `/dashboard` redirect page.
- [x] Run focused Driver tests and confirm they pass.

### Task 3: Chef Header Mobile Overflow

**Files:**
- Create: `apps/chef-admin/src/__tests__/header-responsive.test.ts`
- Modify: `apps/chef-admin/src/components/layout/header.tsx`
- Modify: `apps/chef-admin/src/app/dashboard/layout.tsx`

- [x] Write a header test that asserts the mobile logo uses the compact icon variant and the header/right-control classes include `min-w-0`, constrained gaps, and shrink behavior.
- [x] Run the focused Chef test and confirm it fails before implementation.
- [x] Update header classes to constrain mobile layout.
- [x] Add a dashboard-shell regression check and constrain the shell with `min-w-0` and `overflow-x-hidden`.
- [x] Run the focused Chef test and confirm it passes.

### Task 4: Official Logo Alignment

**Files:**
- Modify: `packages/ui/src/assets/logo.tsx`

- [x] Update the shared wordmark so `RideN` uses accent teal and `Dine` uses primary orange.
- [x] Replace the icon fallback drawing with an SVG-wrapped `/logo-icon.png` image reference while keeping the public `Logo` API stable.
- [x] Run relevant UI-consuming app tests and lint.

### Task 5: Customer CSP And Image Policy

**Files:**
- Modify: `apps/web/next.config.js`

- [x] Add `images.unsplash.com` to `images.remotePatterns`.
- [x] Add `images.unsplash.com` to `img-src`.
- [x] Add Vercel analytics script/connect hosts required by the production console errors.
- [x] Run web lint/build or a focused config check.

### Task 6: Verification, Push, Deployment

**Files:**
- All files above.

- [x] Run focused Node, Driver, and Chef tests.
- [x] Run affected app typecheck/lint/build.
- [x] Run `pnpm smoke:responsive` against production after deployment.
- [x] Commit implementation.
- [x] Push to GitHub.
- [x] Verify GitHub/Vercel status checks for all four apps.
- [x] Verify production responsive smoke against final commit.

---

## Self-Review

- Spec coverage: every responsive finding has a task.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: helper names and file paths are consistent across tasks.
