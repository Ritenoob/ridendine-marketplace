# Runtime Proof Action Smoke

Generated: 2026-06-07T21:16:56.793Z

This smoke proof executes selected proof-disposition buckets against production runtime surfaces. Thread 3 covers public page loads and unauthenticated protected-page login guards only; authenticated APIs, negative authorization, and dynamic sample fixtures remain separate threads.

## Summary

| Metric | Count |
|---|---:|
| Selected actions | 196 |
| Executed checks | 195 |
| Passed checks | 195 |
| Failed checks | 0 |
| Skipped checks | 5 |

## Buckets

- `public-page-smoke`
- `login-guard-page-smoke`
- `public-json-smoke`
- `authenticated-json-smoke`
- `negative-authz-contract`
- `authenticated-read-and-negative-write-contract`
- `auth-entry-contract`
- `token-contract`
- `signature-contract`
- `command-center-contract`
- `fixture-contract`
- `internal-docs-contract`

## Executed Checks

| Status | Bucket | App | Path | Last status | Notes |
|---|---|---|---|---:|---|
| PASS | authenticated-json-smoke | chef | `chef login` | 200 | login succeeded |
| PASS | authenticated-json-smoke | customer | `customer login` | 200 | login succeeded |
| PASS | authenticated-json-smoke | driver | `driver login` | 200 | login succeeded |
| PASS | authenticated-json-smoke | ops | `ops login` | 200 | login succeeded |
| PASS | login-guard-page-smoke | chef | `/` | 200 | protected page resolved to login guard |
| PASS | public-page-smoke | chef | `/auth/forgot-password` | 200 | public HTML page loaded |
| PASS | public-page-smoke | chef | `/auth/login` | 200 | public HTML page loaded |
| PASS | public-page-smoke | chef | `/auth/signup` | 200 | public HTML page loaded |
| PASS | login-guard-page-smoke | chef | `/dashboard` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | chef | `/dashboard/analytics` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | chef | `/dashboard/availability` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | chef | `/dashboard/menu` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | chef | `/dashboard/orders` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | chef | `/dashboard/payouts` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | chef | `/dashboard/reviews` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | chef | `/dashboard/settings` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | chef | `/dashboard/storefront` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | chef | `/dashboard/storefront/setup` | 200 | protected page resolved to login guard |
| PASS | public-page-smoke | chef | `/privacy` | 200 | public HTML page loaded |
| PASS | public-page-smoke | chef | `/terms` | 200 | public HTML page loaded |
| PASS | public-page-smoke | customer | `/` | 200 | public HTML page loaded |
| PASS | public-page-smoke | customer | `/about` | 200 | public HTML page loaded |
| PASS | login-guard-page-smoke | customer | `/account` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | customer | `/account/addresses` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | customer | `/account/favorites` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | customer | `/account/orders` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | customer | `/account/settings` | 200 | protected page resolved to login guard |
| PASS | public-page-smoke | customer | `/auth/forgot-password` | 200 | public HTML page loaded |
| PASS | public-page-smoke | customer | `/auth/login` | 200 | public HTML page loaded |
| PASS | public-page-smoke | customer | `/auth/signup` | 200 | public HTML page loaded |
| PASS | public-page-smoke | customer | `/cart` | 200 | public HTML page loaded |
| PASS | public-page-smoke | customer | `/chef-resources` | 200 | public HTML page loaded |
| PASS | public-page-smoke | customer | `/chef-signup` | 200 | public HTML page loaded |
| PASS | public-page-smoke | customer | `/chefs` | 200 | public HTML page loaded |
| PASS | public-page-smoke | customer | `/contact` | 200 | public HTML page loaded |
| PASS | public-page-smoke | customer | `/how-it-works` | 200 | public HTML page loaded |
| PASS | public-page-smoke | customer | `/maintenance` | 200 | public HTML page loaded |
| PASS | public-page-smoke | customer | `/privacy` | 200 | public HTML page loaded |
| PASS | public-page-smoke | customer | `/terms` | 200 | public HTML page loaded |
| PASS | login-guard-page-smoke | driver | `/` | 200 | protected page resolved to login guard |
| PASS | public-page-smoke | driver | `/auth/login` | 200 | public HTML page loaded |
| PASS | public-page-smoke | driver | `/auth/signup` | 200 | public HTML page loaded |
| PASS | login-guard-page-smoke | driver | `/earnings` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | driver | `/history` | 200 | protected page resolved to login guard |
| PASS | public-page-smoke | driver | `/privacy` | 200 | public HTML page loaded |
| PASS | login-guard-page-smoke | driver | `/profile` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | driver | `/settings` | 200 | protected page resolved to login guard |
| PASS | public-page-smoke | driver | `/terms` | 200 | public HTML page loaded |
| PASS | login-guard-page-smoke | ops | `/` | 200 | protected page resolved to login guard |
| PASS | public-page-smoke | ops | `/auth/login` | 200 | public HTML page loaded |
| PASS | login-guard-page-smoke | ops | `/dashboard` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/activity` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/analytics` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/announcements` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/automation` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/chefs` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/chefs/approvals` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/compliance` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/customers` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/deliveries` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/dispatch` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/drivers` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/exceptions` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/finance` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/finance/accounts/chefs` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/finance/accounts/drivers` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/finance/instant-payouts` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/finance/payouts` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/finance/reconciliation` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/finance/refunds` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/health` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/integrations` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/map` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/orders` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/promos` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/reports` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/settings` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/support` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/dashboard/team` | 200 | protected page resolved to login guard |
| PASS | login-guard-page-smoke | ops | `/internal/command-center` | 200 | protected page resolved to login guard |
| PASS | authenticated-json-smoke | chef | `/api/analytics` | 200 | authenticated JSON API returned 200 JSON |
| PASS | auth-entry-contract | chef | `/api/auth/login` | 0 | auth entry route recorded as contract-only; no signup/login mutation was attempted |
| PASS | auth-entry-contract | chef | `/api/auth/signup` | 0 | auth entry route recorded as contract-only; no signup/login mutation was attempted |
| PASS | public-json-smoke | chef | `/api/health` | 200 | public JSON API returned expected response |
| PASS | authenticated-read-and-negative-write-contract | chef | `/api/menu` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-read-and-negative-write-contract | chef | `/api/menu/[id]` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-read-and-negative-write-contract | chef | `/api/menu/[id]/options` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | negative-authz-contract | chef | `/api/menu/[id]/options/[optionId]` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | negative-authz-contract | chef | `/api/menu/[id]/options/[optionId]/values` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | negative-authz-contract | chef | `/api/menu/[id]/options/[optionId]/values/[valueId]` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | authenticated-read-and-negative-write-contract | chef | `/api/menu/categories` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-json-smoke | chef | `/api/orders` | 200 | authenticated JSON API returned 200 JSON |
| PASS | authenticated-read-and-negative-write-contract | chef | `/api/orders/[id]` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | negative-authz-contract | chef | `/api/payouts/request` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | negative-authz-contract | chef | `/api/payouts/setup` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | authenticated-read-and-negative-write-contract | chef | `/api/profile` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-read-and-negative-write-contract | chef | `/api/storefront` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-read-and-negative-write-contract | chef | `/api/storefront/availability` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | negative-authz-contract | chef | `/api/upload` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | authenticated-read-and-negative-write-contract | customer | `/api/addresses` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | auth-entry-contract | customer | `/api/auth/login` | 0 | auth entry route recorded as contract-only; no signup/login mutation was attempted |
| PASS | auth-entry-contract | customer | `/api/auth/signup` | 0 | auth entry route recorded as contract-only; no signup/login mutation was attempted |
| PASS | authenticated-read-and-negative-write-contract | customer | `/api/cart` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | negative-authz-contract | customer | `/api/checkout` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | negative-authz-contract | customer | `/api/checkout/quote` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | public-json-smoke | customer | `/api/eta` | 400 | public JSON API returned expected response |
| PASS | authenticated-read-and-negative-write-contract | customer | `/api/favorites` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | public-json-smoke | customer | `/api/health` | 200 | public JSON API returned expected response |
| PASS | authenticated-read-and-negative-write-contract | customer | `/api/loyalty` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-read-and-negative-write-contract | customer | `/api/notifications` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | negative-authz-contract | customer | `/api/notifications/subscribe` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | authenticated-json-smoke | customer | `/api/orders` | 200 | authenticated JSON API returned 200 JSON |
| PASS | authenticated-read-and-negative-write-contract | customer | `/api/orders/[id]` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | negative-authz-contract | customer | `/api/orders/[id]/cancel` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | negative-authz-contract | customer | `/api/orders/[id]/reorder` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | authenticated-read-and-negative-write-contract | customer | `/api/payment-methods` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-read-and-negative-write-contract | customer | `/api/profile` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-json-smoke | customer | `/api/promos/validate?code=RIDENDINE-SMOKE-NOTFOUND&subtotal=0` | 200 | authenticated JSON API returned 200 JSON |
| PASS | authenticated-read-and-negative-write-contract | customer | `/api/referrals` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | negative-authz-contract | customer | `/api/referrals/apply` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | authenticated-read-and-negative-write-contract | customer | `/api/reviews` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | public-json-smoke | customer | `/api/storefronts?limit=1` | 200 | public JSON API returned expected response |
| PASS | authenticated-read-and-negative-write-contract | customer | `/api/support` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-json-smoke | customer | `/api/support/tickets` | 200 | authenticated JSON API returned 200 JSON |
| PASS | negative-authz-contract | customer | `/api/upload` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | signature-contract | customer | `/api/webhooks/stripe` | 0 | signature-guarded route recorded with invalid/missing signature denial contract |
| PASS | auth-entry-contract | driver | `/api/auth/login` | 0 | auth entry route recorded as contract-only; no signup/login mutation was attempted |
| PASS | auth-entry-contract | driver | `/api/auth/logout` | 0 | auth entry route recorded as contract-only; no signup/login mutation was attempted |
| PASS | auth-entry-contract | driver | `/api/auth/signup` | 0 | auth entry route recorded as contract-only; no signup/login mutation was attempted |
| PASS | authenticated-json-smoke | driver | `/api/deliveries` | 200 | authenticated JSON API returned 200 JSON |
| PASS | authenticated-read-and-negative-write-contract | driver | `/api/deliveries/[id]` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | negative-authz-contract | driver | `/api/deliveries/[id]/issue` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | negative-authz-contract | driver | `/api/deliveries/[id]/proof` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | authenticated-read-and-negative-write-contract | driver | `/api/driver` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-read-and-negative-write-contract | driver | `/api/driver/presence` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-json-smoke | driver | `/api/earnings` | 200 | authenticated JSON API returned 200 JSON |
| PASS | public-json-smoke | driver | `/api/health` | 200 | public JSON API returned expected response |
| PASS | negative-authz-contract | driver | `/api/location` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | authenticated-read-and-negative-write-contract | driver | `/api/offers` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | negative-authz-contract | driver | `/api/payouts/instant` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | authenticated-read-and-negative-write-contract | driver | `/api/payouts/setup` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | negative-authz-contract | driver | `/api/upload` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | authenticated-json-smoke | ops | `/api/analytics` | 200 | authenticated JSON API returned 200 JSON |
| PASS | authenticated-json-smoke | ops | `/api/analytics/trends` | 200 | authenticated JSON API returned 200 JSON |
| PASS | negative-authz-contract | ops | `/api/announcements` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | authenticated-json-smoke | ops | `/api/audit/recent` | 200 | authenticated JSON API returned 200 JSON |
| PASS | auth-entry-contract | ops | `/api/auth/login` | 0 | auth entry route recorded as contract-only; no signup/login mutation was attempted |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/chefs` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | negative-authz-contract | ops | `/api/chefs/[id]` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | token-contract | ops | `/api/cron/expired-offers` | 0 | token-guarded route recorded with invalid/missing token denial contract |
| PASS | token-contract | ops | `/api/cron/payouts-chef-preview` | 0 | token-guarded route recorded with invalid/missing token denial contract |
| PASS | token-contract | ops | `/api/cron/payouts-driver-preview` | 0 | token-guarded route recorded with invalid/missing token denial contract |
| PASS | token-contract | ops | `/api/cron/reconciliation-daily` | 0 | token-guarded route recorded with invalid/missing token denial contract |
| PASS | token-contract | ops | `/api/cron/sla-tick` | 0 | token-guarded route recorded with invalid/missing token denial contract |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/customers` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | negative-authz-contract | ops | `/api/customers/[id]/notify` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | authenticated-json-smoke | ops | `/api/deliveries` | 200 | authenticated JSON API returned 200 JSON |
| PASS | negative-authz-contract | ops | `/api/deliveries/[id]` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/drivers` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | negative-authz-contract | ops | `/api/drivers/[id]` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/engine/dashboard` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/engine/dispatch` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-json-smoke | ops | `/api/engine/dispatch/offer-history` | 200 | authenticated JSON API returned 200 JSON |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/engine/exceptions` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/engine/exceptions/[id]` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/engine/finance` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-json-smoke | ops | `/api/engine/health` | 200 | authenticated JSON API returned 200 JSON |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/engine/maintenance` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/engine/orders/[id]` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/engine/payouts` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | negative-authz-contract | ops | `/api/engine/payouts/execute` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | authenticated-json-smoke | ops | `/api/engine/payouts/instant` | 200 | authenticated JSON API returned 200 JSON |
| PASS | negative-authz-contract | ops | `/api/engine/payouts/instant/[id]` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | negative-authz-contract | ops | `/api/engine/payouts/preview` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | token-contract | ops | `/api/engine/processors/expired-offers` | 0 | token-guarded route recorded with invalid/missing token denial contract |
| PASS | token-contract | ops | `/api/engine/processors/sla` | 0 | token-guarded route recorded with invalid/missing token denial contract |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/engine/reconciliation` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/engine/refunds` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/engine/rules` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/engine/settings` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/engine/storefronts/[id]` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | fixture-contract | ops | `/api/fixtures/reset` | 0 | fixture-only route recorded as contract-only proof |
| PASS | public-json-smoke | ops | `/api/health` | 200 | public JSON API returned expected response |
| PASS | command-center-contract | ops | `/api/internal/command-center/change-requests` | 0 | command-center route recorded with disabled/unauthorized access contract |
| PASS | authenticated-json-smoke | ops | `/api/ops/live-board` | 200 | authenticated JSON API returned 200 JSON |
| PASS | authenticated-json-smoke | ops | `/api/orders` | 200 | authenticated JSON API returned 200 JSON |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/orders/[id]` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | negative-authz-contract | ops | `/api/orders/[id]/refund` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/promos` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | signature-contract | ops | `/api/stripe/webhook` | 0 | signature-guarded route recorded with invalid/missing signature denial contract |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/support` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | negative-authz-contract | ops | `/api/support/[id]` | 0 | negative authorization contract recorded; no successful mutating call was made |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/surge` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | authenticated-read-and-negative-write-contract | ops | `/api/team` | 0 | mixed read/write route recorded as contract-only; no mutating write was attempted |
| PASS | internal-docs-contract | ops | `/internal/command-center/docs/[...docPath]` | 0 | internal documentation route recorded as contract-only proof |

## Skipped Checks

| Status | Bucket | App | Route | Reason |
|---|---|---|---|---|
| SKIP | public-page-smoke | customer | `/chefs/[slug]` | dynamic page requires Thread 5 sample fixture before live proof |
| SKIP | public-page-smoke | customer | `/order-confirmation/[orderId]` | dynamic page requires Thread 5 sample fixture before live proof |
| SKIP | public-json-smoke | customer | `/api/storefronts/[id]` | dynamic API requires Thread 5 sample fixture before live proof |
| SKIP | public-json-smoke | customer | `/api/storefronts/[id]/menu` | dynamic API requires Thread 5 sample fixture before live proof |
| SKIP | authenticated-json-smoke | ops | `/api/export` | CSV export endpoint is covered by smoke:ops-export-audit, not JSON proof actions |

## Failures

None found.
