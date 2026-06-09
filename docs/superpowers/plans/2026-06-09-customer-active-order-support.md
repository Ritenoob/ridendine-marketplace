# Customer Active Order Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the customer post-checkout experience and fix storefront image sizing across customer and chef storefront surfaces.

**Architecture:** Keep order lifecycle and APIs unchanged. Add small customer helpers/components for order action links, query-prefilled support handoff, and stable image frames. Use focused tests first, then update existing customer and chef UI components in place.

**Tech Stack:** Next.js 14 App Router, React 18, Jest, React Testing Library, Tailwind CSS, existing `@ridendine/ui`, existing customer and chef app components.

---

## File Structure

- Create `apps/web/src/lib/order-support.ts`: customer-safe support URL and action-state helpers.
- Add `apps/web/__tests__/customer/order-support-helpers.test.ts`: helper tests.
- Create `apps/web/src/components/orders/order-action-panel.tsx`: post-checkout customer action panel.
- Add `apps/web/__tests__/customer/order-action-panel.test.tsx`: action panel tests.
- Modify `apps/web/src/app/orders/[id]/confirmation/page.tsx`: render action panel and pass delivered state.
- Modify `apps/web/src/app/contact/page.tsx`: prefill order number and subject from URL query params.
- Add `apps/web/__tests__/customer/contact-prefill.test.tsx`: support handoff tests.
- Modify `apps/web/src/components/home/featured-chefs.tsx`: stable cover image frame and image dimensions.
- Modify `apps/web/src/components/storefront/storefront-header.tsx`: stable storefront hero image frame.
- Modify `apps/web/src/app/account/favorites/page.tsx`: stable favorite card image frame.
- Add `apps/web/__tests__/customer/storefront-image-layout.test.tsx`: customer image layout tests.
- Modify `apps/chef-admin/src/components/storefront/storefront-form.tsx`: stable logo/cover previews and dimension guidance.
- Add `apps/chef-admin/src/__tests__/storefront-image-layout.test.tsx`: chef image layout tests.
- Update this plan as tasks complete.

---

### Task 1: Image Layout Regression Tests

**Files:**
- Add: `apps/web/__tests__/customer/storefront-image-layout.test.tsx`
- Add: `apps/chef-admin/src/__tests__/storefront-image-layout.test.tsx`

- [x] Write failing customer tests proving featured chef cover images render as `<img>` elements inside an `aspect-[16/9]` frame with `object-cover`.
- [x] Write failing customer tests proving storefront header cover images render inside an `aspect-[16/9]` mobile-safe hero with `object-cover`.
- [x] Write failing customer tests proving favorites cards use an `aspect-[16/9]` image frame.
- [x] Write failing chef tests proving storefront logo guidance says `Recommended 512 x 512 px`.
- [x] Write failing chef tests proving storefront cover guidance says `Recommended 1600 x 900 px` and the preview frame uses `aspect-[16/9]`.
- [x] Run:

```bash
corepack pnpm --filter @ridendine/web test -- storefront-image-layout.test.tsx --runInBand
corepack pnpm --filter @ridendine/chef-admin test -- storefront-image-layout.test.tsx --runInBand
```

- [x] Confirm the tests fail before implementation.

### Task 2: Storefront Image Sizing Implementation

**Files:**
- Modify: `apps/web/src/components/home/featured-chefs.tsx`
- Modify: `apps/web/src/components/storefront/storefront-header.tsx`
- Modify: `apps/web/src/app/account/favorites/page.tsx`
- Modify: `apps/chef-admin/src/components/storefront/storefront-form.tsx`

- [x] Replace featured-chef background images with real `<img>` elements.
- [x] Add `aspect-[16/9]`, `overflow-hidden`, and `object-cover` to featured chef cover frames.
- [x] Update storefront header hero to use an `aspect-[16/9]` image frame with responsive max height.
- [x] Update favorites cover frames to use `aspect-[16/9]` with real images.
- [x] Update chef logo preview with `h-20 w-20` and square guidance.
- [x] Update chef cover preview with `aspect-[16/9]`, responsive max height, and `1600 x 900` guidance.
- [x] Rerun both image layout test files and confirm they pass.

### Task 3: Customer Order Support Helpers

