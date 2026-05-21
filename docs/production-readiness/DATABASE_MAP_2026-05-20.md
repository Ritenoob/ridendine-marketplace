# Database Map - 2026-05-20

Source: `supabase/migrations/*.sql`, generated database types, and code references in apps/packages. This review did not connect to a live Supabase project and did not inspect secret values.

Post-fix update: duplicate migration prefix was normalized, `00040_payment_status_partial_refunds_and_order_fk_validation.sql` was added, partial refunds now use `partially_refunded`, and order customer/storefront FK validation is enforced after orphan checks. Clean replay and upgraded staging replay remain required.

Database status: PARTIAL

## Migration Inventory

Migrations present:
- `00001_initial_schema.sql` through `00041_scheduled_orders.sql`

Production issues:
- PASS/PARTIAL: Duplicate migration prefix was normalized; clean migration replay still required.
- PASS/PARTIAL: Order customer/storefront FK validation migration exists; staging must still prove no orphaned rows.
- PASS/PARTIAL: `orders.payment_status` now allows canonical `partially_refunded`; Stripe sandbox refund replay still required.
- PASS/PARTIAL: Broad anonymous read policies created in `00005` are later dropped for sensitive tables in `00017`; public read is then narrowed for approved storefronts, menu data, and reviews.

## Core Table Map

