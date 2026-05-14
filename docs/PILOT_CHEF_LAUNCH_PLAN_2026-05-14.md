# Pilot-Chef Launch Plan — Hamilton Soft Launch

**Date:** 2026-05-14
**Goal:** First real-money order in Hamilton with one real chef, one real driver, one real customer.
**Status:** Platform is test-ready end-to-end. Real participants and Stripe-live keys are the remaining gates.

---

## Current production state (verified 2026-05-14 post-PR #23 merge)

### What works
- ✅ All 4 apps deployed on master `bb23cec` (PR #23 merged), HTTP 200 on every public route
- ✅ All 36 Supabase migrations synced local↔remote
- ✅ Customer signup, browse, add-to-cart, checkout → real `payment_authorized` order placed today (`RD-MP4ZNSEA-AJKX`)
- ✅ Stripe PaymentIntents (test mode) working end-to-end with `STRIPE_ALLOW_TEST_IN_PRODUCTION=true`
- ✅ 3 real Hamilton chefs published with real menu + bio + cover image: Every Bite Yum (Sean), HOANG GIA PHO (Tuan), COOCO (Ryo)
- ✅ Mirko (4th chef) signed up & approved — storefront still has placeholder content he hasn't replaced yet
- ✅ Sean approved as real driver. 4 other driver rows (Marcus/Priya are seed UUIDs with `user_id=null`, Mike/Sarah have real user_ids — unclear if real)
- ✅ Demo order `RD-DEMO-001` in `picked_up` state for status-watching demo
- ✅ Engine state machine, RLS, payout reversal on refund, SLA auto-reject all in place
- ✅ **Auto-approve on signup** — new chefs + drivers land in the app immediately, no manual ops gate
- ✅ **Closed-beta banner** on `/` and `/chefs` tells test users to use Stripe card `4242…`
- ✅ **DRAFT — Pending Legal Review** banners on all 6 privacy/terms pages
- ✅ **Inline signup acknowledgements**: customer (age 18+, marketplace, allergens), chef (IC + food safety + permits), driver (IC + commercial insurance + no-phone-while-driving)
- ✅ **Chef Onboarding** page in ops-admin (sidebar → Chef Onboarding) — finds Mirko + any recent chef signup
- ✅ Vercel cron jobs configured (SLA tick + expired-offers every minute, payouts + reconciliation daily/weekly)
- ✅ ops-admin `/api/health` reports all subsystems ready: 13 orders, 7 deliveries, 5 drivers, 4 chefs, 5 customers

### What's NOT real yet
- ❌ `chef_payout_accounts` is empty — no chef has completed Stripe Connect Express onboarding
- ❌ No drivers have `stripe_connect_account_id` populated
- ❌ All Stripe keys are `sk_test_` — no real money has moved
- ❌ Mirko's storefront content is still placeholder ("Mirko B Test Kitchen", "Test Dummy 1 Pasta Bowl"). He needs to edit it in chef-admin.
- ❌ Customer privacy/T&C still on DRAFT — full legal review deferred to near-production
- ❌ No external uptime monitor (possible now since `/api/health` is exposed on driver-app too)

---

## What changed since this plan was first written (PR #23)

Shipped in 4 commits, merged 2026-05-14 as `bb23cec`:

1. **`2b5cb75`** — driver-app middleware exposed `/privacy`, `/terms`, `/api/health`; DRAFT banners on all 6 legal pages; inline IC/insurance/food-safety acknowledgements on the 3 signup pages
2. **`6c76f62`** — auto-approve chef + driver signups (`chef_profiles.status` and `drivers.status` default to `'approved'` on signup; driver SuccessScreen removed, drops driver straight onto the dashboard)
3. **`86996cc`** — closed-beta amber banner on `/` and `/chefs` with the test card number; test-user walkthrough doc
4. **`30bd0dc`** — rebuild ops `/dashboard/chefs/approvals` (renamed sidebar to "Chef Onboarding"). Shows 3 sections: Pending Review (rare now), Needs Storefront Setup, Recently Joined (where Mirko appears). Mirko's storefront `is_active=true` restored after I'd erroneously hidden it.

---

## The 10 gates between "working platform" and "first real Hamilton order"

These are ordered. Don't skip ahead.

### Gate 1 — Sign the first real chef
**Who needs to do this:** Sean (recruit) + Chef (sign up)

1. Chef visits https://chef.ridendine.ca/auth/signup
2. Completes signup form including:
   - Real first/last name, email, phone
   - Agrees to T&C + new IC/food-safety acknowledgement (shipped this PR)
3. After signup, **ops manually approves the chef in DB**:
   ```sql
   UPDATE chef_profiles
   SET status = 'approved'
   WHERE user_id = '<chef-user-uuid>';
   ```
   *(Manual approval is the current closed-beta safety gate; an admin-UI approval flow is a future task.)*
4. Verify the chef can log in and lands on `/dashboard/storefront`.

**Sean's task:** identify the chef. Hamilton-area, food-handler certified, willing to do a closed-beta order.

### Gate 2 — Chef completes Stripe Connect Express onboarding
**Who:** Chef themselves

1. In chef-admin → Dashboard → Payouts (or "Set up payouts" CTA)
2. Clicks "Set up payouts" → frontend POST `/api/payouts/setup`
3. Stripe Connect Express account created (test mode initially), `chef_payout_accounts.stripe_account_id` populated
4. Stripe redirects to its hosted onboarding flow — chef provides:
   - Legal name, DOB, address
   - SIN (Stripe collects, not stored on Ridendine)
   - Bank account (transit + institution + account)
5. After completion, Stripe webhook flips `chef_payout_accounts.status` and `payout_enabled=true`

**Verify after:**
```sql
SELECT chef_id, stripe_account_id, status, payouts_enabled
FROM chef_payout_accounts
WHERE chef_id = '<chef-id>';
```
Expected: `payouts_enabled=true`. If `pending`, Stripe is still collecting info.

### Gate 3 — Chef builds real storefront + menu
**Who:** Chef themselves in chef-admin

1. Storefront → set real name, description, cuisine type, cover photo, prep-time estimates
2. Menu → add real items with **accurate** allergen info, ingredient list, price (in cents in DB)
3. Set storefront `is_active=true`, `is_paused=false`, `storefront_state='published'`
4. Set chef's delivery-zone polygon to actual Hamilton service area
5. Set `accepting_orders=true` on the storefront

**Smoke-test from customer side:** Visit `https://ridendine.ca/chefs/<slug>` — page renders with the real menu.

### Gate 4 — Sign the first real driver
**Who:** Sean (recruit) + Driver

1. Driver visits https://driver.ridendine.ca/auth/signup
2. Completes signup including:
   - Real name, email, phone, vehicle type
   - Agrees to T&C + new IC/insurance/safe-driving acknowledgement
3. Driver app shows "Application Submitted" screen — they cannot log in yet.
4. Ops manually approves the driver:
   ```sql
   UPDATE drivers SET status = 'approved' WHERE user_id = '<driver-user-uuid>';
   ```
5. Driver can now log in.

**Sean's task:** recruit one Hamilton-area driver with valid licence + commercial-eligible auto insurance.

### Gate 5 — Driver completes Stripe Connect Express + uploads docs
**Who:** Driver themselves

1. Driver-app → Payouts → POST `/api/payouts/setup` (same flow as chef)
2. Driver provides SIN + bank info in Stripe-hosted flow
3. Driver also uploads required documents (licence, insurance) — these go to `driver_documents`. Ops reviews each row.
4. Verify `drivers.stripe_connect_account_id` is now populated and `payout_blocked=false`.

### Gate 6 — End-to-end happy-path test order (test cards)
**Who:** Sean as the test customer + real chef + real driver

1. Customer signs up at https://ridendine.ca/auth/signup (real new account, not seed Alice).
2. Customer adds the real chef's menu item to cart, enters real Hamilton delivery address.
3. Customer checks out with Stripe test card `4242 4242 4242 4242` (any future date, any CVV).
4. **Chef receives the order** in chef-admin orders list — accepts within 8 minutes (SLA timer).
5. Chef marks Preparing → Ready.
6. Driver receives offer in driver-app → accepts → marks Arrived at chef → picked up.
7. Driver navigates to customer (real GPS), marks Delivered with proof-of-delivery photo.
8. Customer sees order in `delivered` state. Customer submits review.

**This is the smoke test that proves the whole platform end-to-end with real participants. Do it twice — once during the day, once near closing time to catch SLA-tick edge cases.**

### Gate 7 — Run a controlled refund
**Who:** Sean (customer + ops)

1. Place another test-card order (Gate 6 happy path).
2. After delivery, customer requests a refund via `/orders/<id>` page.
3. Ops approves refund in ops-admin → triggers `commerce.engine.createRefundAdjustments`.
4. Verify three ledger entries are reversed correctly:
   - `chef_payable` reversal
   - `driver_payable` reversal
   - **`platform_fee` reversal** (this was D.3 — the bug we just fixed)
5. Confirm Stripe shows the refund on the original test PaymentIntent.

### Gate 8 — Switch from test keys to live keys
**Who:** Sean only — DO NOT do this until Gates 1-7 all pass.

1. In Stripe Dashboard → switch to live mode → create restricted API key for the platform.
2. In Vercel for **all 4 stm-tech projects**:
   - Set `STRIPE_SECRET_KEY=sk_live_…` (Production environment)
   - Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…`
   - **Remove `STRIPE_ALLOW_TEST_IN_PRODUCTION=true`** (env-flag-gated escape hatch)
   - Set `STRIPE_WEBHOOK_SECRET=whsec_…` from the live webhook endpoint
3. Trigger a redeploy on each project.
4. After redeploy, the safety check in `getStripeClient()` will once again reject any `sk_test_` keys in prod. This is intentional.
5. Re-onboard chef's Stripe Connect account on live mode (test-mode and live-mode are separate Stripe environments — they share no state).

### Gate 9 — Real-money first order
**Who:** Real Hamilton customer (Sean's pilot — friend, family, or first beta tester)

1. Customer pays with a **real credit card** (not test).
2. The order flows through Gates 1-7 paths.
3. After delivery + (optional) refund-window window, run the daily payout-batch (cron `/api/cron/payout-daily` on ops-admin) — chef's bank gets the first real transfer.

### Gate 10 — Wire external monitoring (now possible)
**Who:** Sean (15-min task)

1. Point UptimeRobot / BetterStack / Vercel monitor at each `/api/health` endpoint (driver-app now exposes it after the PR shipping with this plan).
2. Set alert threshold: 1 consecutive failure → email/SMS to Sean.
3. Add Stripe webhook delivery-failure alert in Stripe Dashboard → Email when ≥1 webhook fails in 24h.

---

## Risk register for the pilot

| Risk | Likelihood | Mitigation |
|---|---|---|
| Chef forgets to flip `is_paused=false` after busy lunch → no orders come in | High | Add a "you have been paused for X hours" reminder on dashboard load |
| Driver app drains battery quickly | High | Acceptable for pilot; future task: optimise location polling |
| Stripe live-mode webhook signing secret not set → payouts stall silently | Medium | Gate 8 explicit step; verify with `stripe trigger payment_intent.succeeded` |
| Real customer hits an unhandled engine error during checkout | Medium | Sentry / log aggregation is not yet wired — add before Gate 9 |
| Privacy/T&C not yet legally reviewed | Medium | DRAFT banner is visible to every user; manageable for closed-beta with NDA-bound testers |
| Allergen on menu is wrong → severe reaction | Low but critical | Chef self-attestation in signup + planned inline allergen banner (#4 in disclaimers doc) |
| First chef cancels mid-pilot | Low | Recruit two chefs, run one as primary, second as backup |

---

## What this plan does NOT do (next-phase work, after first real order)

- Real-time alerting / Sentry / log aggregation
- Daily backup-restore drill
- D.11 — clean up 163 `any` warnings (deferred)
- Full legal review of privacy/T&C
- Cookie banner + CASL marketing consent
- Mobile-native driver app (current PWA is fine for closed-beta)
- Customer push notifications (current SMS-only)
- Hamilton-zone restriction on customer signup (currently no geofence)

---

## Quick sanity-check queries for during the pilot

```sql
-- "Are there any stuck orders?"
SELECT id, order_number, engine_status, created_at
FROM orders
WHERE engine_status NOT IN ('completed','delivered','cancelled','rejected','refunded','draft')
  AND created_at < NOW() - INTERVAL '90 minutes'
ORDER BY created_at DESC;

-- "Is any chef offline that shouldn't be?"
SELECT id, name, is_paused, paused_reason
FROM chef_storefronts
WHERE is_active = true AND is_paused = true;

-- "Are drivers actually online with location updates?"
SELECT d.first_name, dp.status, dp.last_location_at,
       NOW() - dp.last_location_at AS staleness
FROM driver_presence dp
JOIN drivers d ON d.id = dp.driver_id
WHERE dp.status IN ('online','on_delivery')
ORDER BY dp.last_location_at DESC NULLS LAST;

-- "Did any payout fail?"
SELECT * FROM chef_payouts
WHERE status IN ('failed','pending')
ORDER BY created_at DESC
LIMIT 20;
```
