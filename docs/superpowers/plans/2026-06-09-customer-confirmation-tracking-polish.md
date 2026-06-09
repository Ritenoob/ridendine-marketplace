# Customer Confirmation And Tracking Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the customer order confirmation and live tracking pages so customers can quickly understand receipt, kitchen, ETA, and live update context after checkout.

**Architecture:** Extract the inline confirmation banner into a small testable component, then add tracker reassurance copy inside the existing `LiveOrderTracker`. Keep the route, Supabase query, order state resolution, delivery map, cancellation, and review behavior unchanged.

**Tech Stack:** Next.js 14 App Router, React 18, Jest, React Testing Library, Tailwind CSS, existing RideNDine UI primitives.

---

## File Structure

- Create `apps/web/src/components/orders/order-confirmation-hero.tsx`: reusable confirmation hero with order number, total, kitchen, ETA, and driver context.
- Create `apps/web/__tests__/customer/order-confirmation-hero.test.tsx`: focused component regression.
- Modify `apps/web/src/app/orders/[id]/confirmation/page.tsx`: replace inline banner with `OrderConfirmationHero`.
- Modify `apps/web/src/components/tracking/live-order-tracker.tsx`: add live-update reassurance card before status card.
- Modify `apps/web/__tests__/tracking/live-order-tracker.test.tsx`: assert reassurance copy renders.
- Update this plan as verification completes.

---

### Task 1: Failing Confirmation Hero Regression

**Files:**
- Create: `apps/web/__tests__/customer/order-confirmation-hero.test.tsx`

- [x] Mock `@ridendine/ui` `Card` as a simple section.
- [x] Render `OrderConfirmationHero` with `orderNumber="RD-1001"`, `total={42.5}`, `storefrontName="Every Bite Yum"`, `estimatedDeliveryMinutes={38}`, and `driverFirstName="Sean"`.
- [x] Assert the hero shows:
  - `Order confirmed`
  - `Receipt sent`
  - `Order RD-1001`
  - `$42.50`
  - `Every Bite Yum`
  - `38 min`
  - `Sean`
- [x] Run:

```bash
corepack pnpm --filter @ridendine/web test -- order-confirmation-hero.test.tsx --runInBand
```

- [x] Confirm the test fails because `OrderConfirmationHero` does not exist yet.

### Task 2: Failing Live Tracker Reassurance Regression

**Files:**
- Modify: `apps/web/__tests__/tracking/live-order-tracker.test.tsx`

- [x] Add a test named `explains that live updates stay connected to kitchen and driver progress`.
- [x] Render `LiveOrderTracker` with `defaultProps`.
- [x] Assert the tracker shows:
  - `Live order updates`
  - `Kitchen progress`
  - `Driver handoff`
  - `Support ready`
- [x] Run:

```bash
corepack pnpm --filter @ridendine/web test -- live-order-tracker.test.tsx --runInBand
```

- [x] Confirm the new test fails because the reassurance copy is not present yet.

### Task 3: Implement Confirmation And Tracker Polish

**Files:**
- Create: `apps/web/src/components/orders/order-confirmation-hero.tsx`
- Modify: `apps/web/src/app/orders/[id]/confirmation/page.tsx`
- Modify: `apps/web/src/components/tracking/live-order-tracker.tsx`

- [x] Create `OrderConfirmationHero` with props:

```ts
interface OrderConfirmationHeroProps {
  orderNumber: string;
  total: number;
  storefrontName: string;
  estimatedDeliveryMinutes: number | null;
  driverFirstName?: string | null;
}
```

- [x] Render a success card with `Order confirmed`, receipt/update reassurance, and stable summary rows for order, total, kitchen, ETA, and driver.
- [x] Import `OrderConfirmationHero` into `orders/[id]/confirmation/page.tsx`.
- [x] Replace the inline confirmation banner with `OrderConfirmationHero`.
- [x] Pass `typedOrder.order_number`, `Number(typedOrder.total)`, `storefrontName`, `estimatedDeliveryMinutes`, and `driverFirstName`.
- [x] Add a compact `Live order updates` card at the top of `LiveOrderTracker`.
- [x] Preserve `OrderActionPanel`, `LiveOrderTracker` props, review form visibility, continue shopping action, stepper, map, ETA, scheduled order notice, and cancel behavior.
- [x] Rerun:

```bash
corepack pnpm --filter @ridendine/web test -- order-confirmation-hero.test.tsx --runInBand
corepack pnpm --filter @ridendine/web test -- live-order-tracker.test.tsx --runInBand
corepack pnpm --filter @ridendine/web test -- order-action-panel.test.tsx --runInBand
corepack pnpm --filter @ridendine/web test -- cancel-ui.test.tsx --runInBand
```

- [x] Confirm focused confirmation, tracker, action panel, and cancel UI tests pass.

### Task 4: Verification, Push, And Live Check

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

- [x] Commit the confirmation/tracking polish.
- [x] Push to GitHub.
- [x] Verify all four Vercel deployments are green for the pushed SHA.
- [x] Run:

```bash
corepack pnpm smoke:responsive
```

- [x] Browser spot-check attempted; in-app browser URL policy blocked the deployed confirmation URL, so loaded-order UI is verified by focused tests plus production gates.

---

## Self-Review

- Spec coverage: every scoped design item maps to a task.
- Placeholder scan: no TODO/TBD placeholders.
- Scope control: customer confirmation and tracker presentation only.
