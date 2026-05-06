# Ridendine Platform Review & Improvement Plan

Created: 2026-05-06
Author: sean@cashflowarmy.com
Status: PENDING
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Comprehensive platform improvement plan to bring Ridendine to UberEats/DoorDash parity for home chefs in Hamilton, with Ridendine as the app and payment merchant. Phased as launch-critical → experience polish → growth features.

**Architecture:** Monorepo with 4 Next.js apps, shared engine/DB packages, Supabase backend, Stripe payments. Architecture is sound — gaps are in feature completeness, not structure.

**Tech Stack:** Next.js 14 (App Router), Supabase (PostgreSQL + Realtime + Auth), Stripe (Connect Express for payouts), OSRM routing, Turborepo/pnpm.

## Scope

### In Scope

**Phase 1 — Launch-Critical (Hamilton soft launch)**
- Stripe Connect Express onboarding for chefs and drivers
- Distance-based delivery fees (replace static $5)
- Address geocoding and delivery zone validation at checkout
- Dynamic ETA calculations (replace hardcoded "30-45 min")
- Customer order cancellation flow
- Chef real-time order alerts (audio + push)
- Email/SMS notifications for order status changes
- Driver proof-of-delivery photo capture
- Basic customer search improvements

**Phase 2 — Experience Polish**
- Customer push notifications (web push via service worker)
- Re-order / order again from order history
- Cart persistence across sessions
- Chef analytics dashboard completion
- Driver navigation integration (deep link to Google Maps/Waze)
- Improved chef search with cuisine filters and sorting
- Customer saved payment methods
- Order scheduling / pre-orders

**Phase 3 — Growth & Multi-Zone Readiness**
- Multi-zone service area support (architecture exists in `service_areas` table)
- Dynamic/surge pricing engine
- Advanced dispatch algorithm (multi-factor scoring beyond ETA)
- Customer loyalty / rewards program
- Platform analytics for ops (conversion, retention, LTV)
- Driver tipping increase prompts
- Referral system (customer and chef)

### Out of Scope

- Mobile native apps (PWA approach maintained)
- Multi-currency support (CAD only for Hamilton)
- Third-party delivery integration (e.g., DoorDash Drive)
- AI-powered recommendations
- Chat between customer and chef/driver

## Approach

**Chosen:** Launch-critical first — phased delivery where each phase is independently shippable.

**Why:** Gets Ridendine to minimum viable marketplace for Hamilton launch. The engine, state machines, and DB schema are already production-quality — the gaps are in user-facing features and payment merchant flows. Phased approach lets you launch with Phase 1 and iterate.

**Alternatives considered:**
- **App-by-app:** Rejected because cross-app features (notifications, payouts) need to land together across apps.
- **Horizontal layers:** Rejected because backend is already solid — most gaps are in feature integration, not backend architecture.

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:**
  - API routes: `apps/web/src/app/api/checkout/route.ts` — gold standard for validation, engine integration, error handling, idempotency
  - Engine services: `packages/engine/src/services/stripe.service.ts` — singleton pattern, environment safety
  - Real-time: `apps/web/src/components/tracking/live-order-tracker.tsx` — Supabase Realtime + public stage mapping
  - DB access: always through `@ridendine/db` repositories, never direct Supabase calls from app code
  - Validation: Zod schemas in `@ridendine/validation`, validated at API boundary

- **Conventions:**
  - Engine status is canonical (`EngineOrderStatus`), legacy `orders.status` is maintained by triggers
  - Customer-facing data uses `public_stage` (placed/cooking/on_the_way/delivered) — never expose engine internals
  - All money operations in cents internally, dollars at API boundary
  - Fee constants in `packages/engine/src/constants.ts`, runtime override from `platform_settings` table via `TaxConfigService`
  - Actor context required for all engine mutations (audit trail)

- **Key files:**
  - `packages/engine/src/orchestrators/master-order-engine.ts` — order lifecycle
  - `packages/engine/src/orchestrators/dispatch-orchestrator.ts` — driver dispatch
  - `packages/engine/src/orchestrators/payout-engine.ts` — payout processing
  - `packages/engine/src/orchestrators/commerce.engine.ts` — commerce/checkout
  - `packages/engine/src/services/ledger.service.ts` — financial ledger
  - `packages/engine/src/constants.ts` — fee configuration (BASE_DELIVERY_FEE, SERVICE_FEE_PERCENT, HST_RATE, PLATFORM_FEE_PERCENT)
  - `packages/db/src/repositories/` — all DB access

- **Gotchas:**
  - `database.types.ts` can be truncated if `db:generate` fails — restore from git
  - Promo codes have dual column sets (canonical: `starts_at`/`expires_at` + alias: `valid_from`/`valid_until`) synced by trigger
  - RLS policies use helper functions (`is_platform_staff`, `is_finance_staff`, `is_support_staff`) — check `00025_rls_role_alignment.sql`
  - `checkout_idempotency_keys` table used by checkout — separate from Stripe webhook idempotency (`stripe_events_processed`)
  - Driver location never sent to customer channel — only `route_progress_pct` and polyline

