# QA Test Plan - 2026-05-20

Status: DRAFT FOR STAGING

Use this plan only against staging or local test data. Do not run destructive fixture reset or payment/refund tests against production data.

Post-fix update: P0 code fixes were applied. QA should now verify automatic Stripe capture at checkout, canonical `partially_refunded` refunds, private delivery proof access, canonical SLA processor scheduling, and distributed rate-limit readiness.

## Staging Preconditions

- Fresh staging Supabase project or disposable database with all migrations applied.
- Non-production Stripe sandbox account with webhook forwarding configured.
- Test customer, approved chef, ops admin, approved driver, and finance-capable ops user.
- At least one active storefront with verified kitchen coordinates and active delivery zone.
- Menu with required and optional modifiers, available and unavailable items, and sold-out scenario.
- Driver online with fresh location near the kitchen.
- `CRON_SECRET`, `ENGINE_PROCESSOR_TOKEN`, and distributed rate-limit provider configured.
- Email/SMS/push providers configured with sandbox-safe recipients or disabled test mode.
- Browser matrix: desktop Chrome, mobile viewport, one real mobile device for driver app.

## Customer Tests

| Test ID | User role | Scenario | Steps | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CUST-001 | Customer | Sign up | Open customer app, create account with unique email, verify profile exists. | Account created, session active, customer profile created. | TBD | NEEDS MANUAL TEST | Check email verification behavior if enabled. |
| CUST-002 | Customer | Log in/log out | Log in, reload page, log out, access account route. | Session persists after reload; logout prevents account access. | TBD | NEEDS MANUAL TEST | Run on desktop and mobile. |
| CUST-003 | Customer | Browse chefs | Visit `/chefs`, filter/search if available, open storefront. | Approved active storefronts render; inactive/unapproved storefronts hidden. | TBD | NEEDS MANUAL TEST | Verify no private chef/customer data exposed. |
| CUST-004 | Customer | Browse menu | Open storefront menu with categories/options. | Available items/options render with correct prices. | TBD | NEEDS MANUAL TEST | Include required modifier item. |
| CUST-005 | Customer | Add item to cart | Add item with required option and quantity. | Cart updates with item, modifiers, subtotal. | TBD | NEEDS MANUAL TEST | Verify server cart after refresh. |
| CUST-006 | Customer | Change quantity/remove | Increase, decrease, remove item. | Totals update; empty cart state displays after removal. | TBD | NEEDS MANUAL TEST | Verify no negative quantities. |
| CUST-007 | Customer | Stale price protection | Change menu price in chef/admin after item is in cart, then quote/checkout. | Checkout blocks or refreshes price; frontend price not trusted. | TBD | NEEDS MANUAL TEST | Server quote should win. |
| CUST-008 | Customer | Delivery address validation | Add address outside delivery zone, attempt quote. | Checkout rejects address with clear error. | TBD | NEEDS MANUAL TEST | Test missing lat/lng as well. |
| CUST-009 | Customer | Successful checkout | Add valid item/address, pay with Stripe sandbox success card. | PaymentIntent succeeds, order created, cart clears, order submitted to chef. | TBD | NEEDS MANUAL TEST | Verify webhook result and order history. |
| CUST-010 | Customer | Failed payment | Pay with Stripe sandbox decline card. | Payment fails; order marked failed/cancelled appropriately; cart remains or recovery is clear. | TBD | NEEDS MANUAL TEST | Verify no kitchen submission. |
| CUST-011 | Customer | Duplicate checkout submit | Double-click checkout/submit same idempotency key. | One order/PaymentIntent only; duplicate returns same completed/in-progress response. | TBD | NEEDS MANUAL TEST | Inspect DB rows. |
| CUST-012 | Customer | Payment webhook replay | Replay same Stripe success event twice. | Second event skipped; no duplicate ledger/order side effects. | TBD | NEEDS MANUAL TEST | Check `stripe_events_processed`. |
| CUST-013 | Customer | Order status tracking | After checkout, watch order through accepted, preparing, ready, assigned, delivered. | Customer UI shows sensible status at each step. | TBD | NEEDS MANUAL TEST | Coordinate with chef/driver tests. |
| CUST-014 | Customer | Cancel order before acceptance | Place order, cancel while pending if allowed. | Status changes to cancelled/cancel requested and payment handling is correct. | TBD | NEEDS MANUAL TEST | Verify audit/history. |
| CUST-015 | Customer | Review delivered order | After completed delivery, submit review. | Review saved, visible publicly; duplicate review blocked. | TBD | NEEDS MANUAL TEST | Verify purchase eligibility. |
| CUST-016 | Customer | Support ticket | Create support ticket from account/order. | Ticket appears for customer and ops. | TBD | NEEDS MANUAL TEST | Verify customer cannot read other tickets. |

