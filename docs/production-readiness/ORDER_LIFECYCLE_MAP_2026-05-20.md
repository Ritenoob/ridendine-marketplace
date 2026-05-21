# Order Lifecycle Map - 2026-05-20

Sources:
- `packages/engine/src/orchestrators/order-state-machine.ts`
- `packages/types/src/engine/transitions.ts`
- `packages/engine/src/orchestrators/order-creation.service.ts`
- `packages/engine/src/orchestrators/master-order-engine.ts`
- `packages/engine/src/orchestrators/platform.engine.ts`
- `apps/web/src/app/api/checkout/route.ts`
- `apps/web/src/app/api/webhooks/stripe/route.ts`
- `apps/chef-admin/src/app/api/orders/[id]/route.ts`
- `apps/driver-app/src/app/api/deliveries/[id]/route.ts`
- `apps/ops-admin/src/app/api/orders/[id]/route.ts`
- `apps/ops-admin/src/app/api/engine/orders/[id]/route.ts`

Lifecycle status: PARTIAL

Post-fix update: payment provider capture is now explicitly automatic at checkout; pickup no longer declares capture side effects; partial refund payment status is canonicalized to `partially_refunded`; and the database constraint migration allows that value. Staging lifecycle, refund, and delivery sync tests are still required.

## Status Storage

| Field | Table | Purpose | Status |
| --- | --- | --- | --- |
| `orders.status` | `orders` | Legacy/public app status used by existing UI and some routes | PARTIAL - still coexists with engine status. |
| `orders.engine_status` | `orders` | Central engine lifecycle status | PASS/PARTIAL - state machine exists. |
| `orders.payment_status` | `orders` | Payment state | PARTIAL - partial refund mismatch fixed; sandbox refund replay required. |
| `orders.public_stage` | `orders` | Customer-facing public stage | PARTIAL - mapped from engine/legacy states. |
| `deliveries.status` | `deliveries` | Delivery lifecycle status | PARTIAL - must stay synchronized with order status. |
| `order_status_history` | table | Status/action audit trail | PASS/PARTIAL - engine writes history; full workflow QA required. |
| `domain_events` | table | Domain event stream | PASS/PARTIAL - events emitted; publisher/consumer not fully verified. |
| `ops_override_logs` | table | Ops override audit | PASS/PARTIAL. |

## Engine Order Statuses

