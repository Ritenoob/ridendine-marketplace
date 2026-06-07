# Customer Account Order Workflow Spec

Recorded: 2026-06-07
Thread: Remaining issue Thread 6
Scope: customer web account/order workflow clarity

## Goal

Improve the customer account orders surface so a signed-in customer can quickly understand each order, what happens next, what action is available, and how to contact support with order context.

## Non-Goals

- Do not change payment capture, refunds, payouts, driver assignment, dispatch, or order lifecycle transitions.
- Do not add new order mutation endpoints.
- Do not change checkout pricing, cart ownership, or reorder API behavior.
- Do not expose internal engine status names as primary customer copy.

## Account Page States

- Auth loading: render no account content until auth resolution finishes.
- Unauthenticated: redirect to `/auth/login` after auth resolution.
- Authenticated: show the profile card and account navigation.
- Order entry point: keep `/account/orders` as the order history destination.

## Order List States

- Loading: show the existing spinner.
- API error: show the existing error card.
- Empty: show the existing no-orders empty state.
- Populated: each order row should show:
  - order number and created date;
  - customer-safe status label;
  - a short "next step" line;
  - storefront link when available;
  - total;
  - details action;
  - support action with order context;
  - reorder action only when the order is completed or delivered and has reorderable items.

## Order Detail And Confirmation States

- The canonical order detail/confirmation route remains `/orders/[id]/confirmation`.
- Protected order detail pages should continue to redirect unauthenticated users to `/auth/login`.
- Delivered or completed orders should keep the review form.
- The account order list should link to the canonical confirmation path for details.

## Support Handoff

- Each listed order should expose a support link that carries order context in the URL query string.
- The support handoff must include `orderId` and `orderNumber` when available.
- The support action is display/navigation only; it does not create a support ticket by itself.

## Status Model

Create a small customer-order workflow helper that maps raw order status into:

- `statusLabel`: customer-safe display text.
- `statusTone`: badge tone.
- `nextStepLabel`: short operational explanation.
- `primaryActionLabel`: details/review wording.
- `canReorder`: true only for delivered/completed orders that have at least one item.
- `supportHref`: `/contact` with encoded order context.

## Testing

- Add focused unit tests for the workflow helper before editing UI.
- Verify status labels, next-step labels, reorder availability, support handoff URLs, and canonical detail links.
- Run `pnpm --filter @ridendine/web test`, `typecheck`, `build`, `smoke:prod:contracts -- --require-auth`, `test:wiring-fixes`, and `git diff --check` before pushing.

## Success Criteria

- Customer order rows are clearer without changing lifecycle behavior.
- Reorder remains limited to completed/delivered orders with items.
- Every row has a support handoff with order context.
- Existing order and checkout routes keep passing runtime contracts.