## Chef / Restaurant Tests

| Test ID | User role | Scenario | Steps | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CHEF-001 | Chef | Sign up/onboarding | Create chef account, complete profile/storefront/kitchen details. | Chef profile/storefront/kitchen rows created; approval status clear. | TBD | NEEDS MANUAL TEST | Include document upload if required. |
| CHEF-002 | Ops + Chef | Approve chef | Ops approves chef, chef reloads dashboard. | Chef can access privileged dashboard/actions. | TBD | NEEDS MANUAL TEST | Verify unapproved chef is blocked. |
| CHEF-003 | Chef | Create menu item | Create category and item with image, price, prep time. | Item appears on chef menu and customer storefront if active. | TBD | NEEDS MANUAL TEST | Verify storage URL behavior. |
| CHEF-004 | Chef | Edit menu item | Change price/name/availability. | Customer menu and checkout quote reflect server-side change. | TBD | NEEDS MANUAL TEST | Pair with CUST-007. |
| CHEF-005 | Chef | Required options | Add required option and values to item. | Customer cannot checkout without required option; price delta applies. | TBD | NEEDS MANUAL TEST | Verify min/max selection. |
| CHEF-006 | Chef | Toggle availability | Close storefront or mark item unavailable. | Customer app blocks ordering unavailable content. | TBD | NEEDS MANUAL TEST | Test scheduled orders if enabled. |
| CHEF-007 | Chef | Accept order | Receive pending paid order and accept. | Order moves to accepted, customer/ops update, audit entry created. | TBD | NEEDS MANUAL TEST | Verify chef only sees own orders. |
| CHEF-008 | Chef | Reject order | Reject pending order with reason. | Order rejected/cancelled/failed per engine; customer notified; payment handling correct. | TBD | NEEDS MANUAL TEST | Verify refund/void behavior. |
| CHEF-009 | Chef | Mark preparing | Start prep after accepting. | Status moves to preparing, prep SLA starts. | TBD | NEEDS MANUAL TEST | Check order history. |
| CHEF-010 | Chef | Mark ready | Mark preparing order ready. | Dispatch requested and eligible driver offered/assigned. | TBD | NEEDS MANUAL TEST | Coordinate driver online. |
| CHEF-011 | Chef | Payout setup | Complete payout setup flow in sandbox. | Payout account stored/status visible. | TBD | NEEDS MANUAL TEST | Provider sandbox required. |
| CHEF-012 | Chef | Payout history | Complete delivered order and view payouts. | Payout/ledger entries appear accurately. | TBD | NEEDS MANUAL TEST | Finance review required. |

## Driver Tests

