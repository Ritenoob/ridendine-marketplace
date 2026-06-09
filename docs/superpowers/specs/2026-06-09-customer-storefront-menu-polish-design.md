# Customer Storefront Menu Polish Design

## Goal

Improve the customer chef detail ordering area below the storefront hero so customers can scan the menu, understand the order minimum, and add dishes with a cleaner, more app-like layout.

## Problem

The storefront detail page now has a corrected hero image, but the menu area still feels basic compared with the rest of the customer app. The first menu panel is mostly a search/filter utility, dish photos are rendered as small CSS background blocks, and the order summary does not visually anchor the ordering flow strongly enough.

## Scope

- Polish only the customer storefront menu component used on `/chefs/[slug]`.
- Keep the existing cart context, add-to-cart behavior, checkout URLs, minimum-order helper, menu filtering, and category anchors.
- Keep RideNDine's existing white surface, warm background, orange primary, teal accent, and compact card language.
- Improve menu item photo formatting by using real `<img>` elements inside stable square frames.
- Add a clearer order-start panel with menu count, minimum order, and current cart count.
- Preserve the existing sticky mobile View Cart bar.

## Design

The menu area will become a focused ordering workspace:

1. A top order panel introduces the section with "Start your order", summary chips for dish count, minimum order, and cart count, then the existing search/category/dietary controls.
2. Menu item cards will move to a more customer-friendly layout with copy and price on the left and a stable square image frame on the right.
3. Image-backed dishes will render real `<img>` elements with `h-full w-full object-cover`; dishes without images keep a matching placeholder.
4. Featured dishes and category sections keep the same data, anchors, and add-to-cart wiring.
5. The order summary sidebar stays sticky on desktop and keeps existing cart, checkout, and minimum-order behavior.

## Testing

Add regression coverage proving:

- The menu renders a visible "Start your order" panel.
- The order panel shows dish count, minimum order, and cart count.
- Menu item photos render as real images with stable object-cover sizing.
- The image frame is not a background-image-only block.

## Verification

Run:

- `corepack pnpm --filter @ridendine/web test -- storefront-menu-phase2.test.tsx --runInBand`
- `corepack pnpm --filter @ridendine/web test -- --runInBand`
- `corepack pnpm --filter @ridendine/web typecheck`
- `corepack pnpm --filter @ridendine/web lint`
- `corepack pnpm --filter @ridendine/web build`
- `corepack pnpm smoke:responsive`

## Self-Review

- Placeholder scan: no TODO/TBD placeholders.
- Scope check: customer storefront menu polish only.
- Risk control: no API, schema, auth, payment, or checkout behavior changes.
