# Live Role Fixture Smoke

Generated: 2026-06-07T17:15:56.325Z

This generated smoke matrix proves the seeded full-access test account can log into app-owned Customer, Chef, Driver, and Ops auth flows and exercise read-only live JSON probes. All probes after login are live-safe GET requests.

## Summary

| Metric | Count |
|---|---:|
| Live-safe GET contracts | 27 |
| Passed live probes | 27 |
| Failed checks | 0 |

## Probe Matrix

| Status | App surface | Method | Route | Capability / surface | Last status | Notes |
|---|---|---|---|---|---:|---|
| PASS | Customer marketplace | `GET` | `/api/profile` | customer_profile | 200 | Read-only live fixture probe |
| PASS | Customer marketplace | `GET` | `/api/orders` | customer_orders | 200 | Read-only live fixture probe |
| PASS | Customer marketplace | `GET` | `/api/loyalty` | customer_loyalty | 200 | Read-only live fixture probe |
| PASS | Chef admin | `GET` | `/api/profile` | chef_profile | 200 | Read-only live fixture probe |
| PASS | Chef admin | `GET` | `/api/storefront` | chef_storefront | 200 | Read-only live fixture probe |
| PASS | Chef admin | `GET` | `/api/orders` | chef_orders | 200 | Read-only live fixture probe |
| PASS | Driver app | `GET` | `/api/driver` | driver_profile | 200 | Read-only live fixture probe |
| PASS | Driver app | `GET` | `/api/deliveries` | driver_deliveries | 200 | Read-only live fixture probe |
| PASS | Driver app | `GET` | `/api/offers` | driver_offers | 200 | Read-only live fixture probe |
| PASS | Driver app | `GET` | `/api/earnings` | driver_earnings | 200 | Read-only live fixture probe |
| PASS | Ops admin | `GET` | `/api/engine/health` | engine_health | 200 | Read-only live fixture probe |
| PASS | Ops admin | `GET` | `/api/ops/live-board` | dashboard_read | 200 | Read-only live fixture probe |
| PASS | Ops admin | `GET` | `/api/orders` | ops_orders_read | 200 | Read-only live fixture probe |
| PASS | Ops admin | `GET` | `/api/customers` | ops_entity_read | 200 | Read-only live fixture probe |
| PASS | Ops admin | `GET` | `/api/drivers` | ops_entity_read | 200 | Read-only live fixture probe |
| PASS | Ops admin | `GET` | `/api/chefs` | ops_entity_read | 200 | Read-only live fixture probe |
| PASS | Ops admin | `GET` | `/api/deliveries` | deliveries_read | 200 | Read-only live fixture probe |
| PASS | Ops admin | `GET` | `/api/support` | support_queue | 200 | Read-only live fixture probe |
| PASS | Ops admin | `GET` | `/api/engine/exceptions` | exceptions_read | 200 | Read-only live fixture probe |
| PASS | Ops admin | `GET` | `/api/engine/dispatch` | dispatch_read | 200 | Read-only live fixture probe |
| PASS | Ops admin | `GET` | `/api/engine/dispatch/offer-history` | dispatch_read | 200 | Read-only live fixture probe |
| PASS | Ops admin | `GET` | `/api/engine/finance` | finance_engine | 200 | Read-only live fixture probe |
| PASS | Ops admin | `GET` | `/api/engine/reconciliation` | finance_engine | 200 | Read-only live fixture probe |
| PASS | Ops admin | `GET` | `/api/engine/refunds` | finance_refunds_read | 200 | Read-only live fixture probe |
| PASS | Ops admin | `GET` | `/api/engine/payouts` | finance_payouts | 200 | Read-only live fixture probe |
| PASS | Ops admin | `GET` | `/api/engine/payouts/instant` | finance_payouts | 200 | Read-only live fixture probe |
| PASS | Ops admin | `GET` | `/api/team` | team_list | 200 | Read-only live fixture probe |

## Failures

None found.
