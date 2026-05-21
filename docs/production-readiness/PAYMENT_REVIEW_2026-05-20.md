# Payment Review - 2026-05-20

Scope: Stripe checkout, PaymentIntents, webhooks, idempotency, refunds, payout/ledger support, and payment/order reconciliation. No Stripe secret values were read or printed.

Post-fix update: partial refunds now use canonical `partially_refunded`, checkout explicitly requests automatic PaymentIntent capture, pickup no longer declares provider-capture side effects, and the Stripe sandbox e2e script was aligned with automatic capture and shared driver payout math. Stripe sandbox replay and payout settlement are still manual gates.

Stripe integration status: PARTIAL
Webhook verification status: PASS
Idempotency status: PASS/PARTIAL
Order/payment reconciliation status: PARTIAL
Refund support: PARTIAL
Payout support: PARTIAL
Ledger/accounting status: PARTIAL
Production status: FAIL

## Verified Payment Components

| Component | Files | Status | Notes |
| --- | --- | --- | --- |
| Checkout route | `apps/web/src/app/api/checkout/route.ts` | PARTIAL | Creates order and Stripe PaymentIntent; uses idempotency. |
| Checkout quote | `apps/web/src/lib/checkout/quote.ts` | PASS/PARTIAL | Computes server-side cart totals, delivery fee, tax, options, and availability checks. |
| Web Stripe webhook | `apps/web/src/app/api/webhooks/stripe/route.ts` | PASS/PARTIAL | Verifies signature, claims event, handles payment success/failure/refund/finance events. |
| Ops Stripe webhook | `apps/ops-admin/src/app/api/stripe/webhook/route.ts` | PASS/PARTIAL | Verifies signature and handles finance transfer/payout events. |
| Stripe client guard | `packages/engine/src/services/stripe.service.ts` | PARTIAL | Enforces test/live key prefix by environment, but has a production test-key escape hatch. |
| Webhook idempotency | `packages/engine/src/services/stripe-webhook-idempotency.ts` | PASS/PARTIAL | Uses `stripe_events_processed` to claim, skip, retry, and finalize events. |
| Ledger service | `packages/engine/src/services/ledger.service.ts` | PASS/PARTIAL | Idempotent ledger entries for captures, fees, refunds, payouts, and reversals. |
| Reconciliation service | `packages/engine/src/services/reconciliation.service.ts` | PARTIAL | Exists, but real Stripe data validation required. |
| Refund handling | `packages/engine/src/orchestrators/platform.engine.ts`, refund routes | PARTIAL | Partial refund DB mismatch fixed; Stripe sandbox replay still required. |
| Payout handling | engine finance/payout services and ops routes | PARTIAL | Provider behavior needs sandbox/staging validation. |

## Checkout Flow

Verified:
1. Customer context is required.
2. Checkout route applies checkout rate limiting.
3. Payload is validated with a checkout schema.
4. Server quote is built from cart/menu/address/config data.
5. Client-supplied totals are compared with server totals.
6. Stale item prices, unavailable items, sold-out items, required option values, address ownership, delivery zone, delivery fee, tax, and promo usage are validated by quote logic.
7. Checkout idempotency is stored in `checkout_idempotency_keys`.
8. Order is created through the engine before creating the PaymentIntent.
9. Stripe PaymentIntent metadata includes order/customer/storefront/cart/total identifiers.
10. Stripe PaymentIntent creation uses a Stripe idempotency key.

Status: PARTIAL

Issues:
- Orders are created before payment confirmation. The code has safeguards, but stale unpaid order cleanup and reconciliation need tests.
- PaymentIntent creation now explicitly uses automatic capture. Provider capture occurs at checkout; later ledger entries represent local payment recognition and payables.
- Stripe sandbox checkout has not been manually run in this review.

## Webhook Flow

Verified:
1. Web webhook reads raw request body.
2. Web webhook verifies `stripe-signature` against `STRIPE_WEBHOOK_SECRET`.
3. Ops webhook verifies `stripe-signature` against `STRIPE_WEBHOOK_SECRET_OPS` or `STRIPE_WEBHOOK_SECRET`.
4. Web webhook claims events in `stripe_events_processed`.
5. Duplicate/processing/successful events are skipped or retried according to idempotency status.
6. Payment success reconciles PaymentIntent amount to order total before payment completion/kitchen submission.
7. Payment failure calls platform failure handling.
8. Charge refund calls external refund handling.

Status: PASS/PARTIAL

Issues:
- Stripe webhook end-to-end behavior needs sandbox replay testing.
- Webhook ownership is split: web handles payment/refund order effects; ops handles finance transfer/payout effects. This should be documented in operations runbooks.
- Webhook failure alerting/dead-letter workflow is not proven.

## Idempotency