| Test ID | User role | Scenario | Steps | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DRV-001 | Driver | Sign up | Create driver account and profile/vehicle/docs. | Driver profile created; approval pending. | TBD | NEEDS MANUAL TEST | Verify docs are private/appropriate. |
| DRV-002 | Ops + Driver | Approve driver | Ops approves driver, driver logs in. | Driver can access offers/presence. | TBD | NEEDS MANUAL TEST | Unapproved driver blocked. |
| DRV-003 | Driver | Go available | Toggle online/presence and share location. | `driver_presence` online with fresh location. | TBD | NEEDS MANUAL TEST | Use real mobile location. |
| DRV-004 | Driver | Receive offer | Chef marks order ready while driver online. | Driver sees pending offer before expiry. | TBD | NEEDS MANUAL TEST | Check assignment attempt. |
| DRV-005 | Driver | Accept delivery | Accept offer. | Delivery assigned to driver; order moves assigned. | TBD | NEEDS MANUAL TEST | Verify mismatch driver cannot accept. |
| DRV-006 | Driver | Decline delivery | Decline offer. | Offer response saved; dispatch tries next eligible driver or escalates. | TBD | NEEDS MANUAL TEST | Need two drivers if possible. |
| DRV-007 | Driver | Pickup route | Mark en route/arrived/picked up. | Delivery/order statuses update; customer/ops update; no provider capture side effect occurs at pickup. | TBD | NEEDS MANUAL TEST | Stripe capture should already be automatic from checkout. |
| DRV-008 | Driver | Proof upload | Upload pickup/dropoff proof image. | Proof accepted, associated with delivery, and accessible only through authorized signed URL flow. | TBD | NEEDS MANUAL TEST | Verify unauthenticated fetch fails. |
| DRV-009 | Driver | Mark delivered | Complete delivery. | Order delivered/completed, payouts/ledger entries scheduled. | TBD | NEEDS MANUAL TEST | Verify order history and customer UI. |
| DRV-010 | Driver | Failed delivery | Report failed delivery/issue. | Exception created, ops alerted, order/delivery status correct. | TBD | NEEDS MANUAL TEST | Verify reassignment/cancel policy. |
| DRV-011 | Driver | Location denied/offline | Deny location or go offline during active delivery. | UI handles error; ops sees stale/exception state as designed. | TBD | NEEDS MANUAL TEST | Real mobile required. |
| DRV-012 | Driver | Earnings | Complete delivery and inspect earnings. | Earnings and payout totals match ledger. | TBD | NEEDS MANUAL TEST | Check driver payout mismatch risk. |

## Operations Admin Tests

| Test ID | User role | Scenario | Steps | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OPS-001 | Ops admin | Log in | Log into ops admin and access dashboard. | Dashboard loads; unauthorized user blocked. | TBD | NEEDS MANUAL TEST | Test ops agent vs admin roles. |
| OPS-002 | Ops admin | View live orders | Open live board during active order. | Recent orders, deliveries, drivers, chefs render correctly. | TBD | NEEDS MANUAL TEST | Verify no public access. |
| OPS-003 | Ops admin | Assign driver | Manually assign eligible driver to delivery. | Delivery/order assigned; driver receives offer/assignment. | TBD | NEEDS MANUAL TEST | Verify audit log. |
| OPS-004 | Ops admin | Reassign driver | Reassign after decline/failure. | Prior assignment released; new driver assigned/offered. | TBD | NEEDS MANUAL TEST | Check assignment attempts. |
| OPS-005 | Ops admin | Override order status | Override stuck order with required reason. | Override applied and logged in `ops_override_logs` and history. | TBD | NEEDS MANUAL TEST | Verify capability restrictions. |
| OPS-006 | Finance/ops | Full refund | Refund completed order fully in Stripe sandbox. | Stripe refund succeeds, order refunded, ledger/refund case updated. | TBD | NEEDS MANUAL TEST | Verify webhook idempotency and ledger reversal. |
| OPS-007 | Finance/ops | Partial refund | Refund part of order. | Partial refund succeeds; order/payment status is `partially_refunded`; ledger/refund case reconcile. | TBD | NEEDS MANUAL TEST | DB/code mismatch fixed locally; sandbox replay required. |
| OPS-008 | Ops admin | Disable chef/storefront | Disable or pause chef/storefront. | Customer app no longer accepts new orders for it. | TBD | NEEDS MANUAL TEST | Existing active orders policy should be checked. |
| OPS-009 | Ops admin | Disable driver | Disable driver during inactive state. | Driver cannot receive offers; prior history remains visible to ops. | TBD | NEEDS MANUAL TEST | Active delivery disable policy needed. |
| OPS-010 | Ops admin | Support ticket workflow | Open customer support ticket, update status, notify customer. | Ticket status/audit/notification update. | TBD | NEEDS MANUAL TEST | Verify customer sees update. |
| OPS-011 | Ops admin | Processor health | Open engine health and run processors with token. | Readiness reports env booleans and last successful runs. | TBD | NEEDS MANUAL TEST | Do not reveal secret values. |
| OPS-012 | Ops admin | Expired offer processor | Create expired offer, run processor. | Offer expires/retries/escalates correctly and run is idempotent. | TBD | NEEDS MANUAL TEST | Check `ops_processor_runs`. |
| OPS-013 | Finance/ops | Payout preview/execute | Run payout preview and execute sandbox payout if supported. | Ledger/payout run/provider IDs reconcile. | TBD | NEEDS MANUAL TEST | Finance approval required. |
| OPS-014 | Ops admin | Export | Use export route for allowed data. | Export respects role and excludes unnecessary PII. | TBD | NEEDS MANUAL TEST | Privacy review. |

