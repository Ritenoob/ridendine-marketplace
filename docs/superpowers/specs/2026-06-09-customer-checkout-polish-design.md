# Customer Checkout Polish Design

## Goal

Polish the customer checkout page so the handoff from cart review into payment is clear, trustworthy, and easy to scan on mobile and desktop.

## Scope

This phase changes customer-facing checkout presentation only. It does not change cart math, order creation, Stripe behavior, saved-card behavior, promo validation, address selection, scheduling, or API contracts.

## Design

The checkout page keeps its existing two-step flow: delivery details first, secure payment second. A new checkout intro panel under the progress stepper frames the page as the final review before payment with three concise trust cues:

- Delivery details first
- Server-confirmed fees
- Secure Stripe payment

The details step keeps the current address, delivery time, driver tip, payment method, promo, and order summary sections. Existing section content remains intact, but the page gains clearer reassurance copy in the summary sidebar:

- Checkout confidence
- Cart subtotal shown now
- Fees lock before payment
- Edit before payment

The mobile sticky checkout bar keeps the same button behavior and subtotal, but adds a short note that fees are confirmed next. This prevents the customer from mistaking the subtotal for the final charge.

The payment step keeps the existing Stripe `Elements` handoff and back button. It gains a short payment-intro panel explaining that RideNDine has already confirmed fees and the next step is secure payment.

## Error Handling

Existing checkout error mapping remains unchanged. The existing error display in the payment summary card remains the single visible place for checkout failures.

## Testing

Add a customer checkout page regression test that mocks the loaded cart/address state and asserts the new checkout framing is visible. Continue to run the existing checkout progress, cart clarity, and sticky mobile tests. Full verification will include web tests, typecheck, lint, build, production responsive smoke, and GitHub/Vercel status checks.

## Self-Review

- Placeholder scan: no placeholders.
- Scope check: one customer checkout polish phase only.
- Contract check: no API, Stripe, order math, or route changes.
