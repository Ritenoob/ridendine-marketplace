# Customer Homepage Card Polish Design

## Goal

Polish the customer homepage "Our Chefs" cards so they look like clean marketplace restaurant cards while preserving RideNDine colors, real food imagery, and the existing customer data flow.

## Problem

The previous image-sizing phase fixed photo dimensions, but the featured chef card still pulls the avatar/rating row upward with negative margin. On the live homepage this makes the orange chef badge and rating pill look clipped at the image/body boundary, especially on desktop. The card reads as unfinished even though the underlying images are correctly sized.

## Scope

- Fix only the customer homepage featured chef card composition.
- Keep real `<img>` cover rendering, `aspect-[16/9]`, and `object-cover`.
- Move chef logo/rating into the card body so no UI element is clipped by the image seam.
- Keep the current RideNDine palette, typography, badge styling, and chef/storefront data.
- Do not change checkout, storefront detail pages, chef admin, ops, driver, APIs, schema, or auth.

## Design

The featured chef card will use a simple marketplace structure:

1. Cover image frame at the top, unchanged as a stable `16:9` real image.
2. Body content below the image with a compact logo, chef name/byline, and rating pill in a single aligned row.
3. Cuisine badges and prep time remain below the title row.

This removes the negative overlap that caused the clipped visual while keeping the brand color signal through the chef logo fallback and rating chip.

## Testing

Add a customer layout regression test that proves:

- The featured chef logo is accessible as `${chef.name} logo`.
- The logo and rating are inside the card body, not pulled over the cover image.
- The featured chef card no longer uses `-mt-12` in its body layout.
- The existing `16:9` image regression test remains green.

## Verification

Run focused web layout tests, then the customer web gates and production smoke after push:

- `corepack pnpm --filter @ridendine/web test -- storefront-image-layout.test.tsx --runInBand`
- `corepack pnpm --filter @ridendine/web test -- --runInBand`
- `corepack pnpm --filter @ridendine/web typecheck`
- `corepack pnpm --filter @ridendine/web lint`
- `corepack pnpm --filter @ridendine/web build`
- `corepack pnpm smoke:responsive`

## Self-Review

- Placeholder scan: no TODO/TBD placeholders.
- Scope check: customer homepage card only.
- Risk control: layout-only change, no runtime contract or data changes.
