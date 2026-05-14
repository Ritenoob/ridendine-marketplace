-- ==========================================
-- 00037 — Fix stripe_events_processed schema mismatch (RID-WEBHOOK-CLAIM)
-- ==========================================
-- Discovered 2026-05-14 during post-PR-#23 end-to-end test order:
-- - Customer placed test order RD-MP5WDCSD-B22L, paid with test card
-- - Stripe fired payment_intent.succeeded → our webhook
-- - Webhook claimStripeWebhookEventForProcessing tried to insert
--     { related_payment_id: 'pi_3TX5BKCDctkR5kaf1RxfojjO',
--       processing_status: 'processing' }
-- - INSERT failed: 22P02 "invalid input syntax for type uuid"
-- - Handler returned HTTP 409 to Stripe
-- - Stripe retried forever, order never transitioned past payment_authorized
--
-- Two schema mismatches with the code in
-- packages/engine/src/services/stripe-webhook-idempotency.ts:
--
-- 1) related_payment_id is UUID but Stripe payment IDs (pi_xxx, ch_xxx,
--    tr_xxx, po_xxx) are not UUID format. Fix: change to TEXT.
--
-- 2) processing_status CHECK constraint allows only
--    ('processed', 'failed', 'duplicate_skipped') but the code uses
--    'processing' for the in-flight claim. Fix: expand the allowed set.

-- 1) related_payment_id: UUID → TEXT
ALTER TABLE stripe_events_processed
  ALTER COLUMN related_payment_id TYPE TEXT USING related_payment_id::text;

-- 2) processing_status: add 'processing' to allowed values
ALTER TABLE stripe_events_processed
  DROP CONSTRAINT IF EXISTS stripe_events_processed_processing_status_check;

ALTER TABLE stripe_events_processed
  ADD CONSTRAINT stripe_events_processed_processing_status_check
  CHECK (processing_status IN ('processing', 'processed', 'failed', 'duplicate_skipped'));

COMMENT ON COLUMN stripe_events_processed.related_payment_id IS
  'Stripe object id (pi_xxx PaymentIntent, ch_xxx Charge, tr_xxx Transfer, po_xxx Payout). NOT a Ridendine UUID.';

COMMENT ON COLUMN stripe_events_processed.processing_status IS
  'Lifecycle: processing → processed/failed. duplicate_skipped is for replays caught by stripe_event_id unique constraint.';
