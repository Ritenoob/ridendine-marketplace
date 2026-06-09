# Customer Trust Repeat Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the customer app more trustworthy and easier to return to by wiring storefront favorites, saved-chef listing, storefront trust content, and server-owned reorder actions.

**Architecture:** Add small helper and presentational components around existing storefront/favorites/reorder APIs. Keep APIs, schema, checkout, and payment behavior unchanged. Use tests first for every customer-facing behavior change.

**Tech Stack:** Next.js 14 App Router, React 18, Jest, React Testing Library, Tailwind CSS, existing `@ridendine/ui`, existing customer APIs.

---

## File Structure

- Create `apps/web/src/lib/storefront-trust.ts`: delivery ETA, rating, trust highlight, and favorite storefront mapping helpers.
- Add `apps/web/__tests__/customer/storefront-trust-helpers.test.ts`: helper tests.
- Create `apps/web/src/components/storefront/storefront-actions.tsx`: client favorite/share controls for storefront header.
- Create `apps/web/__tests__/customer/storefront-actions.test.tsx`: favorite action tests.
- Create `apps/web/src/components/storefront/storefront-trust-panel.tsx`: storefront trust section.
- Create `apps/web/__tests__/customer/storefront-trust-panel.test.tsx`: trust panel tests.
- Modify `apps/web/src/components/storefront/storefront-header.tsx`: pass real favorite/share actions through a client component.
- Modify `apps/web/src/app/chefs/[slug]/page.tsx`: include storefront id/slug in header data, render trust panel, add reviews anchor.
- Modify `apps/web/src/app/account/favorites/page.tsx`: render saved storefronts from `/api/favorites`.
- Add `apps/web/__tests__/customer/favorites-page.test.tsx`: favorites page tests.
- Modify `apps/web/src/app/account/orders/page.tsx`: call `/api/orders/[id]/reorder` and redirect to cart.
- Add `apps/web/__tests__/customer/order-history-reorder.test.tsx`: order history reorder tests.
- Update this plan as tasks complete.

---

### Task 1: Storefront Trust Helpers

**Files:**
- Create: `apps/web/src/lib/storefront-trust.ts`
- Add: `apps/web/__tests__/customer/storefront-trust-helpers.test.ts`

- [ ] Write failing tests for delivery ETA formatting:

```ts
expect(formatStorefrontDeliveryEta(15, 35)).toBe('30-55 min delivery');
```

- [ ] Write failing tests for rating confidence copy:

```ts
expect(formatStorefrontRating(4.7, 18)).toBe('4.7 from 18 reviews');
expect(formatStorefrontRating(null, 0)).toBe('New chef on RideNDine');
```

- [ ] Write failing tests for trust highlights:

```ts
const highlights = buildStorefrontTrustHighlights({
  chefName: 'Asha',
  averageRating: 4.8,
  totalReviews: 22,
  estimatedPrepTimeMin: 15,
  estimatedPrepTimeMax: 35,
  minOrderAmount: 25,
});
expect(highlights.map((item) => item.label)).toEqual([
  'Approved chef',
  'Customer-rated',
  'Clear timing',
  'Secure checkout',
]);
```

- [ ] Run `corepack pnpm --filter @ridendine/web test -- storefront-trust-helpers.test.ts --runInBand` and confirm the helper module is missing.
- [ ] Implement the helper module with exported `formatStorefrontDeliveryEta`, `formatStorefrontRating`, `buildStorefrontTrustHighlights`, `formatFavoriteRating`, and `mapFavoriteStorefront`.
- [ ] Rerun the focused helper test and confirm it passes.

### Task 2: Storefront Trust Panel And Actions