| Table | Purpose | Key columns | Relationships | Security/RLS | Indexes | Production issues |
| --- | --- | --- | --- | --- | --- | --- |
| `chef_profiles` | Chef identity/profile | `id`, `user_id`, `status`, display fields | Auth user, storefronts/kitchens | RLS enabled; chef own, ops read/write, approved public profile read | `user_id`, `status` | User FK validated in `00038`; profile public fields need privacy review. |
| `chef_kitchens` | Kitchen location and fulfillment origin | `id`, `chef_id`, address/lat/lng | Chef profile, storefronts | RLS enabled; chef own, ops access | FK/index via chef | PARTIAL - used by quote, ETA, dispatch; real coordinates required. |
| `chef_storefronts` | Primary marketplace listing | `id`, `chef_id`, `kitchen_id`, active/state fields | Chef profile, kitchen, menu, orders | RLS enabled; public approved active read; chef/ops management | `chef_id`, `is_active`, `cuisine_types`, `storefront_state` | PASS/PARTIAL - main listing entity exists. |
| `chef_documents` | Chef verification docs | `id`, `chef_id`, doc fields | Chef profile | RLS enabled | Chef relation | PARTIAL - document storage/review flow needs QA. |
| `chef_payout_accounts` | Chef payout account metadata | `id`, `chef_id`, provider fields | Chef profile | RLS enabled; chef own, ops read | `chef_id` | NEEDS MANUAL TEST - payout provider validation. |
| `chef_availability` | Chef/storefront hours | `id`, `chef_id`, day/time fields | Chef profile/storefront | RLS enabled | Chef relation | PARTIAL - runtime availability behavior needs QA. |
| `chef_delivery_zones` | Delivery/service radius zones | `id`, `chef_id`, radius/fee fields | Chef profile/storefront | RLS enabled | Chef relation | PARTIAL - geospatial/fee QA required. |
| `menu_categories` | Menu grouping | `id`, `storefront_id`, sort fields | Storefront | RLS enabled; public read active, chef manage | `storefront_id` | PARTIAL. |
| `menu_items` | Menu item catalog | `id`, `storefront_id`, `category_id`, price/status | Storefront, category, cart/order items | RLS enabled; public active read, chef manage | `storefront_id`, `category_id` | PASS/PARTIAL - checkout validates current price/availability. |
| `menu_item_options` | Configurable menu options | `id`, `menu_item_id`, required/min/max | Menu item | RLS enabled | Item relation | PARTIAL. |
| `menu_item_option_values` | Option value choices | `id`, `option_id`, price_delta | Option | RLS enabled | Option relation | PARTIAL. |
| `menu_item_availability` | Per-item availability windows/status | `id`, `menu_item_id`, status/time | Menu item | RLS enabled; public read restored in hardening | Availability indexes/policies | PARTIAL. |
| `customers` | Customer profile | `id`, `user_id`, name/contact fields | Auth user, addresses, orders | RLS enabled; customer own, ops read | `user_id` | User FK validated in `00038`; privacy QA required. |
| `customer_addresses` | Customer delivery addresses | `id`, `customer_id`, address/lat/lng | Customer, orders | RLS enabled; customer own | `customer_id` | PARTIAL - delivery-zone QA required. |
| `carts` | Active customer cart | `id`, `customer_id`, storefront/cart state | Customer, cart items | RLS enabled | Customer relation | PARTIAL. |
| `cart_items` | Items in cart | `id`, `cart_id`, `menu_item_id`, qty/options | Cart/menu item | RLS enabled | Cart relation | PARTIAL. |
| `favorites` | Customer saved storefronts | `id`, `customer_id`, `storefront_id` | Customer/storefront | RLS enabled | `customer_id` | PARTIAL. |
| `orders` | Central order record | `id`, `order_number`, `customer_id`, `storefront_id`, totals, `status`, `engine_status`, `payment_status`, Stripe IDs | Customer, storefront, order items, delivery, ledger | RLS enabled; customer/chef/ops policies | `customer_id`, `storefront_id`, `status`, `created_at`, `engine_status`, scheduled release | PARTIAL - partial refund/FK migration added; multiple status fields still need staging drift tests. |
| `order_items` | Purchased order items | `id`, `order_id`, `menu_item_id`, price/qty | Order/menu item/modifiers | RLS enabled | `order_id`, `menu_item_id` | PARTIAL. |
| `order_item_modifiers` | Purchased option values | `id`, `order_item_id`, option/value fields | Order item | RLS enabled | Item relation | PARTIAL. |
| `order_status_history` | Order lifecycle audit/history | `id`, `order_id`, status/action/actor fields | Order | RLS enabled | `order_id` | PASS/PARTIAL - populated by engine; completeness needs workflow QA. |
| `reviews` | Customer reviews | `id`, `order_id`, `customer_id`, `storefront_id`, rating | Order/customer/storefront | RLS enabled; public read, customer create | `storefront_id` | PARTIAL - purchase eligibility QA required. |
| `promo_codes` | Promo/discount codes | `id`, code, discount, active/dates/usage | Orders/checkout | RLS enabled; active read, ops manage | `code`, `is_active`, active dates | PARTIAL. |
| `support_tickets` | Customer support cases | `id`, `customer_id`, status/priority | Customer/order optional | RLS hardened; customer own, ops support | Policies in hardening | PARTIAL. |
| `drivers` | Driver profile/status | `id`, `user_id`, status/contact | Auth user, deliveries, presence | RLS enabled; driver own, ops manage | `user_id`, `status` | User FK validated in `00038`; approval QA required. |
| `driver_documents` | Driver verification docs | `id`, `driver_id`, doc fields | Driver | RLS enabled; ops read policy in `00039_driver_documents_ops_read` | Driver relation | PARTIAL - storage/privacy QA required. |
| `driver_vehicles` | Driver vehicle metadata | `id`, `driver_id`, vehicle fields | Driver | RLS enabled | `driver_id` | PARTIAL. |
| `driver_shifts` | Driver shift records | `id`, `driver_id`, start/end/status | Driver | RLS enabled | `driver_id` | PARTIAL. |
| `driver_presence` | Driver availability/location status | `driver_id`, status, current/last location, timestamps | Driver | RLS enabled; driver manage, ops read | `status` | PARTIAL - freshness and load QA required. |
| `driver_locations` | Location history | `id`, `driver_id`, lat/lng, recorded_at | Driver | RLS enabled; driver insert own, ops read | `driver_id`, `recorded_at`, composite driver/recorded | PARTIAL - write volume and retention policy needed. |
| `driver_earnings` | Driver earnings entries | `id`, `driver_id`, delivery/order amounts | Driver/delivery/order | RLS enabled; driver own, ops read | Driver relation | PARTIAL. |
| `driver_payouts` | Driver payout records | `id`, `driver_id`, amount/status/provider IDs | Driver/payout runs | RLS enabled | Bank/status/provider indexes | NEEDS MANUAL TEST. |
| `deliveries` | Delivery assignment/execution | `id`, `order_id`, `driver_id`, status, pickup/dropoff details | Order, driver, assignments/events/tracking | RLS enabled; driver assigned, ops manage | `order_id`, `driver_id`, `status` | PARTIAL - status sync and failed delivery QA needed. |
| `delivery_assignments` | Legacy assignment records | `id`, `delivery_id`, `driver_id`, response | Delivery/driver | RLS enabled | `delivery_id`, `driver_id` | PARTIAL - newer `assignment_attempts` also exists. |
| `delivery_events` | Delivery event log | `id`, `delivery_id`, event fields | Delivery | RLS enabled | Delivery relation | PARTIAL. |
| `delivery_tracking_events` | Location/tracking event log | `id`, `delivery_id`, coordinates | Delivery | RLS enabled | Delivery relation | PARTIAL. |
| `platform_users` | Ops/admin users and roles | `id`, `user_id`, role/status | Auth user | RLS enabled; platform users self/ops | Role constraints | PASS/PARTIAL - capability matrix in app code. |
| `admin_notes` | Admin notes on entities | `id`, entity refs, author | Platform users/entities | RLS enabled | Entity relation | PARTIAL. |
| `notifications` | In-app/user notifications | `id`, `user_id`, type/read fields | Auth user/orders | RLS enabled; user own, system insert | `user_id`, `is_read`, combined | PARTIAL - delivery provider QA needed. |
| `audit_logs` | General audit log | `id`, entity/action/actor fields | Domain entities/platform users | RLS enabled; ops all, insert allowed | Entity/created indexes | PASS/PARTIAL - audit completeness needs workflow QA. |
| `payout_runs` | Batch payout run records | `id`, run type/status | Chef/driver payouts | RLS enabled | One processing per type unique index | PARTIAL/NEEDS MANUAL TEST. |

