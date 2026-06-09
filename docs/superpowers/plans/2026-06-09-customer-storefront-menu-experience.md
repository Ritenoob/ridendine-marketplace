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

- [x] Write failing tests for grouping by category sort order.
- [x] Write failing tests for deriving unique dietary tags.
- [x] Write failing tests for filtering by search and dietary tags.
- [x] Write failing tests for minimum-order progress.
- [x] Run `corepack pnpm --filter @ridendine/web test -- storefront-menu-helpers.test.ts --runInBand` and confirm it fails because the helper module does not exist.
- [x] Implement the helper module.
- [x] Run the focused helper test and confirm it passes.

### Task 2: Storefront UI Regression Tests

**Files:**
- Create: `apps/web/__tests__/customer/storefront-menu-phase2.test.tsx`
- Modify: `apps/web/src/components/storefront/storefront-menu.tsx`

- [x] Mock `useCart`, `next/link`, and `@ridendine/ui` using the existing customer test style.
- [x] Write failing tests for a featured section when `is_featured` items exist.
- [x] Write failing tests for menu search hiding non-matching dishes.
- [x] Write failing tests for dietary quick filters.
- [x] Write failing tests for category anchor links.
- [x] Write failing tests for in-cart item quantity display.
- [x] Write failing tests for minimum-order progress and disabled checkout.
- [x] Run `corepack pnpm --filter @ridendine/web test -- storefront-menu-phase2.test.tsx --runInBand` and confirm the intended failures.

### Task 3: Storefront Menu Implementation

**Files:**
- Modify: `apps/web/src/components/storefront/storefront-menu.tsx`
- Modify: `apps/web/src/app/chefs/[slug]/page.tsx`

- [x] Extend `StorefrontMenuProps` with `storefrontName?: string` and `minOrderAmount?: number`.
- [x] Pass `storefrontData.name` and `storefrontData.minOrderAmount` from `/chefs/[slug]`.
- [x] Add search input with label `Search this menu`.
- [x] Add category anchor navigation from grouped categories.
- [x] Add dietary tag quick filters from helper-derived tags.
- [x] Add featured strip above the category menu.
- [x] Show current cart quantity per menu item.
- [x] Add minimum-order progress to desktop sidebar and mobile sticky bar.
- [x] Disable checkout links/buttons when the minimum order is not reached.
- [x] Run focused component and helper tests until they pass.

### Task 4: Verification And Push

**Files:**
- All files above.

- [x] Run focused Phase 2 tests.
- [x] Run full customer web tests.
- [x] Run `corepack pnpm --filter @ridendine/web typecheck`.
- [x] Run `corepack pnpm --filter @ridendine/web lint`.
- [x] Run `corepack pnpm --filter @ridendine/web build`.
- [x] Run `git diff --check`.
- [x] Commit Phase 2.
- [x] Push to GitHub.
- [x] Verify Vercel status checks for all four apps.
- [x] Run `corepack pnpm smoke:responsive`.

---

## Self-Review

- Spec coverage: every Phase 2 requirement maps to a task.
- Scope control: checkout/payment/API behavior is unchanged.
- Placeholder scan: no TBD/TODO items.
- Risk control: helper logic is isolated and tested before React changes.
