# Chef Readiness Workflow Design

## Goal

Make the chef app easier to operate during live kitchen service by showing the current kitchen step, next safe action, and pickup readiness for each active order.

## Current Wiring

The chef order workflow is already concentrated in:

- `apps/chef-admin/src/components/orders/orders-list.tsx`
- `apps/chef-admin/src/app/dashboard/orders/page.tsx`
- `apps/chef-admin/src/app/api/orders/[id]/route.ts`

The existing API contract is strong enough for this phase:

- Pending orders use `{ action: 'accept', status: 'accepted' }`.
- Accepted orders use `{ action: 'start_preparing', status: 'preparing' }`.
- Preparing orders use `{ action: 'mark_ready', status: 'ready_for_pickup' }`.
- Rejected orders use `{ action: 'reject', status: 'rejected', reason, notes }`.

The order list already renders customer context, delivery context, payment status, line items, realtime updates, and action buttons. What is missing is explicit kitchen guidance: chefs must infer the current step from badges and buttons.

## Approved Direction

Add a chef readiness layer to the existing orders list, without changing database schema, engine actions, or order API routes.

The order list will gain:

- A compact `Kitchen workflow` summary above filters.
- Per-order `Kitchen step` panels for active statuses.
- Explicit `Current step`, `Next action`, and readiness guidance.
- Clear pickup handoff language for `ready_for_pickup` orders.
- Better readable status labels in filters, badges, and workflow panels.

## Workflow States

The UI will map current order status to chef-facing work language:

| Order status | Current step | Next action | Guidance |
|---|---|---|---|
| `pending` | Accept or reject | Accept order | Review the ticket and accept before the countdown expires. |
| `accepted` | Prep setup | Start Preparing | Confirm items, timing, and any special instructions before cooking. |
| `preparing` | Kitchen work | Mark Ready | Finish, package, and mark ready only when the order can be handed to a driver. |
| `ready_for_pickup` | Pickup handoff | Waiting for driver | Keep the order sealed, staged, and visible for driver pickup. |

Other statuses remain visible but do not need new action controls in this phase.

## UX Shape

The `Kitchen workflow` summary will sit above the filter chips. It will show counts for:

- New decisions
- In prep
- Ready for pickup
- Late tickets

Each active order card will show a small workflow panel before customer/delivery/payment details:

- Current step label
- Next action label
- Short guidance sentence
- Ready timing when `estimated_ready_at` exists

The existing action buttons remain the source of actual state changes. The new workflow layer explains what those buttons mean in live service.

## Data Flow

No new API calls are required.

`OrdersList` will derive all workflow display state from existing `Order` fields:

- `status`
- `created_at`
- `estimated_ready_at`
- `actual_ready_at`
- `items`
- `delivery`

State changes still flow through the existing `updateOrderStatus()` helper and `PATCH /api/orders/[id]`.

## Error Handling

The current error banner remains unchanged. Failed actions will continue to display the existing API error message.

The new workflow panel does not add new error states because it is derived from already-loaded order data.

## Testing

Add a component test for `OrdersList` that verifies:

- The kitchen workflow summary renders counts for active orders.
- A pending order shows `Accept or reject`, `Next action`, and `Accept order`.
- A ready-for-pickup order shows `Pickup handoff` and `Waiting for driver`.
- Clicking `Mark Ready` sends the existing `{ action: 'mark_ready', status: 'ready_for_pickup' }` payload and updates the visible workflow state when the API returns the updated order.

Keep the existing chef smoke test and add string coverage for the new workflow labels.

## Boundaries

This phase will not:

- Change the database schema.
- Change engine state transitions.
- Change `PATCH /api/orders/[id]`.
- Add new chef exception workflows.
- Touch customer, driver, or ops app behavior.

## Rollback

Rollback is simple:

- Remove the new workflow summary and per-order workflow panel from `OrdersList`.
- Restore the previous filter/badge copy if needed.
- No data cleanup is required because no schema or API payload changes are introduced.

## Completion Evidence

Phase 6c is complete only when:

- The spec and implementation plan are committed.
- Chef order workflow tests are added.
- Chef app changes are pushed to GitHub.
- Vercel production deployments are ready.
- Chef production login/root or dashboard smoke check returns expected HTTP responses.
- The Obsidian execution plan records final commit and deployment evidence.