- **Domain context:**
  - Ridendine is the payment **merchant** — collects from customers, pays out to chefs/drivers
  - Chef storefront is the primary listing entity (not chef profile)
  - Order flow: customer checkout → payment → chef accept → prepare → ready → dispatch → driver deliver
  - Dispatch uses offer chain: rank drivers by ETA → offer → accept/decline/expire → next driver or escalate to ops

## Runtime Environment

- **Start command:** `pnpm dev` (all apps) or `pnpm dev:web` (port 3000), `pnpm dev:chef` (3001), `pnpm dev:ops` (3002), `pnpm dev:driver` (3003)
- **Deploy:** Vercel (4 separate deploys per app)
- **Health check:** `GET /api/health` on each app
- **DB:** Supabase (local via Docker for dev, hosted for staging/prod)

## Assumptions

- Stripe Connect Express is available in Canada for marketplace payouts — supported by Stripe docs for Canadian businesses — Tasks 1, 2 depend on this
- OSRM public server (`router.project-osrm.org`) is sufficient for Hamilton launch volume — supported by existing `@ridendine/routing` package using it — Tasks 3, 4 depend on this
- Supabase Realtime handles Hamilton-scale concurrent connections (< 1000) — supported by Supabase free tier limits — Tasks 5, 6 depend on this
- Chef/driver onboarding via Stripe Connect can use Express accounts (not Custom) — simplifies compliance — Tasks 1, 2 depend on this
- Email delivery via Supabase built-in or Resend.com (already in engine email-provider) — Task 7 depends on this

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Stripe Connect Express not available for home chefs in Ontario | Low | High | Verify Stripe's MCC codes for home food businesses before implementing; fall back to manual transfers if needed |
| OSRM public server rate-limited at launch | Medium | Medium | Cache routes aggressively in `deliveries` table (already done); have Mapbox key ready as fallback provider |
| Geocoding accuracy for Hamilton addresses | Medium | Low | Use Supabase PostGIS or Google Maps Geocoding API; validate with real Hamilton addresses during testing |
| Customer push notification browser support | Low | Low | Web Push API supported in all modern browsers; fallback to email/SMS which are built regardless |
| Dynamic delivery fee pricing confusion | Medium | Medium | Show fee breakdown clearly at checkout (already done); keep minimum fee reasonable ($3.99-$7.99 range) |

## Goal Verification

### Truths

1. A customer can browse chefs, add items to cart, checkout with Stripe, and receive order confirmation — verified end-to-end
2. A chef receives a real-time audio alert for new orders and can accept/reject within their dashboard
3. Delivery fee is calculated based on distance (not static $5) and shown at checkout
4. Chef and driver can complete Stripe Connect Express onboarding from their respective dashboards
5. Customer receives email notification at each major status change (placed, preparing, on the way, delivered)
6. Customer can cancel a pending order before chef accepts
7. Driver can upload proof-of-delivery photo when marking delivery complete

### Artifacts

1. `apps/web/src/app/api/checkout/route.ts` — updated with distance-based fee + geocoding
2. `packages/engine/src/services/stripe-connect.service.ts` — new Connect Express service
3. `apps/chef-admin/src/components/orders/order-alert.tsx` — audio + push alert component
4. `packages/engine/src/core/notification-triggers.ts` — enhanced with email/SMS dispatch
5. `apps/web/src/app/api/orders/[id]/cancel/route.ts` — new cancellation endpoint
6. `apps/driver-app/src/components/delivery/proof-of-delivery.tsx` — photo capture component

## Progress Tracking

- [x] Task 1: Stripe Connect Express — Chef Onboarding (already implemented)
- [ ] Task 2: Stripe Connect Express — Driver Onboarding (blocked by Task 1)
- [ ] Task 9: Address Geocoding & Delivery Zone Validation
- [ ] Task 3: Distance-Based Delivery Fee Calculation (blocked by Task 9)
- [ ] Task 4: Dynamic ETA Calculation at Checkout
- [ ] Task 5: Customer Order Cancellation Flow
- [x] Task 6: Chef Real-Time Order Alerts (already implemented — Realtime sub + audio + toast)
- [ ] Task 7: Email/SMS Order Status Notifications
- [x] Task 8: Driver Proof-of-Delivery Photo Capture (already implemented)
- [x] Task 10: Customer Search & Discovery Improvements
- [x] Task 11: Re-Order from Order History (already implemented)
- [x] Task 12: Cart Persistence Across Sessions (already implemented)
- [x] Task 13: Driver Navigation Integration (already implemented)
- [ ] Task 14: Web Push Notifications
- [ ] Task 15: Order Scheduling / Pre-Orders
      **Total Tasks:** 15 | **Completed:** 7 | **Remaining:** 8

## Implementation Tasks

### Task 1: Stripe Connect Express — Chef Onboarding

**Objective:** Enable chefs to onboard onto Stripe Connect Express so Ridendine can automatically split payments and pay chefs their share after each order.
**Dependencies:** None
**Mapped Scenarios:** TS-001

**Files:**

