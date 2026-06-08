# Cross-App Contracts

This document is the authoritative inventory of every cross-app data hop in Ridendine — what each app writes, what each app reads, what travels over Supabase Realtime, and which payloads are sanitized vs. raw. It is the contract the lifecycle E2E test (`docs/plans/2026-05-18-production-readiness-stabilization.md` Task 5) asserts against.

**Naming convention used below:** "App → Server" means HTTP/HTTPS from a Next.js app to its own API routes (which then call `@ridendine/engine` / `@ridendine/db`). "Server → App" means a Supabase Realtime broadcast or `postgres_changes` event consumed by a subscribed client.

**Source of truth principles:**
- All money movement and lifecycle transitions are server-owned. UIs do not invent state.
- Customer apps see `orders.public_stage` only — never raw `engine_status` or driver/chef coordinates.
- Engine state mutations go through `MasterOrderEngine` / `DeliveryEngine` (see `packages/engine/src/orchestrators/order-state-machine.ts`).
- Realtime channel names live in `packages/db/src/realtime/channels.ts`. Do not hard-code channel strings elsewhere.

---

## Boundary 1 — Customer (`apps/web`) ↔ Server

### Customer → Server (HTTP writes)

| Action | Route | Auth | Payload (writer side) | Reader side / where it lands |
|--------|-------|------|------------------------|------------------------------|
| Create customer account | `POST /api/auth/signup` (`apps/web/src/app/api/auth/signup/route.ts`) | Public | `{ email, password, first_name, last_name, phone? }` | Supabase `auth.users` + `customers` row (server-side via admin client) |
| Get quote (pre-checkout) | `POST /api/checkout/quote` (`apps/web/src/app/api/checkout/quote/route.ts`) | Customer session | Cart items + delivery address id | Returns `{ subtotal_cents, delivery_fee_cents, tax_cents, total_cents, unavailable_items? }`; calls `buildCheckoutQuote` |
| Place order | `POST /api/checkout` (`apps/web/src/app/api/checkout/route.ts`) | Customer session | Same as quote + payment method | Creates `orders` row in `checkout_pending`; creates Stripe PaymentIntent; **does NOT authorize yet** — webhook does (`packages/engine/src/services/stripe.service.ts`) |
| Update cart | `POST /api/cart` (`apps/web/src/app/api/cart/route.ts`) | Customer session | `{ items: [...] }` | `cart_items` table |
| Cancel order (within window) | `POST /api/orders/[id]/cancel` (`apps/web/src/app/api/orders/[id]/cancel/route.ts`) | Customer session + ownership check | Reason | `engine.masterOrder.cancelOrder` → `engine_status='cancelled'`; Stripe PI cancelled |
| Read order detail | `GET /api/orders/[id]` (`apps/web/src/app/api/orders/[id]/route.ts`) | Customer session + ownership | n/a | Returns `{ public_stage, tracking }` (see below) — **NEVER `engine_status` or coordinates** |
| Reorder | `POST /api/orders/[id]/reorder` (`apps/web/src/app/api/orders/[id]/reorder/route.ts`) | Customer session + ownership | n/a | Re-populates cart from past order |
| Payment status poll | `GET /api/orders/[id]/payment-status` (`apps/web/src/app/api/orders/[id]/payment-status/route.ts`) | Customer session + ownership | n/a | Mirrors Stripe PI state |

### Server → Customer (Realtime / response payload)

**Customer-safe `tracking` object** (returned from `GET /api/orders/[id]` `apps/web/src/app/api/orders/[id]/route.ts:157`):
```
{
  public_stage: 'placed' | 'cooking' | 'on_the_way' | 'delivered' | 'cancelled' | 'refunded',
  eta_pickup_at?: string,
  eta_dropoff_at?: string,
  route_progress_pct?: number,
  route_remaining_seconds?: number,
  route_to_dropoff_polyline?: string,
}
```

