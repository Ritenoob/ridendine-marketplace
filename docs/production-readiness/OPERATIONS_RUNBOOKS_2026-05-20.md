# Operations Runbooks - 2026-05-20

These runbooks define the operational response expected before launch. They are intentionally procedural and should be exercised in staging before production.

## Failed Payment

Trigger:
- Stripe sends `payment_intent.payment_failed`.
- Customer checkout returns payment failure.

Response:
1. Confirm Stripe event id exists in webhook tracking.
2. Confirm order remains unpaid and is not submitted to kitchen.
3. Confirm customer-facing order state does not show confirmed/preparing.
4. Confirm no chef/driver payable entries exist.
5. Ask customer to retry payment or use another payment method.

Escalate if:
- Stripe shows success but local state is failed.
- Local order is submitted to kitchen without completed payment.

## Stuck Order

Trigger:
- Order remains in pending, accepted, preparing, ready, dispatch pending, or driver assigned beyond SLA.

Response:
1. Open ops live orders dashboard.
2. Review order history, domain events, delivery row, assignment attempts, and processor runs.
3. Contact chef or driver based on stuck stage.
4. Use ops override only with a reason and audit entry.
5. If payment/order state is inconsistent, pause customer notification until finance confirms.

Escalate if:
- Status in UI and database disagree.
- No audit trail exists for a status change.

## No Driver Available

Trigger:
- Dispatch assignment attempts exhausted or order remains dispatch pending.

Response:
1. Verify available approved drivers in the delivery zone.
2. Confirm driver location updates are current.
3. Retry canonical dispatch processor.
4. Manually assign only an approved available driver.
5. Notify customer of delay if SLA is missed.

Escalate if:
- Dispatch processor is stale.
- Driver payout calculation differs between delivery row and ledger expectation.

## Failed Delivery

Trigger:
- Driver reports unable to deliver.
- Customer unavailable.
- Proof or handoff confirmation is disputed.

Response:
1. Confirm delivery status and order status.
2. Review driver notes, location updates, and proof media through authorized signed URL.
3. Contact customer.
4. Ops decides redelivery, cancellation, refund, or support case.
5. Record decision in audit/support trail.

Escalate if:
- Proof media is publicly accessible.
- Order is completed without delivery confirmation or ops override.

## Refund Dispute

Trigger:
- Customer requests full/partial refund.
- Stripe refund webhook arrives.

Response:
1. Verify original PaymentIntent and local order id.
2. Confirm refund amount and reason.
3. For partial refunds, verify local status becomes `partially_refunded`.
4. Confirm ledger reversal entries match approved amount.
5. Confirm customer support case and audit entry exist.

Escalate if:
- Stripe refund succeeds but local update fails.
- Ledger and Stripe amounts differ.

## Payout Variance

Trigger:
- Payout dry-run differs from ledger or provider settlement.
- Driver or chef reports incorrect earnings.

Response:
1. Compare payout run items to ledger entries.
2. Verify chef payable, driver payable, tips, platform fee, tax, refunds, and payout debits.
3. Hold affected payout run if variance is unresolved.
4. Retry failed provider transfer only after idempotency key and previous provider state are confirmed.
5. Record finance decision and variance reason.

Escalate if:
- Provider settlement cannot be reconciled to local ledger.
- Multiple payout runs are processing for the same payee type.

## Webhook Replay

Trigger:
- Stripe event failed or was delayed.
- Stripe dashboard replay is requested.

Response:
1. Locate event id in webhook tracking.
2. Confirm current processing status and related order/payment id.
3. Replay from Stripe only if idempotency record allows safe retry.
4. Confirm duplicate event returns idempotent replay response.
5. Verify final order, payment, refund, ledger, or payout state.

Escalate if:
- Claim row is stuck processing.
- Duplicate event changes money/order state.

## Processor Outage

Trigger:
- Processor stale-run alert.
- Scheduler reports failures.
- SLA/dispatch/reconciliation work stops.

Response:
1. Confirm scheduler target uses `/api/engine/processors/*`.
2. Confirm `CRON_SECRET`/`ENGINE_PROCESSOR_TOKEN` are configured.
3. Check latest `ops_processor_runs` rows.
4. Run the canonical processor manually in staging first if reproducing.
5. Restart or redeploy only after root cause is understood.

Escalate if:
- Scheduler points to retired `/api/cron/*` routes.
- Processor retries create duplicate side effects.
