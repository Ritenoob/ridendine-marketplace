# Runtime Proof Action Smoke

Generated: 2026-06-07T20:59:42.081Z

This smoke proof executes selected proof-disposition buckets against production runtime surfaces. Thread 3 covers public page loads and unauthenticated protected-page login guards only; authenticated APIs, negative authorization, and dynamic sample fixtures remain separate threads.

## Summary

| Metric | Count |
|---|---:|
| Selected actions | 78 |
| Executed checks | 76 |
| Passed checks | 76 |
| Failed checks | 0 |
| Skipped checks | 2 |

## Buckets

- `public-page-smoke`
- `login-guard-page-smoke`

## Executed Checks

| Status | Bucket | App | Path | Last status | Notes |
|---|---|---|---|---:|---|
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

## Skipped Checks

| Status | Bucket | App | Route | Reason |
|---|---|---|---|---|
| SKIP | public-page-smoke | customer | `/chefs/[slug]` | dynamic page requires Thread 5 sample fixture before live proof |
| SKIP | public-page-smoke | customer | `/order-confirmation/[orderId]` | dynamic page requires Thread 5 sample fixture before live proof |

## Failures

None found.
