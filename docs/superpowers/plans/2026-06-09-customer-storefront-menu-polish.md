# Customer Storefront Menu Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the customer storefront menu/order area so chef detail pages feel clearer and more app-like without changing cart or checkout wiring.

**Architecture:** Keep the existing `StorefrontMenu` component and helper APIs. Add focused regression tests, then update the order panel and menu item card markup/classes inside the same component so existing route data and cart context continue to flow unchanged.

**Tech Stack:** Next.js 14 App Router, React 18, Jest, React Testing Library, Tailwind CSS, existing RideNDine UI primitives.

---

## File Structure

- Modify `apps/web/__tests__/customer/storefront-menu-phase2.test.tsx`: add menu polish regression assertions.
- Modify `apps/web/src/components/storefront/storefront-menu.tsx`: add the order-start panel and stable real image frames for menu item cards.
- Update this plan as verification completes.

---

### Task 1: Failing Menu Polish Regression

**Files:**
- Modify: `apps/web/__tests__/customer/storefront-menu-phase2.test.tsx`

- [x] Add an image URL to the Butter Chicken fixture.
- [x] Add a test that renders `StorefrontMenu` with one cart item.
- [x] Assert the page has a `Start your order` heading.
- [x] Assert the order panel shows `3 dishes`, `Min. $25.00`, and `1 in cart`.
- [x] Assert the Butter Chicken menu image is a real image with `h-full`, `w-full`, and `object-cover`.
- [x] Assert the image parent has a stable square frame class.
- [x] Run:

```bash
corepack pnpm --filter @ridendine/web test -- storefront-menu-phase2.test.tsx --runInBand
```

- [x] Confirm the test fails because the current component has no order-start panel and uses a background image block.

### Task 2: Storefront Menu UI Polish

**Files:**
- Modify: `apps/web/src/components/storefront/storefront-menu.tsx`

- [x] Update `ImagePlaceholder` so it can fill the same square media frame used by real images.
- [x] Change `MenuItemCard` to use a stable grid/card layout with the item content on the left and media on the right.
- [x] Render item photos with `<img src={item.image_url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />`.
- [x] Move the featured label into the card content so it does not float over the wrong element.
- [x] Replace the current search utility card with an order-start panel that includes summary chips for dish count, minimum order, and cart count.
- [x] Preserve search input, category anchors, dietary filters, clear button, add-to-cart behavior, and sticky mobile cart bar.
- [x] Rerun:

```bash
corepack pnpm --filter @ridendine/web test -- storefront-menu-phase2.test.tsx --runInBand
```

- [x] Confirm focused storefront menu tests pass.

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

- [ ] Commit the storefront menu polish.
- [ ] Push to GitHub.
- [ ] Verify all four Vercel deployments are green for the pushed SHA.
- [ ] Run:

```bash
corepack pnpm smoke:responsive
```

- [ ] Browser spot-check `https://ridendine.ca/chefs/every-bite-yum`.

---

## Self-Review

- Spec coverage: every scoped design item maps to a task.
- Placeholder scan: no TODO/TBD placeholders.
- Scope control: customer storefront menu/order polish only.