- Create: `packages/engine/src/services/stripe-connect.service.ts`
- Modify: `apps/chef-admin/src/app/api/payouts/setup/route.ts`
- Modify: `apps/chef-admin/src/app/dashboard/payouts/page.tsx`
- Modify: `packages/db/src/repositories/chef.repository.ts`
- Create: `apps/chef-admin/src/components/payouts/connect-onboarding.tsx`

**Key Decisions / Notes:**

- Use Stripe Connect Express accounts — simplest onboarding (Stripe-hosted dashboard, minimal compliance burden)
- `chef_payout_accounts` table already exists with fields for Stripe account info
- Create Account Link for onboarding, redirect chef to Stripe-hosted form, handle return/refresh URLs
- Store `stripe_account_id` in `chef_payout_accounts` on successful onboarding
- Check `account.updated` webhook to verify charges_enabled before allowing payouts
- Pattern: follow `packages/engine/src/services/stripe.service.ts` singleton + environment safety

**Definition of Done:**

- [ ] Chef can click "Set Up Payouts" in dashboard and be redirected to Stripe Express onboarding
- [ ] On completion, `chef_payout_accounts.stripe_account_id` is populated
- [ ] Dashboard shows payout account status (not connected / pending / active)
- [ ] Stripe `account.updated` webhook handler verifies `charges_enabled`
- [ ] Tests pass for Connect service (mock Stripe SDK)
- [ ] No diagnostics errors

**Verify:**

- `pnpm --filter @ridendine/engine test -- --grep "connect"`
- `pnpm --filter chef-admin build`

---

### Task 2: Stripe Connect Express — Driver Onboarding

**Objective:** Enable drivers to onboard onto Stripe Connect Express for automatic earnings payouts.
**Dependencies:** Task 1 (hard dependency — Task 1 must be merged to main before Task 2 implementation begins; `stripe-connect.service.ts` does not exist until Task 1 creates it)
**Mapped Scenarios:** TS-002

**Files:**

- Modify: `packages/engine/src/services/stripe-connect.service.ts` (add driver account type)
- Create: `supabase/migrations/NNNNN_driver_payout_accounts.sql` (create `driver_payout_accounts` table mirroring `chef_payout_accounts`)
- Modify: `apps/driver-app/src/app/api/payouts/instant/route.ts`
- Modify: `apps/driver-app/src/app/profile/page.tsx`
- Modify: `packages/db/src/repositories/driver.repository.ts`
- Create: `apps/driver-app/src/components/profile/connect-onboarding.tsx`

**Key Decisions / Notes:**

- **Hard dependency: Task 1 must be merged before Task 2 starts** — `stripe-connect.service.ts` is created in Task 1
- Reuse `stripe-connect.service.ts` from Task 1 — parameterize by account holder type (chef vs driver)
- **Storage:** Create `driver_payout_accounts` table mirroring `chef_payout_accounts` structure (same columns: `stripe_account_id`, `charges_enabled`, `payouts_enabled`, `onboarding_completed_at`) for symmetry. Do NOT add `stripe_account_id` directly to the `drivers` table.
- `drivers` table has `instant_payouts_enabled` column (Phase 0) — link to Connect account verification
- Driver profile page gets a "Set Up Payouts" section similar to chef
- `instant_payout_requests` table already exists for instant payout queue

**Definition of Done:**

- [ ] `driver_payout_accounts` migration applied successfully
- [ ] Driver can initiate Stripe Connect onboarding from profile page
- [ ] Connect account ID stored in `driver_payout_accounts.stripe_account_id`
- [ ] Instant payouts only enabled when `charges_enabled` is true on Connect account
- [ ] Task 1 tests still pass after Task 2 changes
- [ ] Tests pass
- [ ] No diagnostics errors

**Verify:**

- `pnpm --filter @ridendine/engine test -- --grep "connect"`
- `pnpm --filter driver-app build`

---

### Task 3: Distance-Based Delivery Fee Calculation

**Objective:** Replace the static $5 delivery fee with a distance-based calculation using OSRM routing data.
**Dependencies:** Task 9 (required — geocoding migration must be applied first so `customer_addresses` has `latitude`/`longitude` columns for distance calculation)
**Mapped Scenarios:** TS-003

**Files:**

- Modify: `packages/engine/src/constants.ts` (add fee tiers/formula)
- Create: `packages/engine/src/services/delivery-fee.service.ts`
- Modify: `apps/web/src/app/api/checkout/route.ts` (use dynamic fee)
- Modify: `packages/routing/src/eta.service.ts` (expose distance for fee calc)
- Modify: `packages/engine/src/services/tax-config.service.ts` (fee tiers from platform_settings)

**Key Decisions / Notes:**

- Fee formula: base fee ($3.99) + per-km rate ($0.50/km) + small order surcharge if subtotal < min_order_amount
- Cap at max fee ($9.99) to stay competitive with UberEats
- `deliveries` table already has `route_to_dropoff_meters` from OSRM — use this for post-checkout adjustment
- For pre-checkout estimate: use straight-line distance × 1.3 factor (typical road factor) until actual route computed
- Store fee config in `platform_settings` row for ops to adjust without code deploy
- `computeServerQuote()` in checkout route currently uses `BASE_DELIVERY_FEE` constant — replace with service call