**Realtime channel:** `order:{orderId}` (`orderChannel(orderId)` in `packages/db/src/realtime/channels.ts:7`).
**Event:** `order_update`.
**Payload:** whitelist-only via `sanitizePublicOrderBroadcastPayload()` in `packages/engine/src/core/public-broadcast-sanitizer.ts:54`. Allowed keys: `public_stage`, `eta_pickup_at`, `eta_dropoff_at`, `route_progress_pct`, `route_remaining_seconds`, `route_to_dropoff_polyline`.
**Forbidden in payload (sanitizer rejects):** any `lat`/`lng`/`latitude`/`longitude`/`*_lat`/`*_lng`/`position`/`location`/`coordinates`/`geolocation` (see `FORBIDDEN_EXACT_CI` set in sanitizer, line 19).
**Writer:** `DomainEventEmitter.broadcastPublic(orderId, payload)` (`packages/engine/src/core/event-emitter.ts:101`). Called from the server after engine status transitions and after driver location pings (see Boundary 3).
**Reader:** Customer web `useOrderStream` hook + `LiveOrderTracker` UI; polling fallback hits `GET /api/orders/[id]` every 60s when realtime is disconnected.

**Customer notifications** (DB-driven):
- Channel: `customer:{userId}:notifications` (`customerNotificationsChannel(userId)` in channels.ts:48)
- Pair with `postgres_changes` filter `user_id=eq.{id}`.
- Reader: customer web notifications UI.

---

## Boundary 2 — Chef (`apps/chef-admin`) ↔ Server

### Chef → Server (HTTP writes)

| Action | Route | Auth | Payload | Reader side |
|--------|-------|------|---------|-------------|
| Chef signup | `POST /api/auth/signup` (`apps/chef-admin/src/app/api/auth/signup/route.ts`) | Public | Standard + cuisine + kitchen address | `auth.users` + `chef_profiles` row (closed beta auto-approves; otherwise ops review) |
| Storefront read/update | `GET/PUT /api/storefront` (`apps/chef-admin/src/app/api/storefront/route.ts`) | Chef session | Storefront fields | `chef_storefronts` |
| Storefront availability | `PUT /api/storefront/availability` (`apps/chef-admin/src/app/api/storefront/availability/route.ts`) | Chef session | `{ is_paused, accepting_orders, current_queue_size, ... }` | `chef_storefronts` |
| Onboarding status | `GET /api/storefront/onboarding-status` (`apps/chef-admin/src/app/api/storefront/onboarding-status/route.ts`) | Chef session | n/a | Returns `{ stripe_connect: { account_id, payout_enabled, status }, storefront: { state }, ... }` |
| Menu CRUD | `GET/POST/PATCH /api/menu` + `/api/menu/[id]` + categories + options (`apps/chef-admin/src/app/api/menu/...`) | Chef session | Menu item / option-group / option-value fields | `menu_items`, `menu_categories`, `menu_option_groups`, `menu_option_values` |
| Read orders for storefront | `GET /api/orders` (`apps/chef-admin/src/app/api/orders/route.ts`) | Chef session + storefront ownership | n/a | `orders` filtered by storefront |
| Accept/prepare/ready transitions | `PATCH /api/orders/[id]` (`apps/chef-admin/src/app/api/orders/[id]/route.ts`) | Chef session + storefront ownership | `{ status: 'accepted' \| 'preparing' \| 'ready' }` | `engine.masterOrder.transitionOrder` → `engine_status` change → `order_status_history` row → `domain_events` → realtime broadcasts |
| Setup Stripe Connect | `POST /api/payouts/setup` (`apps/chef-admin/src/app/api/payouts/setup/route.ts`) | Chef session | n/a | Creates Stripe Connect Express account → `chef_payout_accounts` row; returns hosted onboarding URL |
| Payout history | `GET /api/payouts/history` (`apps/chef-admin/src/app/api/payouts/history/route.ts`) | Chef session | n/a | `chef_payouts` table |
| Request payout | `POST /api/payouts/request` (`apps/chef-admin/src/app/api/payouts/request/route.ts`) | Chef session | Amount + idempotency | Queues payout intent |

### Server → Chef (Realtime)

**Channel:** `chef:{storefrontId}:orders` (`chefStorefrontOrdersChannel(storefrontId)` in channels.ts:13).
**Pair with `postgres_changes` filter:** `storefront_id=eq.{storefrontId}`.
**Events:** INSERT (new order placed and authorized), UPDATE (status changes initiated by customer/ops). Payload is the full `orders` row — chef sees `engine_status` directly (no sanitization; chef is internal).
**Reader:** chef-admin orders list page subscribes; new INSERT plays the audio alert.

