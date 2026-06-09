# Customer Storefront Hero Image Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the customer storefront detail hero image so uploaded chef photos do not render as a full-width, over-cropped desktop strip.

**Architecture:** Keep the existing `StorefrontHeader` component and data contract. Add a regression test, then constrain the hero media inside the page container while preserving a real `16:9` image frame and existing identity/action content.

**Tech Stack:** Next.js 14 App Router, React 18, Jest, React Testing Library, Tailwind CSS, existing customer storefront components.

---

## File Structure

- Modify `apps/web/__tests__/customer/storefront-image-layout.test.tsx`: add storefront hero formatting assertions.
- Modify `apps/web/src/components/storefront/storefront-header.tsx`: constrain the cover media band and remove the narrow-strip height clamp.
- Update this plan as verification completes.

---

### Task 1: Failing Storefront Hero Regression

**Files:**
- Modify: `apps/web/__tests__/customer/storefront-image-layout.test.tsx`

- [x] Update `renders storefront header covers in a stable 16:9 hero frame`.
- [x] Assert the cover frame is inside a `.container` wrapper.
- [x] Assert the cover frame does not have `max-h-[360px]`.
- [x] Assert the cover frame keeps `aspect-[16/9]`.
- [x] Assert the cover image keeps `object-cover`.
- [x] Run:

```bash
corepack pnpm --filter @ridendine/web test -- storefront-image-layout.test.tsx --runInBand
```

- [x] Confirm the test fails because the current cover frame is full-width and uses `max-h-[360px]`.

### Task 2: Storefront Hero Media Polish

**Files:**
- Modify: `apps/web/src/components/storefront/storefront-header.tsx`

- [x] Wrap the cover frame in a `container` with `py-4 sm:py-6`.
- [x] Change the cover frame to `relative aspect-[16/9] max-h-[560px] overflow-hidden rounded-2xl bg-primarySoft shadow-sm`.
- [x] Keep the cover image `h-full w-full object-cover`.
- [x] Keep the subtle gradient overlay.
- [x] Keep the identity row below using the existing `container`.
- [x] Rerun:

```bash
corepack pnpm --filter @ridendine/web test -- storefront-image-layout.test.tsx --runInBand
```

- [x] Confirm focused storefront image layout tests pass.

### Task 3: Verification And Push

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

- [x] Commit the storefront hero polish.
- [x] Push to GitHub.
- [x] Verify all four Vercel deployments are green for the pushed SHA.
- [x] Run:

```bash
corepack pnpm smoke:responsive
```

- [x] Browser spot-check `https://ridendine.ca/chefs/every-bite-yum#reviews`.

---

## Self-Review

- Spec coverage: all scoped requirements have a task.
- Placeholder scan: no TODO/TBD placeholders.
- Scope control: customer storefront detail hero image only.