**Files:**
- Create: `apps/web/src/lib/order-support.ts`
- Add: `apps/web/__tests__/customer/order-support-helpers.test.ts`

- [x] Write failing tests for:

```ts
expect(buildOrderSupportHref('RD-1001')).toBe('/contact?orderNumber=RD-1001&subject=Help%20with%20order%20RD-1001');
expect(canReviewOrder('delivered', 'delivered')).toBe(true);
expect(canReorderOrder('completed', null)).toBe(true);
```

- [x] Run:

```bash
corepack pnpm --filter @ridendine/web test -- order-support-helpers.test.ts --runInBand
```

- [x] Confirm helper module is missing.
- [x] Implement `buildOrderSupportHref`, `canReviewOrder`, and `canReorderOrder`.
- [x] Rerun helper tests and confirm they pass.

### Task 4: Contact Prefill

**Files:**
- Modify: `apps/web/src/app/contact/page.tsx`
- Add: `apps/web/__tests__/customer/contact-prefill.test.tsx`

- [x] Write failing tests proving `/contact?orderNumber=RD-1001&subject=Help%20with%20order%20RD-1001` pre-fills order number and subject fields.
- [x] Write failing tests proving a normal `/contact` render keeps blank order and subject fields.
- [x] Run:

```bash
corepack pnpm --filter @ridendine/web test -- contact-prefill.test.tsx --runInBand
```

- [x] Confirm current contact page ignores query params.
- [x] Use `useSearchParams` to initialize `orderNumber` and `subject`.
- [x] Rerun contact tests and confirm they pass.

### Task 5: Order Action Panel

**Files:**
- Create: `apps/web/src/components/orders/order-action-panel.tsx`
- Add: `apps/web/__tests__/customer/order-action-panel.test.tsx`
- Modify: `apps/web/src/app/orders/[id]/confirmation/page.tsx`

- [x] Write failing tests proving the panel renders order number, storefront name, support link, and continue browsing link.
- [x] Write failing tests proving delivered/completed orders show review and reorder actions.
- [x] Run:

```bash
corepack pnpm --filter @ridendine/web test -- order-action-panel.test.tsx --runInBand
```

- [x] Confirm component is missing.
- [x] Implement `OrderActionPanel` using the helper functions.
- [x] Render it on the confirmation page below the confirmation banner and before/near the live tracker.
- [x] Rerun action panel tests and existing live tracker tests.

### Task 6: Verification And Push

**Files:**
- All files above.

- [x] Run focused Phase 5 tests:

```bash
corepack pnpm --filter @ridendine/web test -- storefront-image-layout.test.tsx order-support-helpers.test.ts contact-prefill.test.tsx order-action-panel.test.tsx live-order-tracker.test.tsx --runInBand
corepack pnpm --filter @ridendine/chef-admin test -- storefront-image-layout.test.tsx --runInBand
```

- [x] Run full customer web tests:

```bash
corepack pnpm --filter @ridendine/web test -- --runInBand
```

- [x] Run chef admin tests:

```bash
corepack pnpm --filter @ridendine/chef-admin test -- --runInBand
```

- [x] Run typecheck, lint, and build for touched apps:

```bash
corepack pnpm --filter @ridendine/web typecheck
corepack pnpm --filter @ridendine/web lint
corepack pnpm --filter @ridendine/web build
corepack pnpm --filter @ridendine/chef-admin typecheck
corepack pnpm --filter @ridendine/chef-admin lint
corepack pnpm --filter @ridendine/chef-admin build
```

- [x] Run:

```bash
git diff --check
corepack pnpm smoke:responsive
```

- [x] Commit Phase 5 implementation.
- [x] Push to GitHub.
- [x] Verify Vercel status checks for all four apps.
- [x] Run final production responsive smoke after Vercel is green.
- [x] Run production browser spot-checks for customer chef-card images and chef storefront image guidance/previews.

---

## Self-Review

- Spec coverage: Phase 5 order support and storefront image sizing are fully mapped.
- Scope control: no payment, dispatch, lifecycle, schema, driver, or ops runtime changes.
- Placeholder scan: no TBD/TODO items.
- Risk control: image changes are layout-only; order actions use existing review, reorder, and support routes.