---

## Boundary 3 — Driver (`apps/driver-app`) ↔ Server

### Driver → Server (HTTP writes)

| Action | Route | Auth | Payload | Reader side |
|--------|-------|------|---------|-------------|
| Driver signup | `POST /api/auth/signup` (`apps/driver-app/src/app/api/auth/signup/route.ts`) | Public | Standard + vehicle | `auth.users` + `drivers` row |
| Setup Stripe Connect | `POST /api/payouts/setup` (`apps/driver-app/src/app/api/payouts/setup/route.ts`) | Driver session | n/a | Creates Connect Express account → `drivers.stripe_connect_account_id` |
| Read available + active deliveries | `GET /api/deliveries` (`apps/driver-app/src/app/api/deliveries/route.ts`) | Driver session | n/a | `deliveries` rows filtered by driver assignment |
| Respond to offer | `POST /api/offers` (`apps/driver-app/src/app/api/offers/route.ts`) | Driver session | `{ attemptId, action: 'accept' \| 'decline' }` | `engine.dispatch.respondToOffer` → assignment_attempts updated → next driver offered if declined |
| Update delivery status | `PATCH /api/deliveries/[id]` (`apps/driver-app/src/app/api/deliveries/[id]/route.ts`) | Driver session + assignment ownership | `{ status: 'arrived_at_pickup' \| 'picked_up' \| ... }` | `engine.delivery.transition` |
| Submit proof-of-delivery | `POST /api/deliveries/[id]/proof` (`apps/driver-app/src/app/api/deliveries/[id]/proof/route.ts`) | Driver session + ownership | `{ photo_url, signature_url?, notes? }` | `deliveries.proof_*` columns; advances to `delivered` |
| Flag delivery issue | `POST /api/deliveries/[id]/issue` (`apps/driver-app/src/app/api/deliveries/[id]/issue/route.ts`) | Driver session + ownership | `{ issue_type, notes }` | `order_exceptions` row; ops sees in dispatch view |
| GPS ping | `POST /api/location` (`apps/driver-app/src/app/api/location/route.ts`) | Driver session | `{ lat, lng, accuracy?, heading?, speed?, deliveryId? }` | `driver_presence` row updated; **if `deliveryId` present and active customer leg**, also triggers `engine.eta.refreshFromDriverPing` + `engine.events.broadcastPublic` (sanitized) to the customer's `order:{orderId}` channel |
| Instant payout request | `POST /api/payouts/instant` (`apps/driver-app/src/app/api/payouts/instant/route.ts`) | Driver session | `{ amount_cents }` | `instant_payout_requests` queue (Phase 5: Stripe execution) |
| Notification preferences | `GET/PATCH /api/driver/notification-preferences` (`apps/driver-app/src/app/api/driver/notification-preferences/route.ts`) | Driver session | `{ preferences }` on PATCH | `driver_notification_preferences.preferences` for the authenticated driver only |

### Server → Driver (Realtime)

**Offer stream channel:** `driver:{driverId}:offers` (constructed in `packages/engine/src/core/event-emitter.ts:124`; see also `driverAssignmentsChannel(driverId)` in channels.ts:17 for the related assignments channel).
**Events:** `offer` (new delivery offer), `offer_expired` (TTL elapsed on prior attempt). Legacy alias `offer_update` accepted by emitter but new code uses `offer`/`offer_expired`.
**Payload:** sanitized via `stripSensitiveCoordinateKeys()` in `packages/engine/src/core/public-broadcast-sanitizer.ts:71` — coordinate keys stripped. Carries `attemptId`, `deliveryId`, addresses (string), payout summary, distance summary, `expiresAt`.
**Writer:** `DomainEventEmitter.broadcastDriverOffer(driverId, attempt, event)` (event-emitter.ts:114). Called by `DispatchEngine.offerToNextDriver` (`packages/engine/src/orchestrators/dispatch.engine.ts`).
**Reader:** driver-app `OfferAlert` component subscribes via `createBrowserClient` (no HTTP polling).

