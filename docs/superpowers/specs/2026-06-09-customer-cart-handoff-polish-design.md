# Customer Cart Handoff Polish Design

## Goal

Improve the customer cart review page so the handoff from menu ordering to checkout feels clearer, safer, and more polished without changing checkout or payment behavior.

## Problem

The storefront menu is now a stronger ordering surface, but the cart page still presents items and totals in a basic layout. Customers need a clearer review moment before checkout: item count, quantity controls, subtotal, and fee disclosure should feel connected and reliable on both mobile and desktop.

## Scope

- Polish only the customer cart page at `/cart`.
- Keep the cart context, `fetchCart`, `updateQuantity`, `removeItem`, checkout URL, subtotal math, sticky mobile checkout bar, and fee disclosure unchanged.
- Do not add fake delivery fees, taxes, service fees, or final totals on the cart page.
- Improve mobile and desktop item row layout so quantity controls and line totals do not crowd item details.
- Add a clearer cart review panel and checkout-confidence details using existing RideNDine colors and compact card language.

## Design

The cart page will become a focused review handoff:

1. The page header stays simple, with "Your Cart" as the main page title.
2. The items card gets a "Review your order" header with item count and concise review context.
3. Each cart item row becomes a responsive grid: item photo/details first, then quantity controls and line total in a stable action area.
4. The order summary sidebar keeps truthful subtotal-only pricing, and adds a small checkout-confidence block for secure payment, server-confirmed fees, and editable cart contents.
5. The sticky mobile checkout bar remains intact and continues using subtotal language.

## Testing

Add regression coverage proving:

- The cart page renders a "Review your order" section.
- The section shows the total item count.
- The cart summary includes checkout-confidence labels.
- Existing truthful subtotal and fee disclosure behavior remains.

## Verification

Run:

- `corepack pnpm --filter @ridendine/web test -- cart-checkout-clarity.test.tsx --runInBand`
- `corepack pnpm --filter @ridendine/web test -- sticky-mobile-bars.test.tsx --runInBand`
- `corepack pnpm --filter @ridendine/web test -- --runInBand`
- `corepack pnpm --filter @ridendine/web typecheck`
- `corepack pnpm --filter @ridendine/web lint`
- `corepack pnpm --filter @ridendine/web build`
- `corepack pnpm smoke:responsive`

## Self-Review

- Placeholder scan: no TODO/TBD placeholders.
- Scope check: customer cart page only.
- Risk control: no API, schema, auth, payment, or checkout calculation changes.
