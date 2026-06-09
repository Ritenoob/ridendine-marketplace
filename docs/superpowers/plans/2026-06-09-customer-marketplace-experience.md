# Customer Marketplace Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the customer web app into a cleaner, easier ordering experience while preserving the existing RideNDine brand feel.

**Architecture:** Phase 1 stays in the customer web app and shared DB storefront sorting. It adds a home marketplace hero, discovery filter helpers, open-now filtering, and fastest-delivery sorting without touching checkout/payment behavior.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS, Jest, Supabase repository helpers, shared RideNDine UI tokens.

---

## File Structure

- Create `apps/web/src/components/home/customer-marketplace-hero.tsx`: ordering-first home hero using existing brand colors.
- Modify `apps/web/src/app/page.tsx`: replace the old hero section with the new marketplace hero.
- Create `apps/web/src/lib/discovery.ts`: reusable open-now and filter-state helpers.
- Modify `apps/web/src/components/chefs/chefs-list.tsx`: use shared discovery helpers and support `openNow`.
- Modify `apps/web/src/components/chefs/chefs-filters.tsx`: add `openNow` and `fastest` controls.
- Modify `apps/web/src/app/chefs/page.tsx`: parse and pass `openNow`.
- Modify `packages/db/src/repositories/storefront.repository.ts`: support `fastest` sorting.
- Add `apps/web/__tests__/customer/customer-marketplace-phase1.test.tsx`: hero/filter component tests.
- Add `apps/web/__tests__/customer/discovery-helpers.test.ts`: helper tests.

---

### Task 1: Phase 1 Regression Tests

**Files:**
- Create: `apps/web/__tests__/customer/customer-marketplace-phase1.test.tsx`
- Create: `apps/web/__tests__/customer/discovery-helpers.test.ts`

- [x] Write tests for the new home hero search form, cuisine chips, and brand classes.
- [x] Write tests for discovery helper behavior: open-now matching, active filters, and fastest sort normalization.
- [x] Run focused tests and confirm they fail before implementation.

### Task 2: Marketplace Home Hero

**Files:**
- Create: `apps/web/src/components/home/customer-marketplace-hero.tsx`
- Modify: `apps/web/src/app/page.tsx`

- [x] Implement `CustomerMarketplaceHero` using existing background/surface/primary/accent tokens.
- [x] Add search form submitting to `/chefs`.
- [x] Add cuisine chips deep-linking to `/chefs?cuisine=...`.
- [x] Replace the old home hero section with the new component.
- [x] Run focused hero tests and confirm they pass.

### Task 3: Discovery Filters

**Files:**
- Create: `apps/web/src/lib/discovery.ts`
- Modify: `apps/web/src/components/chefs/chefs-list.tsx`
- Modify: `apps/web/src/components/chefs/chefs-filters.tsx`
- Modify: `apps/web/src/app/chefs/page.tsx`
- Modify: `packages/db/src/repositories/storefront.repository.ts`

- [x] Implement open-now helper and active-filter helper.
- [x] Add `openNow=true` parsing and filtering.
- [x] Add `fastest` sort support in UI and repository.
- [x] Keep existing search/cuisine/rating/sort URLs working.
- [x] Run focused discovery tests and confirm they pass.

### Task 4: Verification And Push

**Files:**
- All files above.

- [x] Run focused customer tests.
- [x] Run `corepack pnpm --filter @ridendine/web typecheck`.
- [x] Run `corepack pnpm --filter @ridendine/web lint`.
- [x] Run `corepack pnpm --filter @ridendine/web build`.
- [ ] Run `corepack pnpm smoke:responsive`.
- [ ] Commit Phase 1.
- [ ] Push to GitHub.
- [ ] Verify Vercel status checks for all four apps.

---

## Self-Review

- Spec coverage: Phase 1 targets home and discovery only.
- Placeholder scan: no TBD/TODO items.
- Risk control: checkout, payment, dispatch, chef, driver, and ops flows are out of scope for this phase.