**Notification channel:** standard `customer:{userId}:notifications` shape, scoped to the driver's user id. Reused for in-app driver notifications.

---

## Boundary 4 — Server → Ops (`apps/ops-admin`) Live Board

This is the cross-cutting boundary that makes ops-admin "the brain." It is asymmetric: ops READ-subscribes broadly, ops WRITES via dedicated `/api/engine/**` routes (each capability-guarded per `docs/AUTH_ROLE_MATRIX.md`).

### Server → Ops (snapshot + Realtime)

**Initial snapshot:** `GET /api/ops/live-board` (`apps/ops-admin/src/app/api/ops/live-board/route.ts:88`)
- Capability required: `dashboard_read`.
- Returns:
  ```
  {
    orders:    OpsLiveOrderSnapshot[]    // last 48h, with nested delivery
    drivers:   OpsLiveDriverSnapshot[]   // approved drivers + presence
    chefs:     OpsLiveChefSnapshot[]     // active storefronts + chef display name
    pressure: {
      openExceptions: number
      slaBreaches: number
      pendingDispatch: number
      deliveryEscalations: number
    }
  }
  ```
- "Delivered today only" filter applied client-side; everything else returned as-is.

**Live update channel:** `ops:live` (`opsLiveBoardChannel()` in channels.ts:27).
- `postgres_changes` attached on the same channel for: `orders`, `deliveries`, `driver_presence`, `chef_storefronts`.
- `broadcast` events reserved on the channel: `ops.live.patch` (table + record merge hints) and `board.refresh` (full snapshot refetch).
- Reader: `useOpsLiveFeed` hook merges row updates by `id` with monotonic `updated_at` checks via the reducer at `apps/ops-admin/src/lib/ops-live-feed-reducer.ts`. Derived columns (driver load, chef active order count) are computed from state.
- Reconnect behavior: when the channel errors or closes, a 60s snapshot refetch runs until `SUBSCRIBED` again.

**Other ops channels (less central, documented here for completeness):**
- `ops:orders` — global orders firehose (legacy, prefer `ops:live`)
- `ops:alerts` — system_alerts inserts (SLA breaches, exceptions)
- `ops:map:presence` — driver presence + active delivery polylines (internal map; full GPS allowed since ops is internal)

### Ops → Server (HTTP writes)

Capability-guarded under `apps/ops-admin/src/app/api/engine/**` and a few siblings. All require `getOpsActorContext()` + `guardPlatformApi(actor, '<capability>')` from `@ridendine/engine/server`. See `docs/AUTH_ROLE_MATRIX.md` for the full capability × role matrix; selected ones below.

| Action | Route | Capability | Effect |
|--------|-------|------------|--------|
| Engine settings | `POST /api/engine/settings` | `platform_settings` | Updates global platform config |
| Refund (request) | `POST /api/orders/[id]/refund` | `finance_refunds_request` | `engine.commerce.createRefundAdjustments` → 3 ledger reversal entries |
| Refund (sensitive read) | `GET /api/engine/refunds` | `finance_refunds_sensitive` | Full refund history with PII |
| Manual dispatch (force assign) | `POST /api/engine/dispatch` with `force_assign` | `dispatch_write` | Bypasses offer chain; requires reason; audited via `ops_override_logs` |
| Chef approval | `PATCH /api/chefs/[id]` (approve/reject) | `chefs_governance` | Updates `chef_profiles.status`; triggers welcome notification |
| Driver approval | `PATCH /api/drivers/[id]` | `drivers_governance` | Same shape for `drivers.status` |
| Payouts management | `GET/POST /api/engine/payouts` | `finance_payouts` | Read pending + run preview |
| Reconciliation | `GET /api/engine/reconciliation` | `finance_engine` | Daily Stripe↔ledger diff |
| Storefront ops | `PATCH /api/engine/storefronts/[id]` | `storefront_ops` | Pause/resume, override queue size |
| Engine maintenance | `POST /api/engine/maintenance` | `engine_maintenance` | Maintenance-window flag for cron pause |
| Engine health | `GET /api/engine/health` | `engine_health` | Component status + `readiness.processorRuns.*` (Task 2 of readiness plan) |