**Definition of Done:**

- [ ] Delivery fee varies by distance (verified with 2km vs 10km addresses)
- [ ] Fee breakdown shows in checkout sidebar
- [ ] Platform settings table has delivery fee tiers (base_fee, per_km_rate, max_fee)
- [ ] Existing tests updated, new fee calculation tests pass
- [ ] No diagnostics errors

**Verify:**

- `pnpm --filter @ridendine/engine test -- --grep "delivery-fee"`
- `pnpm --filter web build`

---

### Task 4: Dynamic ETA Calculation at Checkout

**Objective:** Replace hardcoded "~30-45 min" with real ETA based on chef prep time + OSRM routing distance.
**Dependencies:** None (uses existing `@ridendine/routing` EtaService)
**Mapped Scenarios:** TS-004

**Files:**

- Modify: `apps/web/src/app/checkout/page.tsx` (display dynamic ETA)
- Create: `apps/web/src/app/api/eta/route.ts` (GET endpoint for pre-checkout ETA estimate)
- Modify: `packages/engine/src/services/eta.service.ts` (add pre-order estimate method)
- Modify: `apps/web/src/app/chefs/[slug]/page.tsx` (show estimated delivery time on storefront)

**Key Decisions / Notes:**

- ETA = avg prep time (from `chef_availability` or storefront setting, default 20 min) + driving time (OSRM) + buffer (5 min)
- Pre-checkout: estimate using customer's saved default address → storefront location
- `EtaService` already has `computeInitial` for post-order — add a lightweight `estimatePreOrder(storefrontId, customerAddressId)` that doesn't write to DB
- Show "Estimated X-Y min" range (±5 min) on chef storefront and checkout
- Cache OSRM responses for same origin/destination pairs (5 min TTL)

**Definition of Done:**

- [ ] Checkout page shows "Est. delivery: X-Y min" based on real calculation (not hardcoded)
- [ ] Chef storefront page shows estimated delivery time
- [ ] `GET /api/eta?storefrontId=X&addressId=Y` returns ETA estimate
- [ ] ETA falls back gracefully if OSRM is unavailable (shows "30-45 min")
- [ ] Tests pass
- [ ] No diagnostics errors

**Verify:**

- `pnpm --filter @ridendine/engine test -- --grep "eta"`
- `pnpm --filter web build`

---

### Task 5: Customer Order Cancellation Flow

**Objective:** Allow customers to cancel pending orders (before chef accepts) from the order tracking page.
**Dependencies:** None
**Mapped Scenarios:** TS-005

**Files:**

- Create: `apps/web/src/app/api/orders/[id]/cancel/route.ts`
- Modify: `apps/web/src/components/tracking/live-order-tracker.tsx` (add cancel button)
- Modify: `packages/engine/src/orchestrators/master-order-engine.ts` (add customer-initiated cancel validation)
- Modify: `packages/engine/src/services/orders.service.ts` (cancel + refund trigger)

**Key Decisions / Notes:**

- Cancellation window: only when `engine_status` is `pending` (before chef accepts)
- After chef accepts (`accepted`/`preparing`/`ready`): show "Contact support to cancel" message
- Cancellation triggers automatic full refund via Stripe (payment_intent.cancel or refund)
- Engine already has `cancelOrder` method — add customer-facing validation that checks timing
- `order_status_history` records the cancellation with `actor_type: 'customer'`
- Emit `domain_event` for cancellation → triggers notification to chef

**Definition of Done:**

- [ ] "Cancel Order" button visible on tracking page when order is pending
- [ ] Button hidden/disabled after chef accepts
- [ ] Cancellation triggers Stripe refund
- [ ] `order_status_history` records customer cancellation
- [ ] Chef receives notification of cancellation
- [ ] Tests pass for cancellation flow
- [ ] No diagnostics errors

**Verify:**

- `pnpm --filter @ridendine/engine test -- --grep "cancel"`
- `pnpm --filter web build`

---

### Task 6: Chef Real-Time Order Alerts

**Objective:** Add audio alerts and browser push notifications for new orders in the chef dashboard.
**Dependencies:** None
**Mapped Scenarios:** TS-006

**Files:**

- Create: `apps/chef-admin/src/components/orders/order-alert.tsx`
- Modify: `apps/chef-admin/src/components/orders/orders-list.tsx` (integrate alert)
- Create: `apps/chef-admin/public/sounds/new-order.mp3` (alert sound)
- Modify: `apps/chef-admin/src/app/dashboard/orders/page.tsx` (wire Supabase Realtime subscription)

**Key Decisions / Notes:**

- Use Supabase Realtime `postgres_changes` on `orders` table filtered by `storefront_id`
- Play audio alert (`new Audio('/sounds/new-order.mp3').play()`) on new order insert
- Show toast/banner with order details and accept/reject buttons
- Browser Notification API for background tab alerts (request permission on first visit)
- Auto-refresh orders list when new order arrives
- UberEats pattern: persistent alert sound until chef acknowledges

**Definition of Done:**

