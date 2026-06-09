# Customer Checkout Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the customer checkout page so customers understand the final review, server-confirmed fees, and secure payment handoff.

**Architecture:** Keep the existing `/checkout` page and checkout API flow. Add a page-level regression test, then add presentation-only copy and layout blocks to the checkout page without changing payment/order behavior.

**Tech Stack:** Next.js 14 App Router, React 18, Jest, React Testing Library, Tailwind CSS, existing RideNDine UI primitives.

---

## File Structure

- Create `apps/web/__tests__/checkout/checkout-page-polish.test.tsx`: page-level checkout UI regression with mocked cart, addresses, Stripe, and navigation.
- Modify `apps/web/src/app/checkout/page.tsx`: add checkout intro, summary confidence copy, payment-step helper copy, and mobile sticky helper text.
- Update this plan as each verification step completes.

---

### Task 1: Failing Checkout Polish Regression

**Files:**
- Create: `apps/web/__tests__/checkout/checkout-page-polish.test.tsx`

- [x] Add mocks for `next/navigation`, `@stripe/stripe-js`, `@stripe/react-stripe-js`, `@/components/layout/header`, `@/components/checkout/saved-card-selector`, and `@/hooks/use-eta`.
- [x] Mock `global.fetch` so `/api/cart?storefrontId=sf-1` returns a cart with two items and `/api/addresses` returns one saved address.
- [x] Render `CheckoutPage`.
- [x] Assert the loaded checkout page shows:
  - `Finish your order`
  - `Delivery details first`
  - `Server-confirmed fees`
  - `Secure Stripe payment`
  - `Checkout confidence`
  - `Cart subtotal shown now`
  - `Fees lock before payment`
  - `Edit before payment`
- [x] Run:

```bash
corepack pnpm --filter @ridendine/web test -- checkout-page-polish.test.tsx --runInBand
```

- [x] Confirm the test fails because the checkout page does not yet show the new polish copy.

### Task 2: Checkout UI Polish

**Files:**
- Modify: `apps/web/src/app/checkout/page.tsx`

- [x] Add a compact checkout intro panel below `CheckoutProgress` with `Finish your order` and the three trust cues.
- [x] Add a `Checkout confidence` block to the payment summary card during the details step.
- [x] Keep the server-authoritative subtotal/fee language unchanged.
- [x] Add payment-step helper copy above `StripePaymentForm` explaining the total has been confirmed before secure payment.
- [x] Add a short helper line to the mobile sticky checkout bar: `Fees confirmed next`.
- [x] Preserve cart fetch, address fetch, delivery scheduling, tipping, promo validation, saved-card selection, checkout POST payload, Stripe setup, and redirect behavior.
- [x] Rerun:

```bash
corepack pnpm --filter @ridendine/web test -- checkout-page-polish.test.tsx --runInBand
corepack pnpm --filter @ridendine/web test -- checkout-progress.test.tsx --runInBand
corepack pnpm --filter @ridendine/web test -- cart-checkout-clarity.test.tsx --runInBand
corepack pnpm --filter @ridendine/web test -- sticky-mobile-bars.test.tsx --runInBand
```

- [x] Confirm focused checkout, cart, and mobile sticky tests pass.

### Task 3: Verification, Push, And Live Check

**Files:**
- All files above.

- [x] Run:

```bash
corepack pnpm --filter @ridendine/web test -- --runInBand
corepack pnpm --filter @ridendine/web typecheck
corepack pnpm --filter @ridendine/web lint
corepack pnpm --filter @ridendine/web build
git diff --check
```

- [x] Commit the checkout polish.
- [x] Push to GitHub.
- [x] Verify all four Vercel deployments are green for the pushed SHA.
- [x] Run:

```bash
corepack pnpm smoke:responsive
```

- [x] Browser spot-check `https://ridendine.ca/checkout?storefrontId=sf-1`; current browser session redirected to login with no horizontal overflow, so loaded-cart checkout UI is verified by focused tests plus production gates.

---

## Self-Review

- Spec coverage: every scoped design item maps to a task.
- Placeholder scan: no TODO/TBD placeholders.
- Scope control: customer checkout polish only.
