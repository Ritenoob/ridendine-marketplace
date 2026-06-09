# Customer Active Order Support Design

Recorded: 2026-06-09
Scope: customer web active order experience and storefront image sizing

## Goal

Phase 5 improves the customer experience after checkout and fixes storefront imagery so food photos render in predictable, professional dimensions across customer and chef-facing storefront surfaces.

## Requirements

- Customer chef cards, customer storefront headers, customer favorites cards, and chef storefront image previews must use stable aspect ratios, real image elements, and `object-fit: cover`.
- Chef storefront editing must show clear image dimension guidance for logo and cover photos.
- The order confirmation page must explain what happens next, not only show a generic confirmation banner.
- The live tracker must expose practical customer actions: view order details, contact support with order context, keep browsing, and review/reorder when the order is complete.
- Support links must pass order context using query parameters so the contact page can prefill order number and subject.
- The contact page must read `orderNumber` and `subject` query parameters without breaking normal blank contact form usage.

## Non-Goals

- Do not change payment, dispatch, driver assignment, chef order workflow, cancellation rules, review API, or reorder API behavior.
- Do not add new database tables or migrations.
- Do not implement real image upload changes in this phase; this phase fixes preview/display sizing and guidance only.
- Do not expose driver coordinates, driver photos, or private internal order states to customers.

## Image Layout

Customer chef cards should use a consistent marketplace card image ratio. The target is a `16:9` cover frame with responsive height controlled by aspect ratio instead of arbitrary height. The image should be a real `<img>` element with `object-cover`, `h-full`, and `w-full`; fallback surfaces remain warm brand color.

Customer storefront headers should use a wider hero ratio with minimum and maximum height constraints so a cover photo feels intentional on mobile and desktop. Logo/avatar images remain square and cropped consistently.

Chef storefront cover preview should use the same customer-facing cover ratio and show guidance: `Recommended 1600 x 900 px`. Logo guidance should be `Recommended 512 x 512 px`.

## Active Order Experience

The confirmation page should keep the existing live tracker as the source of truth but add a compact customer action panel near the tracker. It should show:

- order number;
- chef/storefront name;
- support handoff;
- continue browsing;
- review prompt when delivered;
- reorder prompt when delivered or completed.

The copy should remain customer-safe and simple. The tracker should still map public stages through the existing public-stage model.

## Support Handoff

Support URLs should use `/contact?orderNumber=...&subject=...`. The contact form should initialize those values from query params on first render. Manual edits must still work normally.

## Testing

- Add image layout tests for customer featured chef cards, customer storefront header, favorites cards, and chef storefront form previews.
- Add helper or component tests for support URL building and contact query prefill.
- Add confirmation/tracker tests that prove customer actions appear and delivered orders expose review/reorder paths.
- Existing customer tests, chef tests, typecheck, lint, build, Vercel status, and production responsive smoke must pass before Phase 5 is complete.

## Success Criteria

- Customer and chef storefront images have stable dimensions and no awkward layout jumps.
- Customers understand the next step after checkout and have a clear support path with order context.
- Delivered/completed orders expose review and reorder return paths without changing backend order lifecycle behavior.
- All touched surfaces preserve the warm RideNDine visual system.
