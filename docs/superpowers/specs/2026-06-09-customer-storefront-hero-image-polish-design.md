# Customer Storefront Hero Image Polish Design

## Goal

Fix the customer storefront detail hero image so chef photos do not render as an ultra-wide, over-cropped strip on desktop.

## Problem

The storefront detail header uses an `aspect-[16/9]` frame, but it also spans the full viewport and clamps height with `max-h-[360px]`. On wide desktop screens this produces an effective 5:1 image strip. The Every Bite Yum burger photo is then cropped so aggressively that the food image looks incorrectly formatted.

## Scope

- Fix only the customer storefront detail header at `/chefs/[slug]`.
- Keep the existing storefront data, route, menu, reviews, actions, and trust panels unchanged.
- Keep the cover image as a real `<img>` with `object-cover`.
- Bound the hero image inside the page container so the frame remains close to its intended visual ratio.
- Keep the storefront avatar/info/actions layout and current RideNDine visual language.

## Design

The cover media will move from full-viewport width into a contained media band:

1. Outer header remains a full-width surface with the existing border.
2. Cover frame sits inside `.container` with top padding, rounded corners, and shadow.
3. Frame keeps `aspect-[16/9]` and uses a higher safety max height so it cannot collapse into a narrow strip.
4. Storefront identity content continues to overlap the bottom of the image, but aligns to the same contained width.

This keeps the image prominent while preventing the over-cropped desktop strip shown in the screenshot.

## Testing

Add a regression test for `StorefrontHeader` proving:

- The cover frame is inside a `.container` wrapper.
- The cover frame no longer uses `max-h-[360px]`.
- The cover frame keeps `aspect-[16/9]`.
- The cover image remains `object-cover`.

## Verification

Run:

- `corepack pnpm --filter @ridendine/web test -- storefront-image-layout.test.tsx --runInBand`
- `corepack pnpm --filter @ridendine/web test -- --runInBand`
- `corepack pnpm --filter @ridendine/web typecheck`
- `corepack pnpm --filter @ridendine/web lint`
- `corepack pnpm --filter @ridendine/web build`
- `corepack pnpm smoke:responsive`

## Self-Review

- Placeholder scan: no TODO/TBD placeholders.
- Scope check: customer storefront detail hero only.
- Risk control: layout-only change, no data/API/schema/auth changes.