- [ ] Audio plays when new order arrives (even when tab is not focused — use service worker if needed)
- [ ] Toast/notification shows order summary with accept/reject actions
- [ ] Browser notification appears when tab is in background
- [ ] Sound stops when chef interacts with the order
- [ ] Works with Supabase Realtime subscription
- [ ] No diagnostics errors

**Verify:**

- `pnpm --filter chef-admin build`
- Manual E2E: place order → verify alert plays in chef dashboard

---

### Task 7: Email/SMS Order Status Notifications

**Objective:** Send email (and optionally SMS) notifications to customers at each major order status change.
**Dependencies:** None
**Mapped Scenarios:** TS-007

**Files:**

- Modify: `packages/engine/src/core/notification-triggers.ts` (add email dispatch calls)
- Modify: `packages/engine/src/core/email-provider.ts` (implement actual email sending)
- Modify: `packages/engine/src/core/sms-provider.ts` (implement actual SMS sending)
- Modify: `packages/notifications/src/templates.ts` (add order status email templates)
- Create: `packages/notifications/src/email-templates/order-confirmed.tsx` (React Email template)

**Key Decisions / Notes:**

- **Mandatory first step:** Before writing any code, read `packages/engine/src/core/email-provider.ts` and `sms-provider.ts` in full. Check `.env.local` and Vercel env vars for `RESEND_API_KEY` and `TWILIO_*` variables. Document current implementation state in a comment at the top of the PR. This resolves the open question about provider readiness.
- Email provider: Resend.com (already referenced in codebase email-provider — verify configuration state first)
- SMS provider: Twilio (for critical notifications only — order placed, out for delivery, delivered)
- Templates: React Email for HTML emails (supports Next.js ecosystem)
- Notification triggers already exist in `notification-triggers.ts` — they emit to `notifications` table but don't send external notifications
- Status changes to notify: `pending`→confirmed, `accepted`, `preparing`, `picked_up`/on the way, `delivered`
- Chef notifications: new order alert email, cancellation email
- Driver notifications: new offer SMS
- Respect notification preferences (DB table `notification_preferences` mentioned in launch checklist — may need migration)

**Definition of Done:**

- [ ] Customer receives email at: order confirmed, chef accepted, on the way, delivered
- [ ] Chef receives email at: new order, order cancelled
- [ ] Email templates are branded with RideNDine colors/logo
- [ ] SMS sent for: order on the way, order delivered (customer); new offer (driver)
- [ ] Notification sending failures don't block order flow (fire-and-forget with logging)
- [ ] Tests pass with mocked email/SMS providers
- [ ] No diagnostics errors

**Verify:**

- `pnpm --filter @ridendine/engine test -- --grep "notification"`
- `pnpm --filter @ridendine/notifications build`

---

### Task 8: Driver Proof-of-Delivery Photo Capture

**Objective:** Enable drivers to capture and upload a photo when marking a delivery as complete (proof of delivery).
**Dependencies:** None
**Mapped Scenarios:** TS-008

**Files:**

- Create: `apps/driver-app/src/components/delivery/proof-of-delivery.tsx`
- Modify: `apps/driver-app/src/app/delivery/[id]/page.tsx` (integrate photo step before marking delivered)
- Modify: `apps/driver-app/src/app/api/deliveries/[id]/route.ts` (accept photo upload on status change)
- Modify: `packages/engine/src/services/storage.service.ts` (add delivery photo upload to Supabase Storage)

**Key Decisions / Notes:**

- Use device camera via `<input type="file" accept="image/*" capture="environment">`
- Upload to Supabase Storage bucket `delivery-photos/{deliveryId}/proof.jpg`
- Compress image client-side before upload (target < 500KB)
- `deliveries` table already has `pickup_photo_url` and `dropoff_photo_url` columns
- Making photo **required** before marking `delivered` — UberEats/DoorDash standard
- `storage.service.ts` already exists — add delivery photo bucket operations

**Definition of Done:**

- [ ] Driver sees "Take Photo" step before confirming delivery
- [ ] Photo uploads to Supabase Storage
- [ ] `deliveries.dropoff_photo_url` populated with storage URL
- [ ] Photo visible in ops-admin delivery detail page
- [ ] Cannot mark delivered without photo
- [ ] Tests pass
- [ ] No diagnostics errors

**Verify:**

- `pnpm --filter driver-app build`
- Manual E2E: delivery flow → photo required → upload succeeds

---

### Task 9: Address Geocoding & Delivery Zone Validation

**Objective:** Geocode customer addresses and validate they fall within the Hamilton delivery zone before allowing checkout.
**Dependencies:** None
**Mapped Scenarios:** TS-003

**Files:**

- Create: `packages/engine/src/services/geocoding.service.ts`
- Modify: `apps/web/src/app/api/addresses/route.ts` (geocode on address creation)
- Modify: `apps/web/src/app/api/checkout/route.ts` (validate delivery zone)
- Modify: `packages/db/src/repositories/address.repository.ts` (store lat/lng)

**Key Decisions / Notes:**

