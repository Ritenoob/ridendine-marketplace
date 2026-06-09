# Customer Cart Handoff Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the customer cart review page so customers have a clearer, more reliable handoff from menu ordering into checkout.

**Architecture:** Keep the existing `/cart` page, cart context, and cart summary helper APIs. Add regression coverage to the existing cart clarity test, then update the cart page layout and copy without changing subtotal math, checkout links, or cart mutations.

**Tech Stack:** Next.js 14 App Router, React 18, Jest, React Testing Library, Tailwind CSS, existing RideNDine UI primitives.

---

## File Structure

- Modify `apps/web/__tests__/customer/cart-checkout-clarity.test.tsx`: add cart review handoff assertions.
- Modify `apps/web/src/app/cart/page.tsx`: add cart review header, responsive item rows, and checkout-confidence summary details.
- Update this plan as verification completes.

---

### Task 1: Failing Cart Handoff Regression

**Files:**
- Modify: `apps/web/__tests__/customer/cart-checkout-clarity.test.tsx`

- [x] Add a test named `frames the cart as a review handoff before checkout`.
- [x] Render `CartPage`.
- [x] Assert the page has a `Review your order` heading.
- [x] Assert the review panel shows `3 items`.
- [x] Assert the summary includes `Checkout confidence`, `Secure payment`, `Fees confirmed at checkout`, and `Edit until payment`.
- [x] Run:

```bash
corepack pnpm --filter @ridendine/web test -- cart-checkout-clarity.test.tsx --runInBand
```

- [x] Confirm the test fails because the current cart page has no review handoff header or confidence block.

### Task 2: Cart Review UI Polish

**Files:**
- Modify: `apps/web/src/app/cart/page.tsx`

- [x] Add a cart items card header with `Review your order`, `3 items`, and concise handoff text.
- [x] Change each cart item row from a single `flex` row to a responsive grid with item details and controls in separate areas.
- [x] Keep item images and placeholders at stable square dimensions.
- [x] Keep decrement, increment, remove, line total, and special instruction behavior unchanged.
- [x] Add a checkout-confidence block to the order summary sidebar with `Checkout confidence`, `Secure payment`, `Fees confirmed at checkout`, and `Edit until payment`.
- [x] Preserve the existing subtotal row, fee disclosure, checkout link, continue shopping link, and sticky mobile checkout bar.
- [x] Rerun:

```bash
corepack pnpm --filter @ridendine/web test -- cart-checkout-clarity.test.tsx --runInBand
corepack pnpm --filter @ridendine/web test -- sticky-mobile-bars.test.tsx --runInBand
```

- [x] Confirm focused cart and sticky mobile tests pass.

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

- [ ] Commit the cart handoff polish.
- [ ] Push to GitHub.
- [ ] Verify all four Vercel deployments are green for the pushed SHA.
- [ ] Run:

```bash
corepack pnpm smoke:responsive
```

- [ ] Browser spot-check `https://ridendine.ca/cart?storefrontId=sf-1` when authenticated session data is available; otherwise verify homepage smoke and deployed code.

---

## Self-Review

- Spec coverage: every scoped design item maps to a task.
- Placeholder scan: no TODO/TBD placeholders.
- Scope control: customer cart page handoff only.
