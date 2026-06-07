# Runtime Contract Smoke

Generated from `scripts/smoke/runtime-contracts.cjs`.

This Phase 9 smoke gate verifies live production behavior that static wiring scans cannot prove. It is read-only except for app-owned login requests used to create smoke sessions for customer, chef, driver, and ops authenticated API checks.

Run from the repo root:

```powershell
$env:RIDENDINE_SMOKE_EMAIL = '<seeded smoke email>'
$env:RIDENDINE_SMOKE_PASSWORD = '<seeded smoke password>'
pnpm smoke:prod:contracts -- --require-auth
```

## Coverage Summary

| Contract class | Count | Runtime proof |
| --- | ---: | --- |
| Auth-intent pages | 17 | Public pages return HTML, protected pages resolve to login guard, legacy redirect shims expose their redirect target. |
| Public JSON APIs | 7 | Public/health/marketplace-read endpoints return JSON with allowed status codes. |
| Protected JSON APIs | 15 | Unauthenticated requests do not return 200. |
| Authenticated JSON APIs | 15 | App-owned customer, chef, driver, and ops login sessions can read expected JSON APIs. |

## Auth-Intent Page Contracts

| App | Route | Source file | Auth intent | Expected runtime proof | Redirect target | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Customer Web | `/account/favorites` | [apps/web/src/app/account/favorites/page.tsx](../../../../apps/web/src/app/account/favorites/page.tsx) | protected | login-guard | None |  |
| Customer Web | `/account` | [apps/web/src/app/account/page.tsx](../../../../apps/web/src/app/account/page.tsx) | protected | login-guard | None |  |
| Customer Web | `/cart` | [apps/web/src/app/cart/page.tsx](../../../../apps/web/src/app/cart/page.tsx) | public | html | None | Cart is intentionally browsable before login. |
| Customer Web | `/chef-resources` | [apps/web/src/app/chef-resources/page.tsx](../../../../apps/web/src/app/chef-resources/page.tsx) | public | html | None |  |
| Customer Web | `/chefs` | [apps/web/src/app/chefs/page.tsx](../../../../apps/web/src/app/chefs/page.tsx) | public | html | None |  |
| Customer Web | `/how-it-works` | [apps/web/src/app/how-it-works/page.tsx](../../../../apps/web/src/app/how-it-works/page.tsx) | public | html | None |  |
| Customer Web | `/maintenance` | [apps/web/src/app/maintenance/page.tsx](../../../../apps/web/src/app/maintenance/page.tsx) | public | html | None |  |
| Customer Web | `/order-confirmation/phase-9-smoke-order` | [apps/web/src/app/order-confirmation/[orderId]/page.tsx](../../../../apps/web/src/app/order-confirmation/[orderId]/page.tsx) | public | redirect | `/orders/phase-9-smoke-order/confirmation` | Legacy route is a public redirect shim; canonical /orders/:id/confirmation is protected. |
| Ops Admin | `/dashboard/chefs` | [apps/ops-admin/src/app/dashboard/chefs/page.tsx](../../../../apps/ops-admin/src/app/dashboard/chefs/page.tsx) | protected | login-guard | None |  |
| Ops Admin | `/dashboard/customers/phase-9-smoke-customer` | [apps/ops-admin/src/app/dashboard/customers/[id]/page.tsx](../../../../apps/ops-admin/src/app/dashboard/customers/[id]/page.tsx) | protected | login-guard | None | Uses a synthetic id; unauthenticated access should resolve to login. |
| Ops Admin | `/dashboard/deliveries/phase-9-smoke-delivery` | [apps/ops-admin/src/app/dashboard/deliveries/[id]/page.tsx](../../../../apps/ops-admin/src/app/dashboard/deliveries/[id]/page.tsx) | protected | login-guard | None | Uses a synthetic id; unauthenticated access should resolve to login. |
| Ops Admin | `/dashboard/drivers/phase-9-smoke-driver` | [apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx](../../../../apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx) | protected | login-guard | None | Uses a synthetic id; unauthenticated access should resolve to login. |
| Ops Admin | `/dashboard/drivers` | [apps/ops-admin/src/app/dashboard/drivers/page.tsx](../../../../apps/ops-admin/src/app/dashboard/drivers/page.tsx) | protected | login-guard | None |  |
| Ops Admin | `/dashboard/map` | [apps/ops-admin/src/app/dashboard/map/page.tsx](../../../../apps/ops-admin/src/app/dashboard/map/page.tsx) | protected | login-guard | None |  |
| Ops Admin | `/dashboard/reports` | [apps/ops-admin/src/app/dashboard/reports/page.tsx](../../../../apps/ops-admin/src/app/dashboard/reports/page.tsx) | protected | login-guard | None |  |
| Ops Admin | `/internal/command-center` | [apps/ops-admin/src/app/internal/command-center/page.tsx](../../../../apps/ops-admin/src/app/internal/command-center/page.tsx) | protected | login-guard | None |  |
| Chef Admin | `/dashboard/availability` | [apps/chef-admin/src/app/dashboard/availability/page.tsx](../../../../apps/chef-admin/src/app/dashboard/availability/page.tsx) | protected | login-guard | None |  |

## Public JSON API Contracts

| App | API | Allowed statuses | Notes |
| --- | --- | --- | --- |
| Customer Web | `/api/health` | 200 |  |
| Chef Admin | `/api/health` | 200 |  |
| Driver App | `/api/health` | 200 |  |
| Ops Admin | `/api/health` | 200 |  |
| Customer Web | `/api/storefronts?limit=1` | 200 |  |
| Customer Web | `/api/storefronts?featured=true&limit=1` | 200 |  |
| Customer Web | `/api/eta` | 200, 400 | Missing query params may return a JSON validation error; the contract verifies JSON, not data availability. |

## Protected JSON API Contracts

| App | API | Unauth allowed statuses | Authenticated proof | Notes |
| --- | --- | --- | --- | --- |
| Customer Web | `/api/profile` | 401, 403, 404, 405, 307, 308 | Yes |  |
| Customer Web | `/api/orders` | 401, 403, 404, 405, 307, 308 | Yes |  |
| Customer Web | `/api/loyalty` | 401, 403, 404, 405, 307, 308 | Yes |  |
| Driver App | `/api/driver` | 401, 403, 404, 405, 307, 308 | Yes |  |
| Driver App | `/api/deliveries` | 401, 403, 404, 405, 307, 308 | Yes |  |
| Driver App | `/api/offers` | 401, 403, 404, 405, 307, 308 | Yes |  |
| Driver App | `/api/earnings` | 401, 403, 404, 405, 307, 308 | Yes |  |
| Ops Admin | `/api/engine/health` | 401, 403, 404, 405, 307, 308 | Yes |  |
| Ops Admin | `/api/ops/live-board` | 401, 403, 404, 405, 307, 308 | Yes |  |
| Ops Admin | `/api/orders` | 401, 403, 404, 405, 307, 308 | Yes |  |
| Ops Admin | `/api/drivers` | 401, 403, 404, 405, 307, 308 | Yes |  |
| Ops Admin | `/api/chefs` | 401, 403, 404, 405, 307, 308 | Yes |  |
| Chef Admin | `/api/storefront` | 401, 403, 404, 405, 307, 308 | Yes | Chef app-owned auth smoke proves approved chef access to storefront JSON. |
| Chef Admin | `/api/profile` | 401, 403, 404, 405, 307, 308 | Yes | Chef app-owned auth smoke proves approved chef profile access. |
| Chef Admin | `/api/orders` | 401, 403, 404, 405, 307, 308 | Yes | Chef app-owned auth smoke proves approved chef order queue access. |