- `customer_addresses` table needs `latitude`/`longitude` columns (add migration if missing)
- `service_areas` table already exists (Phase 0) — use it to define Hamilton delivery zone polygon
- Geocoding: use Nominatim (free, OSM-based) for Hamilton — fallback to Google Maps Geocoding if accuracy insufficient
- Validate at checkout: customer address must fall within at least one active `service_area`
- Cache geocoding results — same address string → same coordinates
- `chef_kitchens` table has location data — use for distance calculation

**Definition of Done:**

- [ ] New addresses are geocoded on creation (lat/lng stored)
- [ ] Checkout validates customer address is within Hamilton service area
- [ ] Clear error message if address is outside delivery zone
- [ ] Existing addresses backfilled with coordinates (migration script)
- [ ] Tests pass for geocoding and zone validation
- [ ] No diagnostics errors

**Verify:**

- `pnpm --filter @ridendine/engine test -- --grep "geocod"`
- `pnpm --filter web build`

---

### Task 10: Customer Search & Discovery Improvements

**Objective:** Improve chef browsing with search by name/cuisine, sort by rating/delivery time, and better empty states.
**Dependencies:** Task 4 (ETA for "sort by delivery time")
**Mapped Scenarios:** TS-010

**Files:**

- Modify: `apps/web/src/components/chefs/chefs-list.tsx` (add sorting, improve display)
- Modify: `apps/web/src/components/chefs/chefs-filters.tsx` (add sort options, search input)
- Modify: `apps/web/src/app/chefs/page.tsx` (pass sort params)
- Modify: `packages/db/src/repositories/storefront.repository.ts` (add search/sort queries)

**Key Decisions / Notes:**

- Current filters: search text, cuisine array, min rating — these work but UX can improve
- Add: sort by (rating, delivery time, newest, popular), full-text search on chef name + cuisine + description
- Supabase `textSearch` or `ilike` for search
- "Popular" sort: order by `total_orders` (need to add or compute from `orders` count)
- Show "Open Now" / "Closed" badges based on `chef_availability`
- Display estimated delivery time per chef card (from Task 4 ETA endpoint)

**Definition of Done:**

- [ ] Search finds chefs by name, cuisine type, or dish name
- [ ] Sort options: Rating, Delivery Time, Popular, Newest
- [ ] "Open Now" / "Closed" badge on each chef card
- [ ] Empty state: "No chefs match your search" with clear filters button
- [ ] Tests pass
- [ ] No diagnostics errors

**Verify:**

- `pnpm --filter web build`

---

### Task 11: Re-Order from Order History

**Objective:** Allow customers to re-order a previous order with one click, adding all items back to cart.
**Dependencies:** None
**Mapped Scenarios:** TS-011

**Files:**

- Create: `apps/web/src/app/api/orders/[id]/reorder/route.ts`
- Modify: `apps/web/src/app/account/orders/page.tsx` (add "Order Again" button)
- Modify: `packages/db/src/repositories/cart.repository.ts` (add bulk add-to-cart)
- Modify: `packages/db/src/repositories/order.repository.ts` (add get-order-items-for-reorder)

**Key Decisions / Notes:**

- "Order Again" button on each completed order in order history
- POST `/api/orders/{id}/reorder` → validates items still exist and are available → creates/updates cart → redirect to checkout
- Handle unavailable items gracefully: add what's available, show message about skipped items
- If cart already has items from a different storefront, warn user (existing cart behavior)
- UberEats pattern: one-tap reorder with confirmation toast

**Definition of Done:**

- [ ] "Order Again" button visible on completed orders in order history
- [ ] Clicking adds all available items to cart
- [ ] Unavailable items are skipped with a notification
- [ ] Redirects to cart page after reorder
- [ ] Tests pass
- [ ] No diagnostics errors

**Verify:**

- `pnpm --filter web build`

---

### Task 12: Cart Persistence Across Sessions

**Objective:** Ensure cart items survive page refreshes and browser closes for logged-in users.
**Dependencies:** None

**Trivial:** Cart is already DB-backed via `carts`/`cart_items` tables tied to `customer_id`. The issue is that the cart page loads from API on every visit and the cart state in the header may be stale. ≤5 lines of real logic change — add a cart count fetch to the header component and verify persistence. Covered by existing cart API tests.

**Files:**

- Modify: `apps/web/src/components/layout/header.tsx` (add cart item count badge)
- Modify: `apps/web/src/app/cart/page.tsx` (verify DB persistence works correctly)

**Key Decisions / Notes:**

- Cart is already stored in `carts` + `cart_items` tables per customer per storefront — this is a UX polish task
- Add cart count badge to header (fetch from `/api/cart` or use a lightweight count endpoint)
- Verify: add item → close browser → reopen → cart still has items

**Definition of Done:**

- [ ] Cart badge in header shows item count
- [ ] Cart items persist across browser sessions (already DB-backed)
- [ ] No diagnostics errors

**Verify:**

- `pnpm --filter web build`

---

### Task 13: Driver Navigation Integration

**Objective:** Add "Navigate" button that deep-links to Google Maps or Waze for turn-by-turn directions.
**Dependencies:** None

**Files:**

- Modify: `apps/driver-app/src/app/delivery/[id]/page.tsx` (add navigate button)
- Create: `apps/driver-app/src/lib/navigation.ts` (platform-detect + deep link builder)