### Processor / cron auth (separate from session auth)

Routes under `/api/engine/processors/**` (canonical) and `/api/cron/**` (some legacy) accept either:
- `Authorization: Bearer ${CRON_SECRET}` (Vercel auto-injects on cron invocations), or
- `x-processor-token: ${ENGINE_PROCESSOR_TOKEN}` (manual probe).

Validation lives in `validateEngineProcessorHeaders` (`packages/utils/src/processor-auth.ts:11`). Fail-closed when both env vars are unset.

Idempotency for the canonical processors is tracked in the `ops_processor_runs` table via `claimProcessorRun` / `finishProcessorRun` (`apps/ops-admin/src/lib/processor-runs.ts`). Each run's `idempotency_key` follows `<processor-name>:<iso-minute>` unless an `x-idempotency-key` header overrides.

Schedules per `apps/ops-admin/vercel.json`:
- `/api/engine/processors/sla` — every minute (SLA timers + chef-acceptance auto-cancel + driver-assignment escalation + stale-preparing alerts)
- `/api/engine/processors/expired-offers` — every minute (offer TTL expiry → next driver or escalate)
- `/api/cron/payouts-chef-preview` — weekly Monday 07:00 UTC
- `/api/cron/payouts-driver-preview` — daily 06:00 UTC
- `/api/cron/reconciliation-daily` — daily 05:30 UTC

The legacy `/api/cron/sla-tick` is deprecated (see its file header) and is **not** scheduled in `vercel.json` — do not point new schedulers at it.

---

## Privacy summary

| Surface | Coordinates / PII | Engine status | Notes |
|---------|-------------------|---------------|-------|
| Customer realtime (`order:{orderId}`) | **No** | **No** (`public_stage` only) | Sanitizer enforces |
| Customer notifications (`customer:{id}:notifications`) | No | No | Notification rows pre-filtered |
| Chef realtime (`chef:{storefrontId}:orders`) | Yes (delivery addresses) | Yes | Internal — RLS scopes to chef's storefront |
| Driver offer (`driver:{driverId}:offers`) | Addresses only (no lat/lng) | n/a | `stripSensitiveCoordinateKeys` enforces |
| Driver assignments (`driver:{driverId}:assignments`) | Yes | Yes | Driver's own active deliveries |
| Ops live (`ops:live`) | Yes | Yes | Internal — RLS scopes to platform roles |
| Ops map (`ops:map:presence`) | Yes (full GPS) | n/a | Internal only |

---

## Findings during audit

Zero contract violations discovered during this audit. Areas reviewed without surfacing a gap:

- All customer-facing endpoints (`/api/orders/[id]`, `/api/orders/[id]/cancel`, `/api/orders/[id]/payment-status`, `/api/orders/[id]/reorder`) return `public_stage` or sanitized data; no raw `engine_status` leak detected.
- `DomainEventEmitter.broadcastPublic` is the only sanctioned writer for `order:{orderId}` `order_update` events; no direct `client.channel('order:').send(...)` shortcut found outside this method.
- `DispatchEngine` is the only consumer of `broadcastDriverOffer`; offer routes do not bypass `respondToOffer` for state changes.
- Processor routes uniformly use `validateEngineProcessorHeaders`; no Bearer-token comparison hand-rolled in any route.

If any future change introduces a route that broadcasts on `order:*` directly (bypassing `broadcastPublic`) or returns `engine_status` from a customer-facing endpoint, that is a contract violation. Add an `@ridendine/eslint-rule` or grep audit if the surface grows beyond manual review.

---

## Update procedure

When a cross-app contract changes:
1. Update the relevant boundary section in this document.
2. Update the realtime channel definition in `packages/db/src/realtime/channels.ts` if a new channel is introduced.
3. Update the sanitizer whitelist in `packages/engine/src/core/public-broadcast-sanitizer.ts` if a new customer-safe field is added.
4. Update `docs/BUSINESS_ENGINE.md` "Realtime privacy contract" if the privacy posture shifts.
5. Update the lifecycle E2E test (`e2e/lifecycle/full-marketplace-lifecycle.spec.ts` once it exists per readiness-plan Task 5) so the assertion catches a regression.
