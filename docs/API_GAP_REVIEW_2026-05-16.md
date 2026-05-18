# RideN'Dine API Gap Review - 2026-05-16

This report reflects the route tree and fixes verified during the marketplace readiness pass.

## Customer / Mobile

| API | Status | Auth | Role / Capability | Main request fields | Main response fields | Tests needed |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /api/storefronts` | Exists | No | Public | `q`, `cuisine`, `city`, `limit`, `offset` | Safe storefront cards, pagination | Add integration tests for filters and private chef exclusion |
| `GET /api/storefronts/[id]` | Exists; accepts slug or id | No | Public | Path slug/id | Safe public storefront detail | Add integration test for private/closed storefront hiding |
| `GET /api/storefronts/[id]/menu` | Exists | No | Public | Path storefront id | Available menu items, sold-out flags, option groups/values | Add integration test for modifier serialization |
| `POST /api/checkout/quote` | Exists | Yes | Customer | Cart id, address id, tip, promo code | Canonical pricing breakdown, quote hash/version | Unit tests added |
| `POST /api/checkout` | Exists | Yes | Customer | Cart id, address id, tip, promo code/payment method | Pending order id, Stripe PaymentIntent client secret | Unit tests added |
| `GET /api/orders/[id]/payment-status` | Exists | Yes | Owning customer | Path order id | Payment status, order status, total, Stripe payment intent | Add integration auth test |
| `POST /api/orders/[id]/reorder` | Exists | Yes | Owning customer | Path order id | Reconstructed cart items from current menu price/availability | Add integration test for sold-out/current-price behavior |

## Chef

| API | Status | Auth | Role / Capability | Main request fields | Main response fields | Tests needed |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /api/menu` | Exists | Yes | Chef | Optional query params | Chef menu items | Existing coverage should be expanded for row ownership |
| `POST /api/menu` | Exists | Yes | Chef | Menu item fields | Created menu item | Existing coverage should be expanded for validation |
| `PATCH /api/menu/[id]` | Exists | Yes | Chef owner | Menu item fields | Updated menu item | Existing coverage should be expanded |
| `DELETE /api/menu/[id]` | Exists | Yes | Chef owner | Path item id | Delete result | Existing coverage should be expanded |
| `GET /api/menu/[id]/options` | Exists | Yes | Chef owner | Path item id | Option groups with values | Add route tests |
| `POST /api/menu/[id]/options` | Exists | Yes | Chef owner | Name, required, min/max, sort order | Created option group | Add route tests |
| `PATCH /api/menu/[id]/options/[optionId]` | Exists | Yes | Chef owner | Option group patch | Updated option group | Add route tests |
| `DELETE /api/menu/[id]/options/[optionId]` | Exists | Yes | Chef owner | Path ids | Delete result | Add route tests |
| `POST/PATCH/DELETE option values` | Exists | Yes | Chef owner | Name, price delta, availability, sort order | Created/updated/deleted value | Add route tests |
| `GET /api/payouts/history` | Exists | Yes | Chef owner | `limit`, `offset` | Payout history rows, pagination, totals | Add route tests for ownership and totals |
| `GET /api/storefront/onboarding-status` | Exists | Yes | Chef owner | None | Readiness checklist, missing steps, chef status | Add route tests for incomplete/publish-ready chefs |

## Driver

| API | Status | Auth | Role / Capability | Main request fields | Main response fields | Tests needed |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /api/offers` | Exists | Yes | Driver | Availability/filter params | Open delivery offers | Add expiry/taken regression tests |
| `POST /api/offers` | Exists | Yes | Driver | Offer id/action | Accepted/rejected offer result | Add redirect/error regression tests |
| `GET /api/deliveries/[id]` | Exists | Yes | Owning driver | Path delivery id | Delivery detail | Add ownership test |
| `POST /api/deliveries/[id]/proof` | Exists | Yes | Owning driver | Pickup/dropoff proof URL, lat/lng, notes, signature | Updated delivery/order transition | Add route tests |
| `POST /api/deliveries/[id]/issue` | Exists | Yes | Owning driver | Issue type, notes, optional location | Ops-visible order exception | Add route tests |
| Availability APIs | Exists (`/api/driver/presence`, `/api/location`) | Yes | Driver | Status/location | Current driver status | Add integration tests |
| Earnings/payout APIs | Exists (`/api/earnings`, payout setup/instant) | Yes | Driver | Date range/payout request | Earnings/payout summary | Add reconciliation consistency tests |
| Current delivery | Exists via `/api/deliveries` and `[id]` | Yes | Driver | Query/path | Current delivery list/detail | Add active delivery selection test |

## Ops

| API | Status | Auth | Role / Capability | Main request fields | Main response fields | Tests needed |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /api/engine/health` | Exists, enhanced | Yes | Ops | None | Readiness env checks and processor route list | Unit tests added |
| Processor routes | Exists | Token | `CRON_SECRET`/`ENGINE_PROCESSOR_TOKEN` | Processor-specific payload | Processor run result | Existing tests plus replay tests should be broadened |
| Dispatch routes | Exists | Yes | Ops dispatch capability | Dispatch/offer payload | Dispatch result/history | Add intervention regression tests |
| Order intervention routes | Exists | Yes | Ops order capability | Status/action payload | Updated order | Add capability matrix tests |
| Refund routes | Exists | Yes | Ops finance capability | Order/refund payload | Refund result | Add Stripe failure-mode tests |
| Payout/reconciliation routes | Exists | Yes | Ops finance capability | Date range/run ids | Payout/reconciliation summaries | Add drilldown tests |
| Support ticket routes | Exists | Yes | Ops support capability | Ticket updates | Ticket state | Add escalation visibility tests |
| User/role/capability routes | Exists (`/api/team`) | Yes | Ops team capability | User/role updates | Team roster | Add non-ops denial tests |
| Audit log routes | Exists (`/api/audit/recent`) | Yes | Ops audit capability | Filters | Audit events | Add audit guard coverage |
| Staging fixture/reset | Exists | Yes | Ops `team_manage`; non-production and flag gated | Reset scope | Reset status | Add route tests; unavailable in production by code |

## Remaining Gaps

- New chef option and driver proof/issue routes need focused route tests beyond typecheck and guard audit coverage.
- Lifecycle e2e now has a seed/env preflight, but this workspace has no real `.env.local` or `.env.test`, so full browser lifecycle execution remains blocked until reviewer credentials are supplied.
- `GET /api/storefronts/[id]` intentionally accepts both storefront id and slug because Next.js cannot have sibling dynamic route names under the same segment next to `[id]/menu`.