## Engine and Operations Tables

| Table | Purpose | Security/RLS | Indexes | Production issues |
| --- | --- | --- | --- | --- |
| `domain_events` | Event stream for order/dispatch/payment/domain actions | RLS enabled; system insert, own/ops select | Entity/type/unpublished/created | PARTIAL - event publication/consumer behavior needs QA. |
| `order_exceptions` | Operational exceptions | RLS enabled; ops all, own view | Status/severity/order/open | PARTIAL. |
| `sla_timers` | SLA timers and breaches | RLS enabled; ops all | Active/entity/type | PARTIAL - processor schedule needs QA. |
| `kitchen_queue_entries` | Chef kitchen queue | RLS enabled; chef own, ops all | Storefront/position, order | PARTIAL. |
| `ledger_entries` | Financial ledger | RLS enabled; finance view, system insert | Order/type/entity/Stripe/idempotency | PASS/PARTIAL - strong structure; provider reconciliation needs QA. |
| `assignment_attempts` | Dispatch offers and attempts | RLS enabled; ops all, driver own | Delivery/driver/pending | PARTIAL. |
| `ops_override_logs` | Ops override audit | RLS enabled; admin only | Entity/actor/created | PASS/PARTIAL. |
| `refund_cases` | Refund case tracking | RLS enabled; ops all | Order/status/pending | PARTIAL - partial refund DB mismatch fixed; Stripe sandbox refund replay still required. |
| `payout_adjustments` | Payout corrections | RLS enabled; finance all | Payee/order/status | PARTIAL/NEEDS MANUAL TEST. |
| `storefront_state_changes` | Storefront open/paused/overload history | RLS enabled; view/insert policies | Storefront/created | PARTIAL. |
| `system_alerts` | Operational alerts | RLS enabled; ops all | Active/type/created | PARTIAL - alert routing not proven. |
| `analytics_events` | Product/ops analytics | RLS enabled; insert policies, ops read | Name/created/user/name-date | PARTIAL - privacy/data retention review needed. |
| `stripe_events_processed` | Stripe webhook idempotency | RLS enabled | Event type/processed/related order/amount | PASS/PARTIAL - schema fix exists; sandbox retries needed. |
| `checkout_idempotency_keys` | Checkout idempotency/request hash | RLS enabled | Created/status | PASS/PARTIAL - checkout uses it; stale cleanup needed. |
| `platform_accounts` | Platform financial accounts | RLS enabled; finance/ops select | Noted in finance migration | PARTIAL. |
| `stripe_reconciliation` | Stripe reconciliation records | RLS enabled; finance/ops select/update/insert | Status/variance | NEEDS MANUAL TEST. |
| `service_areas` | Service area polygons/rules | RLS enabled; authenticated read, ops write | Polygon/active | PARTIAL - geospatial QA needed. |
| `instant_payout_requests` | Instant payout requests | RLS enabled; driver insert/select, ops/finance all | Driver/status | NEEDS MANUAL TEST. |
| `ops_processor_runs` | Processor idempotency/run tracking | App-layer via admin client | Processor/idempotency fields | PASS/PARTIAL - canonical processors use it. |
| `driver_payout_accounts` | Driver payout account metadata | RLS enabled; driver view, service role manage | Driver | NEEDS MANUAL TEST. |
| `loyalty_accounts` | Customer loyalty balances | RLS enabled; customer own, service role | Customer | PARTIAL. |
| `loyalty_transactions` | Loyalty earn/redeem history | RLS enabled; customer own, service role | Account/order | PARTIAL. |
| `referral_codes` | Referral code ownership | RLS enabled; own select/insert | User/code/active | PARTIAL. |
| `referral_signups` | Referral signups and status | RLS enabled; referrer/referred select | Code/referred/status | PARTIAL. |
| `push_subscriptions` | Browser push subscriptions | RLS enabled; owner CRUD | User | PARTIAL - push delivery QA needed. |

