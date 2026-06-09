# Customer Cart Checkout Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the customer cart-to-checkout path clearer and more trustworthy by removing fake cart totals and adding checkout progress context.

**Architecture:** Add pure cart summary helpers and a presentational checkout progress component, then wire them into the existing cart and checkout pages. Keep cart, checkout, Stripe, and server quote APIs unchanged.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS, Jest, React Testing Library, shared RideNDine UI tokens.

---

## File Structure

- Create `apps/web/src/lib/cart-summary.ts`: subtotal, line total, item count, checkout href, and cart-fee disclosure helpers.
- Add `apps/web/__tests__/customer/cart-summary-helpers.test.ts`: helper tests.
- Add `apps/web/__tests__/customer/cart-checkout-clarity.test.tsx`: cart page behavior tests.
- Create `apps/web/src/components/checkout/checkout-progress.tsx`: two-step checkout progress UI.
- Add `apps/web/__tests__/checkout/checkout-progress.test.tsx`: progress component tests.
- Modify `apps/web/src/app/cart/page.tsx`: use subtotal-only summary and truthful fee messaging.
- Modify `apps/web/src/app/checkout/page.tsx`: render the checkout progress component and shared currency helper.
- Update this plan as verification steps complete.

---

### Task 1: Cart Summary Helper Tests

**Files:**
- Create: `apps/web/__tests__/customer/cart-summary-helpers.test.ts`
- Create: `apps/web/src/lib/cart-summary.ts`

- [x] Write failing tests for subtotal and item count calculations.
- [x] Write failing tests for line total and currency formatting.
- [x] Write failing tests for checkout href generation.
- [x] Write failing tests for cart fee disclosure copy.
- [x] Run `corepack pnpm --filter @ridendine/web test -- cart-summary-helpers.test.ts --runInBand` and confirm the helper module is missing.
- [x] Implement `cart-summary.ts`.
- [x] Rerun the focused helper test and confirm it passes.

### Task 2: Cart Page UI Tests

**Files:**
- Add: `apps/web/__tests__/customer/cart-checkout-clarity.test.tsx`
- Modify: `apps/web/src/app/cart/page.tsx`

- [x] Mock `useCart`, `next/navigation`, `next/link`, and `@ridendine/ui` using the existing customer test style.
- [x] Write failing tests that cart summary shows “Cart subtotal”.
- [x] Write failing tests that the cart page does not show hardcoded “Delivery fee”, “Service fee”, “HST”, or final “Total”.
- [x] Write failing tests that the mobile sticky bar says “Subtotal”.
- [x] Write failing tests for the checkout fee disclosure copy.
- [x] Run `corepack pnpm --filter @ridendine/web test -- cart-checkout-clarity.test.tsx --runInBand` and confirm the intended failures.
- [x] Update `cart/page.tsx` to use shared helpers and subtotal-only messaging.
- [x] Rerun the focused cart UI test and confirm it passes.

### Task 3: Checkout Progress Component

**Files:**
- Create: `apps/web/src/components/checkout/checkout-progress.tsx`
- Add: `apps/web/__tests__/checkout/checkout-progress.test.tsx`
- Modify: `apps/web/src/app/checkout/page.tsx`

- [x] Write failing tests for “Delivery details” and “Secure payment” step labels.
- [x] Write failing tests that the active step uses `aria-current="step"`.
- [x] Run `corepack pnpm --filter @ridendine/web test -- checkout-progress.test.tsx --runInBand` and confirm the component module is missing.
- [x] Implement `CheckoutProgress`.
- [x] Render `CheckoutProgress activeStep={checkoutStep}` near the checkout heading.
- [x] Rerun the focused progress test and confirm it passes.

### Task 4: Verification And Push

**Files:**
- All files above.

- [x] Run focused Phase 3 tests.
- [x] Run full customer web tests.
- [x] Run `corepack pnpm --filter @ridendine/web typecheck`.
- [x] Run `corepack pnpm --filter @ridendine/web lint`.
- [x] Run `corepack pnpm --filter @ridendine/web build`.
- [x] Run `git diff --check`.
- [ ] Commit Phase 3 implementation.
- [ ] Push to GitHub.
- [ ] Verify Vercel status checks for all four apps.
- [ ] Run `corepack pnpm smoke:responsive`.

---

## Self-Review

- Spec coverage: every cart/checkout clarity requirement maps to a task.
- Scope control: cart API, checkout API, Stripe, and server quote logic are unchanged.
- Placeholder scan: no TBD/TODO items.
- Risk control: pricing helper tests prevent cart from reintroducing client-side final-fee estimates.