**Files:**
- Create: `apps/web/src/components/storefront/storefront-actions.tsx`
- Add: `apps/web/__tests__/customer/storefront-actions.test.tsx`
- Create: `apps/web/src/components/storefront/storefront-trust-panel.tsx`
- Add: `apps/web/__tests__/customer/storefront-trust-panel.test.tsx`
- Modify: `apps/web/src/components/storefront/storefront-header.tsx`
- Modify: `apps/web/src/app/chefs/[slug]/page.tsx`

- [ ] Write failing tests proving the trust panel renders approved chef, rating, timing, secure checkout copy, and a link to `#reviews`.
- [ ] Write failing tests proving the favorite button loads current `/api/favorites` state and toggles `/api/favorites` on click.
- [ ] Write failing tests proving a `401` favorite response shows sign-in-required copy.
- [ ] Run focused tests and confirm component modules are missing or behavior is absent.
- [ ] Implement `StorefrontTrustPanel` using helper output and existing warm UI tokens.
- [ ] Implement `StorefrontActions` as a client component with favorite and share buttons.
- [ ] Update `StorefrontHeader` to receive `id` and `slug` and render `StorefrontActions`.
- [ ] Update `/chefs/[slug]` to pass `id`, `slug`, render `StorefrontTrustPanel`, and wrap the reviews block with `id="reviews"`.
- [ ] Rerun focused tests and confirm they pass.

### Task 3: Favorites Page

**Files:**
- Modify: `apps/web/src/app/account/favorites/page.tsx`
- Add: `apps/web/__tests__/customer/favorites-page.test.tsx`

- [ ] Write failing tests proving signed-in customers fetch `/api/favorites`.
- [ ] Write failing tests proving saved storefront cards render name, cuisines, rating, and menu link.
- [ ] Write failing tests proving remove calls `POST /api/favorites` and removes the card from the page.
- [ ] Run focused favorites tests and confirm current page only shows the empty/help state.
- [ ] Implement favorites loading, error, empty, list, and remove states.
- [ ] Rerun focused favorites tests and confirm they pass.

### Task 4: Order History Reorder Continuity

**Files:**
- Modify: `apps/web/src/app/account/orders/page.tsx`
- Add: `apps/web/__tests__/customer/order-history-reorder.test.tsx`

- [ ] Write failing tests proving the Reorder button calls `/api/orders/order-1/reorder`.
- [ ] Write failing tests proving success routes to `/cart?storefrontId=sf-1`.
- [ ] Write failing tests proving a failed reorder shows a readable error and does not navigate.
- [ ] Run focused order history tests and confirm the current implementation posts directly to `/api/cart`.
- [ ] Replace browser-side cart rebuilding with the reorder endpoint.
- [ ] Rerun focused order history tests and confirm they pass.

### Task 5: Verification And Push

**Files:**
- All files above.

- [ ] Run focused Phase 4 tests:

```bash
corepack pnpm --filter @ridendine/web test -- storefront-trust-helpers.test.ts storefront-actions.test.tsx storefront-trust-panel.test.tsx favorites-page.test.tsx order-history-reorder.test.tsx --runInBand
```

- [ ] Run full customer web tests:

```bash
corepack pnpm --filter @ridendine/web test -- --runInBand
```

- [ ] Run customer typecheck:

```bash
corepack pnpm --filter @ridendine/web typecheck
```

- [ ] Run customer lint:

```bash
corepack pnpm --filter @ridendine/web lint
```

- [ ] Run customer production build:

```bash
corepack pnpm --filter @ridendine/web build
```

- [ ] Run diff check:

```bash
git diff --check
```

- [ ] Commit Phase 4 implementation.
- [ ] Push to GitHub.
- [ ] Verify Vercel status checks for all four apps.
- [ ] Run `corepack pnpm smoke:responsive`.

---

## Self-Review

- Spec coverage: all Phase 4 requirements map to a task.
- Scope control: no schema, payment, checkout, dispatch, chef, driver, or ops changes.
- Placeholder scan: no TBD/TODO items.
- Risk control: existing APIs remain source of truth for favorites and reorder.
