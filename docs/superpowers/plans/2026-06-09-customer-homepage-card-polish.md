# Customer Homepage Card Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the customer homepage featured chef card layout so chef logos and rating chips no longer look clipped at the cover image seam.

**Architecture:** Keep the existing `FeaturedChefs` data loading and card component. Add a focused layout regression test, then move the avatar/rating row into a normal body header below the cover image while preserving the real `16:9` cover image frame.

**Tech Stack:** Next.js 14 App Router, React 18, Jest, React Testing Library, Tailwind CSS, existing `@ridendine/ui` card/badge components.

---

## File Structure

- Modify `apps/web/__tests__/customer/storefront-image-layout.test.tsx`: add a focused featured-card polish regression.
- Modify `apps/web/src/components/home/featured-chefs.tsx`: remove the negative-margin metadata row and render logo/rating in the body header.
- Update this plan as verification completes.

---

### Task 1: Failing Layout Regression

**Files:**
- Modify: `apps/web/__tests__/customer/storefront-image-layout.test.tsx`

- [x] Add a failing test named `renders featured chef card identity below the cover without a clipped overlap`.
- [x] In the test, render `FeaturedChefs({ limit: 3 })` with the existing `storefrontRow`.
- [x] Assert `screen.getByAltText('Every Bite Yum logo')` exists.
- [x] Assert the card body contains the logo and does not contain an element with `-mt-12`.
- [x] Run:

```bash
corepack pnpm --filter @ridendine/web test -- storefront-image-layout.test.tsx --runInBand
```

- [x] Confirm the test fails because the current logo alt text is `Every Bite Yum` and the body still uses `-mt-12`.

### Task 2: Featured Chef Card Polish

**Files:**
- Modify: `apps/web/src/components/home/featured-chefs.tsx`

- [x] Remove the `-mt-12` identity/rating row from the card body.
- [x] Render a normal body header with `flex items-start justify-between gap-3`.
- [x] Place the logo fallback in a fully visible `h-11 w-11 shrink-0 rounded-lg` frame.
- [x] Change logo image alt text to `${chef.name} logo`.
- [x] Keep the rating pill visible and right-aligned inside the body header.
- [x] Keep cuisine badges and prep time below the body header.
- [x] Rerun:

```bash
corepack pnpm --filter @ridendine/web test -- storefront-image-layout.test.tsx --runInBand
```

- [x] Confirm the focused layout tests pass.

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

- [x] Commit the Phase 6 customer card polish.
- [x] Push to GitHub.
- [x] Verify Vercel status checks for all four apps on the final SHA.
- [x] Run:

```bash
corepack pnpm smoke:responsive
```

- [x] Browser spot-check the live customer homepage cards after Vercel is green.

---

## Self-Review

- Spec coverage: every scoped requirement has a task.
- Placeholder scan: no TODO/TBD placeholders.
- Scope control: customer homepage card layout only.
