# Customer Confirmation And Tracking Polish Design

## Goal

Polish the customer order confirmation and live tracking experience so customers immediately understand that the order was received, what was charged, what kitchen is preparing it, and where live updates will appear.

## Scope

This phase changes presentation only. It does not change order lookup, authentication redirects, Supabase queries, order state mapping, live update subscriptions, delivery map behavior, cancellation rules, review rules, or support/reorder links.

## Design

The confirmation page will replace its inline success banner with a reusable `OrderConfirmationHero` component. The hero keeps the success state but adds a clearer post-checkout summary:

- `Order confirmed`
- receipt/update reassurance
- order number
- total paid
- kitchen name
- estimated delivery when available
- assigned driver first name when available

The existing `OrderActionPanel`, `LiveOrderTracker`, review form, and continue shopping action stay in the same order.

The live tracker will add a compact `Live order updates` card before the current status card. It explains that the page updates as the chef and driver move the order forward, and that customer-visible stages stay synced with operations and delivery. The existing tracker stepper, map, ETA, delivery details, cancel behavior, scheduled order notice, and terminal states remain unchanged.

## Testing

Add a focused test for the new `OrderConfirmationHero` component. Extend the existing `LiveOrderTracker` test to assert the new live-update reassurance copy is visible. Run focused confirmation/tracking tests first, then the full web gates, build, Vercel deployment status, and production responsive smoke.

## Self-Review

- Placeholder scan: no placeholders.
- Scope check: one customer confirmation/tracking polish phase only.
- Contract check: no API, state-machine, order math, or route behavior changes.