| Status | Who can set it | API/code path | Stored in | UI displays | Allowed next statuses | Risk/issues |
| --- | --- | --- | --- | --- | --- | --- |
| `draft` | Customer/system | Order creation service from checkout | `orders.engine_status` | Checkout/internal | `checkout_pending` | Order can exist before confirmed payment; cleanup/reconciliation required. |
| `checkout_pending` | Customer/system | State machine supports it | `orders.engine_status` | Checkout/internal | `payment_authorized`, `payment_failed` | Checkout route appears to create draft then PaymentIntent; exact transition coverage needs tests. |
| `payment_authorized` | System | Stripe success/order creation service `authorizePayment` | `orders.engine_status` | Customer/order admin | `pending`, `cancelled` | Provider capture is automatic at checkout; status name still reflects local lifecycle vocabulary. |
| `payment_failed` | System | Stripe failed webhook/platform handler | `orders.engine_status` | Customer/order admin | `failed`, `cancelled` | Needs Stripe sandbox failed-payment test. |
| `pending` | System | Submit to kitchen after payment success | `orders.engine_status`, legacy `orders.status` mapped | Chef/ops/customer | `accepted`, `rejected`, `cancelled` | PASS/PARTIAL - kitchen submission exists; webhook timing needs QA. |
| `accepted` | Chef/ops | Chef order PATCH action `accept_order`; ops mapped actions | `orders.engine_status` | Chef/ops/customer | `preparing`, `cancelled`, `cancel_requested` | Needs SLA/notification QA. |
| `rejected` | Chef/ops/system | Chef reject or SLA auto-reject | `orders.engine_status` | Chef/ops/customer | `cancelled`, `failed` | Payment void/refund behavior needs sandbox validation. |
| `preparing` | Chef/system | Chef `start_preparing` action | `orders.engine_status` | Chef/ops/customer | `ready`, `cancelled`, `exception` | Prep SLA QA needed. |
| `ready` | Chef/ops | Chef `mark_ready`; platform calls dispatch | `orders.engine_status` | Chef/ops/customer | `dispatch_pending`, `cancelled` | Dispatch failure creates exceptions; staging needed. |
| `dispatch_pending` | System/ops | Dispatch orchestrator request | `orders.engine_status` | Ops/customer | `driver_offered`, `driver_assigned`, `cancelled`, `failed`, `exception` | Needs real driver pool QA. |
| `driver_offered` | System | Dispatch offer chain | `orders.engine_status` | Ops/customer | `driver_assigned`, `dispatch_pending`, `cancelled` | Offer expiry/decline QA needed. |
| `driver_assigned` | System/ops | Driver accepts offer or ops manual assign | `orders.engine_status` | Ops/customer/driver | `driver_en_route_pickup`, `dispatch_pending`, `cancelled`, `exception` | Reassignment and stale driver QA needed. |
| `driver_en_route_pickup` | Driver/ops | Driver delivery PATCH status | `orders.engine_status`, `deliveries.status` | Driver/ops/customer | `picked_up`, `cancelled`, `exception` | Delivery/order sync needs QA. |
| `picked_up` | Driver/ops | Driver confirms pickup | `orders.engine_status`, `deliveries.status` | Driver/ops/customer | `driver_en_route_dropoff`, `driver_en_route_customer`, `exception` | Provider capture side effect removed; delivery/order sync still needs QA. |
| `driver_en_route_dropoff` | Driver/system | Driver starts dropoff route | `orders.engine_status`, `deliveries.status` | Driver/ops/customer | `delivered`, `exception` | Runtime tracking QA needed. |
| `driver_en_route_customer` | Driver/system | Alternate customer-route status | `orders.engine_status` | Driver/ops/customer | `delivered`, `exception` | Overlaps with dropoff naming; status vocabulary should be simplified. |
| `delivered` | Driver/ops | Driver confirms delivery; platform completion | `orders.engine_status`, `deliveries.status` | Driver/ops/customer | `completed` | Proof/audit/manual override QA needed. |
| `completed` | System/ops | Platform completes delivered order | `orders.engine_status` | Ops/customer | `refund_pending`, `refunded`, `partially_refunded` | Payout scheduling and ledger reconciliation need staging validation. |
| `cancel_requested` | Customer | Customer cancel request | `orders.engine_status` | Customer/chef/ops | `cancelled`, `accepted` | Cancellation approval/denial UX needs QA. |
| `cancelled` | Customer/chef/ops/system | Cancel action or override | `orders.engine_status` | All apps | `refunded` | Payment void/refund needs Stripe validation. |
| `refund_pending` | Customer/ops | Refund request route/engine | `orders.engine_status` | Ops/customer | `refunded`, `partially_refunded` | Refund approval workflow needs QA. |
| `refunded` | Ops/finance/system | Refund processed/webhook | `orders.engine_status`, `orders.payment_status` | Ops/customer | Terminal | Full refund likely supported but needs sandbox validation. |
| `partially_refunded` | Ops/finance/system | Refund processed/webhook | `orders.engine_status`, `orders.payment_status` | Ops/customer | Terminal | PARTIAL - code/schema aligned; Stripe sandbox replay required. |
| `failed` | System/ops | Payment/dispatch/rejection failure | `orders.engine_status` | Ops/customer | Terminal | Failure reason/exception UX needs QA. |
| `exception` | System/ops | SLA/dispatch/delivery problem | `orders.engine_status` | Ops | `cancelled`, `failed`, or ops override | Exception resolution workflow needs QA. |

## Delivery Statuses