**Key Decisions / Notes:**

- Use universal links: `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG` (works on all devices)
- Waze: `https://waze.com/ul?ll=LAT,LNG&navigate=yes`
- Detect platform (iOS/Android/desktop) and offer appropriate options
- Two navigation points: "Navigate to Pickup" (chef kitchen) and "Navigate to Customer" (delivery address)
- `deliveries` table has pickup/dropoff coordinates from geocoding

**Definition of Done:**

- [ ] "Navigate" button on active delivery page
- [ ] Opens Google Maps (default) or Waze with correct destination
- [ ] Button changes from "Navigate to Pickup" → "Navigate to Customer" based on delivery status
- [ ] No diagnostics errors

**Verify:**

- `pnpm --filter driver-app build`

---

### Task 14: Web Push Notifications

**Objective:** Implement web push notifications for order status updates when the customer's browser tab is closed or in background.
**Dependencies:** Task 7 (notification triggers)
**Mapped Scenarios:** TS-014

**Files:**

- Create: `apps/web/public/sw.js` (service worker for push)
- Create: `apps/web/src/lib/push-notifications.ts` (subscription management)
- Modify: `apps/web/src/app/api/notifications/subscribe/route.ts` (store push subscription)
- Modify: `packages/engine/src/core/notification-sender.ts` (add web push dispatch)
- Modify: `packages/db/src/repositories/` (update `push_subscriptions` table usage)

**Key Decisions / Notes:**

- `push_subscriptions` table already exists (from `00004_additions.sql`)
- Use Web Push API with VAPID keys (generate and store in env vars)
- Service worker intercepts push events and shows native notification
- Subscribe prompt: show after first order is placed (not on page load — reduces permission fatigue)
- Notifications: "Your order is being prepared", "Your order is on the way", "Your order has been delivered"
- Click notification → opens order tracking page

**Definition of Done:**

- [ ] Service worker registered and handles push events
- [ ] Customer prompted to enable notifications after first order
- [ ] Push notifications sent for: preparing, on the way, delivered
- [ ] Clicking notification opens order tracking page
- [ ] Subscription stored in `push_subscriptions` table
- [ ] Tests pass (mock Web Push API)
- [ ] No diagnostics errors

**Verify:**

- `pnpm --filter web build`

---

### Task 15: Order Scheduling / Pre-Orders

**Objective:** Allow customers to schedule orders for a future time slot instead of only "ASAP" delivery.
**Dependencies:** Task 4 (ETA service), Task 6 (chef alerts)

**Files:**

- Modify: `apps/web/src/app/checkout/page.tsx` (add "Schedule for later" option)
- Modify: `apps/web/src/app/api/checkout/route.ts` (accept scheduled_for timestamp)
- Modify: `packages/engine/src/orchestrators/order-creation.service.ts` (handle scheduled orders)
- Modify: `packages/validation/src/schemas/order.ts` (add scheduled_for to checkout schema)
- Create: `apps/web/src/components/checkout/schedule-picker.tsx`
- Create: `supabase/migrations/NNNNN_scheduled_orders.sql` (add `scheduled_for` column to `orders` + pg_cron job)

**Key Decisions / Notes:**

- Add `scheduled_for` column to `orders` table (nullable — null = ASAP)
- Available time slots: chef's operating hours from `chef_availability`, in 30-min increments
- Scheduled orders sit in `scheduled` engine status until trigger time, then transition to `pending`
- **Scheduler mechanism:** Use Supabase pg_cron (already available in Postgres instance, no extra infra). Create a pg_cron job that runs every 5 minutes: `SELECT cron.schedule('process-scheduled-orders', '*/5 * * * *', $$...$$$)` that transitions orders with `scheduled_for <= NOW()` from `scheduled` to `pending`. Vercel Serverless cannot run persistent background jobs — pg_cron is the lowest-friction option.
- UberEats pattern: "Deliver now" (default) vs "Schedule for later" toggle at checkout
- Minimum schedule window: 1 hour from now; maximum: 7 days

**Definition of Done:**

- [ ] Checkout shows "Deliver now" / "Schedule for later" toggle
- [ ] Schedule picker shows available time slots based on chef availability
- [ ] Scheduled order created with `scheduled_for` timestamp
- [ ] pg_cron job configured and confirmed running in Supabase dashboard
- [ ] pg_cron triggers a test scheduled order correctly (transition from `scheduled` to `pending`)
- [ ] Customer sees scheduled time in order tracking
- [ ] Tests pass
- [ ] No diagnostics errors

**Verify:**

- `pnpm --filter @ridendine/engine test -- --grep "schedule"`
- `pnpm --filter web build`

## E2E Test Scenarios

