# Customer Marketplace Experience Design

Recorded: 2026-06-09
Scope: customer-facing web app, Phase 1 onward

## Goal

Make the customer web app feel like a polished food-ordering marketplace while preserving the existing RideNDine color structure: warm cream background, white surfaces, orange primary actions, teal accents, and chef-first brand warmth.

## Visual Direction

- Keep the current light RideNDine marketplace feel.
- Do not use the dark blueprint reference screenshots as a visual target.
- Keep the shared token palette from `packages/ui/src/tokens.ts`.
- Use warm marketplace surfaces, restrained cards, orange calls to action, teal trust/availability accents, and compact mobile-first layouts.
- Avoid unrelated re-skins, new palettes, decorative blobs, or dashboard-style dark UI.

## Customer Journey

The customer should be able to move from first page load to an order with minimal thinking:

1. Decide where they are ordering for.
2. Search or browse cuisines.
3. Compare available chefs by open status, delivery time, rating, and minimum order.
4. Open a storefront and quickly understand the menu.
5. Customize items, add them to cart, and see the cart stay visible.
6. Confirm address, delivery time, fees, tax, tip, promo, and payment.
7. Track the order, get support, review, and reorder.

## Phase 1 Requirements

Phase 1 improves the top of the funnel without changing checkout, payment, or order lifecycle behavior.

- Replace the marketing-first home hero with an ordering-first marketplace hero.
- Keep chef signup content lower on the home page.
- Add a prominent customer search form that submits to `/chefs`.
- Add cuisine chips that deep-link to `/chefs?cuisine=...`.
- Show practical customer trust signals: Hamilton delivery, active chefs, live dishes, open-now discovery, and fast local delivery.
- Add discovery filter support for `openNow=true`.
- Add discovery sort support for `fastest`.
- Keep existing search, cuisine, rating, and sort behavior.
- Preserve mobile responsiveness and avoid horizontal overflow.

## Phase 2 Direction

Phase 2 should focus on storefront/menu conversion:

- Sticky category navigation.
- Popular/featured item rail.
- Item detail modal.
- Quantity controls.
- Special instructions.
- Required/optional modifiers using the existing `selectedOptions` backend support.
- Min-order progress.
- Better sold-out and unavailable item recovery.

## Phase 3 Direction

Phase 3 should focus on cart and checkout clarity:

- Use `/api/checkout/quote` earlier during checkout details.
- Show authoritative fees, tax, discounts, tip, and total before payment step.
- Improve empty address flow.
- Improve stale-cart and unavailable-item recovery.
- Align cart pricing display with server checkout quote behavior.

## Success Criteria

- The customer home page feels like the place to start an order.
- Customers can search and filter more naturally without losing the existing brand feel.
- Chef discovery supports `openNow` and `fastest` without breaking existing URLs.
- Phase 1 does not change checkout, payment, dispatch, driver, chef, or ops workflows.
- Tests, typecheck, lint, build, and production responsive smoke pass before push.