PASS:
- Checkout request idempotency is persisted by key/request hash.
- Stripe PaymentIntent creation uses a Stripe idempotency key.
- Stripe event processing uses `stripe_events_processed`.
- Ledger service supports idempotency keys.
- Processor runs use `ops_processor_runs` for canonical processors.

PARTIAL:
- Stale checkout idempotency cleanup is not proven.
- Full duplicate webhook replay was not run against Stripe sandbox.
- Race handling under high concurrency needs load/integration testing.

## Order and Payment Reconciliation

Verified:
- Stripe success handler compares PaymentIntent amount to `orders.total`.
- Ledger entries exist for capture, tax, chef payable, driver payable, platform fee, tip, refunds, payout debits, and payout reversals.
- `stripe_reconciliation` table and reconciliation service exist.

Risks:
- PaymentIntent capture timing is unclear relative to order lifecycle.
- Partial refunds can fail at DB update time.
- Orders created before payment confirmation require cleanup/reporting for abandoned PaymentIntents.
- Payout/provider settlement is not proven from repo alone.

Status: PARTIAL

## Refund Support

Status: PARTIAL

Verified:
- Refund case table exists.
- Refund action routes exist in ops.
- Ledger supports `customer_refund` and `customer_partial_refund`.
- Engine transition matrix includes `refund_pending`, `refunded`, and `partially_refunded`.

Post-fix status:
- `packages/engine/src/orchestrators/platform.engine.ts` now writes `partially_refunded` for partial refunds.
- `supabase/migrations/00040_payment_status_partial_refunds_and_order_fk_validation.sql` updates the DB check constraint to allow `partially_refunded`.
- Stripe sandbox replay is still required to prove webhook/order/ledger/refund reconciliation.

Recommended fix:
1. Run full and partial refund tests from both ops route and Stripe webhook replay.
2. Add reconciliation handling for refunds that succeed in Stripe but fail local DB updates.
3. Keep status contract tests that fail if code reintroduces `partial_refunded`.

## Payout Support

Status: PARTIAL/NEEDS MANUAL TEST

Verified:
- Chef payout accounts, chef payouts, driver payout accounts, driver payouts, payout runs, payout adjustments, instant payout requests, platform accounts, and ledger entries exist.
- Ops finance/payout API routes exist.
- Stripe transfer and payout event handling exists.
- Payout concurrency guard exists for payout runs.

Risks:
- Actual Stripe Connect or payout provider setup was not validated.
- Chef/driver payout setup routes require sandbox/manual testing.
- Driver delivery assignment payout calculation now uses the shared order delivery-fee payout calculator; end-to-end payout reconciliation still needs staging validation.
- Tax/tip/platform-fee math needs finance review with test cases.

Recommended fixes:
- Add payout sandbox tests for chef payout account setup, driver payout account setup, payout preview, payout execution, transfer event, payout paid/failed event, and reversal.
- Add reconciliation reports that compare payout runs, ledger entries, provider IDs, and Stripe balances.
- Keep delivery-level `driver_payout` calculation covered by ledger/source-of-truth tests.

## Tax, Tip, Currency, and Fees

Verified:
- Checkout PaymentIntent currency is `cad`.
- Quote logic computes subtotal, delivery fee, service fee, tax, tip, and total.
- Ledger records tax liability, platform fees, chef payable, driver payable, and tips.

PARTIAL:
- Tax configuration source and jurisdictional correctness were not verified.
- Tip ownership and payout timing need finance review.
- Multi-currency is not supported from observed code; CAD appears fixed.

Recommended fixes:
- Add finance acceptance tests for all money math in cents.
- Document CAD-only assumption or add currency controls.
- Add tax rounding and refund proration tests.

## Critical Risks

1. PARTIAL: Partial refund code/schema are aligned, but Stripe sandbox replay is still required.
2. PARTIAL: Provider capture is explicit at checkout, but lifecycle vocabulary still needs long-term consolidation.
3. PARTIAL: Orders are created before payment confirmation and need abandoned-order cleanup/reconciliation.
4. PARTIAL: Payout rails are implemented but not provider-validated.
5. PARTIAL: Driver payout formula is aligned locally, but payout provider reconciliation still needs staging proof.
6. NEEDS MANUAL TEST: Stripe sandbox event replay is required for all payment states.

## Recommended Payment Fixes

P0:
- Keep partial refund status mismatch regression coverage.
- Keep automatic checkout capture documented and tested.
- Keep tests that fail on DB/payment status drift.

P1:
- Run Stripe sandbox payment success/failure/refund/replay tests.
- Add abandoned checkout cleanup/reconciliation.
- Add full duplicate webhook replay tests.

P2:
- Validate payout provider flows.
- Add finance runbooks and alerting for failed webhooks, payout variance, refund variance, and unreconciled orders.
- Remove or lock down `STRIPE_ALLOW_TEST_IN_PRODUCTION`.

Production status: FAIL until Stripe sandbox validation, payout reconciliation, and finance signoff are complete.