| Status | Who can set it | API/code path | Stored in | Allowed next statuses | Risk/issues |
| --- | --- | --- | --- | --- | --- |
| `unassigned` | System/ops | Dispatch create/reassign | `deliveries.status` | `offered`, `accepted`, `cancelled` | Needs no-driver case QA. |
| `offered` | System | Dispatch offer chain | `deliveries.status`, `assignment_attempts` | `accepted`, `unassigned`, `cancelled` | Offer expiry/decline QA needed. |
| `accepted` | Driver/ops | `/api/offers` accept or manual assign | `deliveries.status` | `en_route_to_pickup`, `unassigned`, `cancelled` | Driver ownership checks exist. |
| `en_route_to_pickup` | Driver/ops | `/api/deliveries/[id]` PATCH | `deliveries.status` | `arrived_at_pickup`, `picked_up`, `cancelled`, `failed` | Geolocation/proximity not proven. |
| `arrived_at_pickup` | Driver/ops | Delivery PATCH | `deliveries.status` | `picked_up`, `cancelled`, `failed` | Manual QA required. |
| `picked_up` | Driver/ops | Delivery PATCH/proof | `deliveries.status` | `en_route_to_dropoff`, `en_route_to_customer`, `failed` | Delivery/order sync and proof handling need QA. |
| `en_route_to_dropoff` | Driver/system | Delivery PATCH | `deliveries.status` | `arrived_at_dropoff`, `delivered`, `failed` | Tracking QA required. |
| `en_route_to_customer` | Driver/system | Delivery PATCH | `deliveries.status` | `arrived_at_dropoff`, `delivered`, `failed` | Overlapping status naming. |
| `arrived_at_dropoff` | Driver/ops | Delivery PATCH | `deliveries.status` | `delivered`, `failed` | Manual QA required. |
| `delivered` | Driver/ops | Delivery PATCH; platform completes order | `deliveries.status`, order engine status | Terminal | Proof/audit QA required. |
| `cancelled` | Ops/system | Delivery cancel/reassign/order cancel | `deliveries.status` | Terminal | Reassignment/cancel QA required. |
| `failed` | Driver/ops/system | Failed delivery | `deliveries.status`, exceptions | Terminal | Failed delivery handling not production-proven. |

## Payment Statuses

| Status | Stored in | Who sets it | Risk/issues |
| --- | --- | --- | --- |
| `pending` | `orders.payment_status` | Order creation | PASS/PARTIAL. |
| `processing` | `orders.payment_status` | Checkout/payment processing state | PARTIAL - local lifecycle vocabulary still needs long-term consolidation. |
| `completed` | `orders.payment_status` | Stripe success/payment completion | PARTIAL - sandbox required. |
| `failed` | `orders.payment_status` | Stripe payment failed | PARTIAL - sandbox required. |
| `refunded` | `orders.payment_status` | Full refund | PARTIAL - sandbox required. |
| `partially_refunded` | `orders.payment_status` | Platform refund handler/webhook | PARTIAL - allowed by DB; sandbox replay required. |

## Verified Transition Wiring

PASS/PARTIAL:
- Customer checkout creates orders and PaymentIntents.
- Stripe success submits paid orders to kitchen.
- Chef accept/reject/start/ready actions route through engine.
- Mark-ready triggers dispatch request.
- Dispatch creates deliveries and offers to drivers.
- Driver accept/decline route validates driver identity.
- Driver delivery route verifies assigned delivery ownership.
- Driver delivered route calls platform order completion.
- Ops order routes map legacy actions to engine actions.
- Ops override path exists and logs overrides.

## Lifecycle Risks

1. Multiple status vocabularies can drift: legacy enum, canonical enum, engine enum, payment status, delivery status, public stage.
2. Partial refund engine/database mismatch was fixed, but sandbox replay is still required.
3. Payment provider capture is automatic at checkout; local lifecycle terminology still needs consolidation.
4. Delivery status sync to order fields needs dedicated tests for every transition.
5. Ops override can force states; audit exists, but peer review should verify capability restrictions and operational policy.
6. Refund/cancel/failed-delivery flows need full manual QA before public testing.