## Security and Abuse Tests

| Test ID | User role | Scenario | Steps | Expected result | Actual result | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEC-001 | Anonymous | Access protected customer order | Request another user's order API without session. | 401/403, no data. | TBD | NEEDS MANUAL TEST | Use curl/browser. |
| SEC-002 | Customer | Cross-customer order access | Customer A requests Customer B order. | 403/404, no data. | TBD | NEEDS MANUAL TEST | RLS/app guard. |
| SEC-003 | Chef | Cross-chef order access | Chef A requests Chef B order. | 403/404, no data. | TBD | NEEDS MANUAL TEST | App guard. |
| SEC-004 | Driver | Cross-driver delivery access | Driver A requests Driver B delivery. | 403/404, no data. | TBD | NEEDS MANUAL TEST | App guard. |
| SEC-005 | Ops agent | Restricted finance action | Lower-privilege ops user attempts finance refund/payout. | 403. | TBD | NEEDS MANUAL TEST | Capability matrix. |
| SEC-006 | Anonymous | Stripe webhook without signature | POST webhook without/with bad signature. | 400/401 and no DB side effects. | TBD | NEEDS MANUAL TEST | Sandbox/local. |
| SEC-007 | Anonymous | Processor without token | POST processor route with no token. | 401 and no run. | TBD | NEEDS MANUAL TEST | Check `ops_processor_runs`. |
| SEC-008 | Abuse | Rate limit login/checkout/location | Exceed configured limits. | 429 or expected policy response. | TBD | NEEDS MANUAL TEST | Run with distributed provider. |

## Required Verification Commands

Run before QA signoff:
- `pnpm install --frozen-lockfile`
- `pnpm typecheck --force`
- `pnpm lint --force`
- `pnpm test`
- `pnpm build --force`
- `pnpm test:smoke`
- `pnpm test:e2e` if staging env is configured
- `pnpm verify:launch-readiness:strict`
- `pnpm test:rls`
- `pnpm test:stripe:sandbox`
- `pnpm test:e2e:lifecycle`
- `pnpm test:load:staging`
- `pnpm verify:prod-data-hygiene`
- `pnpm audit:guards`

Known current issue:
- The smoke-test port conflict was fixed by using isolated configurable ports. QA should run smoke in a clean terminal and again with a preexisting unrelated process on port 3002 to verify it does not attach to the wrong server.

## QA Exit Criteria

- All P0 issues fixed.
- Smoke E2E passes from a clean terminal with no port conflict.
- Customer-to-chef-to-driver-to-completion flow passes at least twice.
- Stripe payment success, failure, duplicate webhook, full refund, and partial refund pass in sandbox.
- RLS negative tests pass for every role.
- Ops override, refund, dispatch, and payout workflows produce audit/history records.
- No secret values appear in logs, UI, exports, or test artifacts.