## Database Supports Required Domains

| Domain | Status | Notes |
| --- | --- | --- |
| Customers | PASS/PARTIAL | Tables and RLS exist; runtime auth/RLS QA needed. |
| Chefs/restaurants | PASS/PARTIAL | Chef-first storefront model exists. |
| Drivers | PASS/PARTIAL | Profiles, presence, locations, vehicles, docs, payouts exist. |
| Menus/menu items | PASS/PARTIAL | Categories, options, values, availability exist. |
| Carts | PASS/PARTIAL | Cart and cart item tables exist. |
| Orders/order items | PARTIAL | Core tables exist; status/payment/FK issues remain. |
| Payments | PARTIAL | Stripe IDs/statuses/events/ledger exist; capture/refund issues remain. |
| Refunds | FAIL/PARTIAL | Refund tables exist; partial refund DB mismatch. |
| Payouts | PARTIAL | Payout tables/ledger exist; provider QA required. |
| Delivery assignments | PARTIAL | Deliveries, assignment attempts, events, tracking exist. |
| Driver status | PARTIAL | Presence/location tables exist; mobile/runtime QA required. |
| Audit logs | PASS/PARTIAL | Audit/history/domain-event tables exist; completeness QA required. |
| Admin actions | PASS/PARTIAL | Platform users, ops overrides, audit logs exist. |
| Notifications | PARTIAL | Notifications/push subscriptions exist; provider QA required. |

## Recommended Database Validation

1. Replay all migrations into a clean disposable database.
2. Replay migrations against a copy of the current staging schema.
3. Validate `orders_customer_id_fkey` and `orders_storefront_id_fkey` after orphan checks.
4. Add or correct payment status support for partial refunds.
5. Normalize duplicate migration prefix `00039`.
6. Run RLS tests using anon, authenticated customer, chef, driver, ops, and service-role clients.
7. Add reconciliation queries that compare orders, ledger entries, Stripe events, refunds, transfers, payout runs, and processor runs.