### TS-001: Chef Stripe Connect Onboarding
**Priority:** Critical
**Preconditions:** Logged in as approved chef, no existing payout account
**Mapped Tasks:** Task 1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard/payouts` | See "Set Up Payouts" button |
| 2 | Click "Set Up Payouts" | Redirected to Stripe Connect onboarding |
| 3 | Complete Stripe onboarding (test mode) | Redirected back to dashboard |
| 4 | Verify payout status | Shows "Active" or "Pending verification" |

### TS-002: Driver Stripe Connect Onboarding
**Priority:** Critical
**Preconditions:** Logged in as approved driver, no existing payout account
**Mapped Tasks:** Task 2

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profile` | See "Set Up Payouts" section |
| 2 | Click "Set Up Payouts" | Redirected to Stripe Connect onboarding |
| 3 | Complete onboarding | Redirected back to profile |
| 4 | Verify payout status | Shows account connected status |

### TS-003: Distance-Based Delivery Fee
**Priority:** Critical
**Preconditions:** Logged in as customer, items in cart, saved address
**Mapped Tasks:** Task 3, Task 9

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to checkout with items | See cart with items |
| 2 | Select nearby address (2km) | Delivery fee shows ~$4.99 |
| 3 | Select farther address (8km) | Delivery fee shows ~$7.99 |
| 4 | Complete checkout | Fee matches what was shown |

### TS-004: Dynamic ETA Display
**Priority:** High
**Preconditions:** Logged in, viewing chef storefront
**Mapped Tasks:** Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Browse to chef storefront | See "Est. delivery: X-Y min" (not "30-45 min") |
| 2 | Go to checkout | ETA shown based on address distance |

### TS-005: Customer Order Cancellation
**Priority:** Critical
**Preconditions:** Logged in, active pending order
**Mapped Tasks:** Task 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to order tracking | See "Cancel Order" button |
| 2 | Click "Cancel Order" | Confirmation dialog appears |
| 3 | Confirm cancellation | Order status changes to cancelled |
| 4 | Check payment | Refund initiated (visible in order details) |
| 5 | Check chef dashboard | Cancellation notification visible |

### TS-006: Chef Order Alert
**Priority:** High
**Preconditions:** Logged in as chef, dashboard open
**Mapped Tasks:** Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open chef dashboard orders page | Page loaded |
| 2 | Customer places order (from another browser) | Audio alert plays, toast notification shows |
| 3 | Click accept on the toast | Order accepted, alert stops |

### TS-007: Email Notifications
**Priority:** High
**Preconditions:** Customer with valid email, order in progress
**Mapped Tasks:** Task 7

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Place order | Confirmation email sent |
| 2 | Chef accepts | "Order accepted" email sent |
| 3 | Driver picks up | "On the way" email sent |
| 4 | Driver delivers | "Delivered" email sent |

### TS-008: Driver Proof of Delivery
**Priority:** Critical
**Preconditions:** Driver with active delivery, at dropoff location
**Mapped Tasks:** Task 8

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to active delivery | See delivery details |
| 2 | Click "Mark Delivered" | Photo capture screen appears |
| 3 | Take photo | Photo preview shown |
| 4 | Confirm delivery | Photo uploaded, delivery marked complete |
| 5 | Check ops-admin | Photo visible in delivery detail |

### TS-010: Improved Search
**Priority:** Medium
**Preconditions:** Multiple chefs in system
**Mapped Tasks:** Task 10

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/chefs` | See chef grid with filters |
| 2 | Search "Italian" | Only Italian cuisine chefs shown |
| 3 | Sort by "Rating" | Highest rated chefs first |
| 4 | Search "asdfqwer" | "No chefs match" empty state |

### TS-011: Re-Order
**Priority:** Medium
**Preconditions:** Logged in, at least one completed order
**Mapped Tasks:** Task 11

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to order history | See completed orders |
| 2 | Click "Order Again" on a past order | Items added to cart |
| 3 | Check cart | Same items (available ones) in cart |

### TS-014: Web Push Notifications
**Priority:** Medium
**Preconditions:** Customer with active order, push permissions granted
**Mapped Tasks:** Task 14

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Place order and close browser tab | Order processing |
| 2 | Chef accepts order | Push notification appears in OS |
| 3 | Click notification | Browser opens to order tracking page |

## Open Questions

1. **Email provider:** Is Resend.com already set up, or should we use Supabase's built-in email? Check env vars for `RESEND_API_KEY`.
2. **SMS provider:** Is Twilio already configured? Check env vars for `TWILIO_*`. If not, defer SMS to Phase 2 and focus on email for Phase 1.
3. **Geocoding provider:** Nominatim (free/OSM) vs Google Maps Geocoding API — accuracy vs cost tradeoff for Hamilton addresses.
4. **Stripe Connect application:** Has a Stripe Connect platform application been created in the Stripe dashboard? Required before Express accounts can be created.

## Deferred Ideas

- **Multi-zone pricing:** Different fee structures per service area (Phase 3)
- **Surge pricing:** Higher fees during peak hours (Phase 3)
- **Driver batching:** Assign multiple pickups to one driver when route is efficient (Phase 3)
- **Customer loyalty program:** Points per order, redeemable for discounts (Phase 3)
- **Chef subscription meals:** Weekly meal plans from favorite chefs (Phase 3)
- **Group ordering:** Multiple people add to one order (Phase 3)
- **In-app chat:** Customer ↔ driver or customer ↔ chef messaging (Phase 3)
- **Advanced analytics dashboard:** Conversion funnels, cohort analysis, LTV (Phase 3)
