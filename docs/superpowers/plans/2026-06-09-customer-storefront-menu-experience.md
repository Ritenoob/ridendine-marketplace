# Customer Storefront Menu Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the customer storefront/menu page into a clearer food-ordering experience while preserving the existing RideNDine visual system.

**Architecture:** Add testable storefront-menu helpers, then update the existing client `StorefrontMenu` to provide featured items, search, dietary filters, category navigation, in-cart context, and minimum-order checkout readiness. Keep checkout/payment/API contracts unchanged.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS, Jest, React Testing Library, shared RideNDine UI tokens.

---

## File Structure

- Create `apps/web/src/lib/storefront-menu.ts`: pure helper functions for menu grouping, filtering, tags, prices, and minimum-order progress.
- Add `apps/web/__tests__/customer/storefront-menu-helpers.test.ts`: helper tests.
- Add `apps/web/__tests__/customer/storefront-menu-phase2.test.tsx`: component behavior tests.
- Modify `apps/web/src/components/storefront/storefront-menu.tsx`: new customer menu controls and cart readiness.
- Modify `apps/web/src/app/chefs/[slug]/page.tsx`: pass storefront name and minimum-order amount into the menu.
- Update this plan as verification steps complete.

---

### Task 1: Helper Regression Tests

**Files:**
- Create: `apps/web/__tests__/customer/storefront-menu-helpers.test.ts`
- Create: `apps/web/src/lib/storefront-menu.ts`

- [ ] Write failing tests for grouping by category sort order.
- [ ] Write failing tests for deriving unique dietary tags.
- [ ] Write failing tests for filtering by search and dietary tags.
- [ ] Write failing tests for minimum-order progress.
- [ ] Run `corepack pnpm --filter @ridendine/web test -- storefront-menu-helpers.test.ts --runInBand` and confirm it fails because the helper module does not exist.
- [ ] Implement the helper module.
- [ ] Run the focused helper test and confirm it passes.

### Task 2: Storefront UI Regression Tests

**Files:**
- Create: `apps/web/__tests__/customer/storefront-menu-phase2.test.tsx`
- Modify: `apps/web/src/components/storefront/storefront-menu.tsx`

- [ ] Mock `useCart`, `next/link`, and `@ridendine/ui` using the existing customer test style.
- [ ] Write failing tests for a featured section when `is_featured` items exist.
- [ ] Write failing tests for menu search hiding non-matching dishes.
- [ ] Write failing tests for dietary quick filters.
- [ ] Write failing tests for category anchor links.
- [ ] Write failing tests for in-cart item quantity display.
- [ ] Write failing tests for minimum-order progress and disabled checkout.
- [ ] Run `corepack pnpm --filter @ridendine/web test -- storefront-menu-phase2.test.tsx --runInBand` and confirm the intended failures.

### Task 3: Storefront Menu Implementation

**Files:**
- Modify: `apps/web/src/components/storefront/storefront-menu.tsx`
- Modify: `apps/web/src/app/chefs/[slug]/page.tsx`

- [ ] Extend `StorefrontMenuProps` with `storefrontName?: string` and `minOrderAmount?: number`.
- [ ] Pass `storefrontData.name` and `storefrontData.minOrderAmount` from `/chefs/[slug]`.
- [ ] Add search input with label `Search this menu`.
- [ ] Add category anchor navigation from grouped categories.
- [ ] Add dietary tag quick filters from helper-derived tags.
- [ ] Add featured strip above the category menu.
- [ ] Show current cart quantity per menu item.
- [ ] Add minimum-order progress to desktop sidebar and mobile sticky bar.
- [ ] Disable checkout links/buttons when the minimum order is not reached.
- [ ] Run focused component and helper tests until they pass.

### Task 4: Verification And Push

**Files:**
- All files above.

- [ ] Run focused Phase 2 tests.
- [ ] Run full customer web tests.
- [ ] Run `corepack pnpm --filter @ridendine/web typecheck`.
- [ ] Run `corepack pnpm --filter @ridendine/web lint`.
- [ ] Run `corepack pnpm --filter @ridendine/web build`.
- [ ] Run `git diff --check`.
- [ ] Commit Phase 2.
- [ ] Push to GitHub.
- [ ] Verify Vercel status checks for all four apps.
- [ ] Run `corepack pnpm smoke:responsive`.

---

## Self-Review

- Spec coverage: every Phase 2 requirement maps to a task.
- Scope control: checkout/payment/API behavior is unchanged.
- Placeholder scan: no TBD/TODO items.
- Risk control: helper logic is isolated and tested before React changes.
