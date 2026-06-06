# Missing Wiring Report

Scanner statuses are conservative. Undetectable wiring is marked for review rather than guessed. Phase 9 runtime contracts move covered auth-intent rows out of unresolved medium review.

## CRITICAL

No issues detected by scanner.

## HIGH

No issues detected by scanner.

## RUNTIME-COVERED AUTH INTENT

| App | File | Problem | Required fix | Suggested phase |
| --- | --- | --- | --- | --- |
| Customer Web | [apps/web/src/app/account/favorites/page.tsx](../../../../apps/web/src/app/account/favorites/page.tsx) | Runtime contract covers auth intent for /account/favorites | protected; proof: login-guard | Phase 9 |
| Customer Web | [apps/web/src/app/account/page.tsx](../../../../apps/web/src/app/account/page.tsx) | Runtime contract covers auth intent for /account | protected; proof: login-guard | Phase 9 |
| Customer Web | [apps/web/src/app/cart/page.tsx](../../../../apps/web/src/app/cart/page.tsx) | Runtime contract covers auth intent for /cart | public; proof: html | Phase 9 |
| Customer Web | [apps/web/src/app/chef-resources/page.tsx](../../../../apps/web/src/app/chef-resources/page.tsx) | Runtime contract covers auth intent for /chef-resources | public; proof: html | Phase 9 |
| Customer Web | [apps/web/src/app/chefs/page.tsx](../../../../apps/web/src/app/chefs/page.tsx) | Runtime contract covers auth intent for /chefs | public; proof: html | Phase 9 |
| Customer Web | [apps/web/src/app/how-it-works/page.tsx](../../../../apps/web/src/app/how-it-works/page.tsx) | Runtime contract covers auth intent for /how-it-works | public; proof: html | Phase 9 |
| Customer Web | [apps/web/src/app/maintenance/page.tsx](../../../../apps/web/src/app/maintenance/page.tsx) | Runtime contract covers auth intent for /maintenance | public; proof: html | Phase 9 |
| Customer Web | [apps/web/src/app/order-confirmation/[orderId]/page.tsx](../../../../apps/web/src/app/order-confirmation/[orderId]/page.tsx) | Runtime contract covers auth intent for /order-confirmation/:orderId | public; proof: redirect -> /orders/phase-9-smoke-order/confirmation | Phase 9 |
| Ops Admin | [apps/ops-admin/src/app/dashboard/chefs/page.tsx](../../../../apps/ops-admin/src/app/dashboard/chefs/page.tsx) | Runtime contract covers auth intent for /dashboard/chefs | protected; proof: login-guard | Phase 9 |
| Ops Admin | [apps/ops-admin/src/app/dashboard/customers/[id]/page.tsx](../../../../apps/ops-admin/src/app/dashboard/customers/[id]/page.tsx) | Runtime contract covers auth intent for /dashboard/customers/:id | protected; proof: login-guard | Phase 9 |
| Ops Admin | [apps/ops-admin/src/app/dashboard/deliveries/[id]/page.tsx](../../../../apps/ops-admin/src/app/dashboard/deliveries/[id]/page.tsx) | Runtime contract covers auth intent for /dashboard/deliveries/:id | protected; proof: login-guard | Phase 9 |
| Ops Admin | [apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx](../../../../apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx) | Runtime contract covers auth intent for /dashboard/drivers/:id | protected; proof: login-guard | Phase 9 |
| Ops Admin | [apps/ops-admin/src/app/dashboard/drivers/page.tsx](../../../../apps/ops-admin/src/app/dashboard/drivers/page.tsx) | Runtime contract covers auth intent for /dashboard/drivers | protected; proof: login-guard | Phase 9 |
| Ops Admin | [apps/ops-admin/src/app/dashboard/map/page.tsx](../../../../apps/ops-admin/src/app/dashboard/map/page.tsx) | Runtime contract covers auth intent for /dashboard/map | protected; proof: login-guard | Phase 9 |
| Ops Admin | [apps/ops-admin/src/app/dashboard/reports/page.tsx](../../../../apps/ops-admin/src/app/dashboard/reports/page.tsx) | Runtime contract covers auth intent for /dashboard/reports | protected; proof: login-guard | Phase 9 |
| Ops Admin | [apps/ops-admin/src/app/internal/command-center/page.tsx](../../../../apps/ops-admin/src/app/internal/command-center/page.tsx) | Runtime contract covers auth intent for /internal/command-center | protected; proof: login-guard | Phase 9 |
| Chef Admin | [apps/chef-admin/src/app/dashboard/availability/page.tsx](../../../../apps/chef-admin/src/app/dashboard/availability/page.tsx) | Runtime contract covers auth intent for /dashboard/availability | protected; proof: login-guard | Phase 9 |

## MEDIUM

No issues detected by scanner.

## LOW

| App | File | Problem | Required fix | Suggested phase |
| --- | --- | --- | --- | --- |
| All apps | [packages/ui and app component files](../../../../packages/ui and app component files) | Visual/status conventions still vary on older real pages | Gradually migrate pages to shared status/loading/error components | Phase 4 |
