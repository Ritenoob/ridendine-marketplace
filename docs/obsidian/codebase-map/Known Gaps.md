# Known Gaps

Scanner statuses are conservative. Undetectable wiring is marked for review rather than guessed.

## CRITICAL

No issues detected by scanner.

## HIGH

No issues detected by scanner.

## MEDIUM

| App | File | Problem | Required fix | Suggested phase |
| --- | --- | --- | --- | --- |
| Customer Web | [apps/web/src/app/account/favorites/page.tsx](../../../apps/web/src/app/account/favorites/page.tsx) | Auth requirement not detectable for /account/favorites | Confirm public/protected intent and document explicitly in code or route docs | Phase 3 |
| Customer Web | [apps/web/src/app/account/page.tsx](../../../apps/web/src/app/account/page.tsx) | Auth requirement not detectable for /account | Confirm public/protected intent and document explicitly in code or route docs | Phase 3 |
| Customer Web | [apps/web/src/app/cart/page.tsx](../../../apps/web/src/app/cart/page.tsx) | Auth requirement not detectable for /cart | Confirm public/protected intent and document explicitly in code or route docs | Phase 3 |
| Customer Web | [apps/web/src/app/chef-resources/page.tsx](../../../apps/web/src/app/chef-resources/page.tsx) | Auth requirement not detectable for /chef-resources | Confirm public/protected intent and document explicitly in code or route docs | Phase 3 |
| Customer Web | [apps/web/src/app/chefs/page.tsx](../../../apps/web/src/app/chefs/page.tsx) | Auth requirement not detectable for /chefs | Confirm public/protected intent and document explicitly in code or route docs | Phase 3 |
| Customer Web | [apps/web/src/app/how-it-works/page.tsx](../../../apps/web/src/app/how-it-works/page.tsx) | Auth requirement not detectable for /how-it-works | Confirm public/protected intent and document explicitly in code or route docs | Phase 3 |
| Customer Web | [apps/web/src/app/maintenance/page.tsx](../../../apps/web/src/app/maintenance/page.tsx) | Auth requirement not detectable for /maintenance | Confirm public/protected intent and document explicitly in code or route docs | Phase 3 |
| Customer Web | [apps/web/src/app/order-confirmation/[orderId]/page.tsx](../../../apps/web/src/app/order-confirmation/[orderId]/page.tsx) | Auth requirement not detectable for /order-confirmation/:orderId | Confirm public/protected intent and document explicitly in code or route docs | Phase 3 |
| Ops Admin | [apps/ops-admin/src/app/dashboard/chefs/page.tsx](../../../apps/ops-admin/src/app/dashboard/chefs/page.tsx) | Auth requirement not detectable for /dashboard/chefs | Confirm public/protected intent and document explicitly in code or route docs | Phase 3 |
| Ops Admin | [apps/ops-admin/src/app/dashboard/customers/[id]/page.tsx](../../../apps/ops-admin/src/app/dashboard/customers/[id]/page.tsx) | Auth requirement not detectable for /dashboard/customers/:id | Confirm public/protected intent and document explicitly in code or route docs | Phase 3 |
| Ops Admin | [apps/ops-admin/src/app/dashboard/deliveries/[id]/page.tsx](../../../apps/ops-admin/src/app/dashboard/deliveries/[id]/page.tsx) | Auth requirement not detectable for /dashboard/deliveries/:id | Confirm public/protected intent and document explicitly in code or route docs | Phase 3 |
| Ops Admin | [apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx](../../../apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx) | Auth requirement not detectable for /dashboard/drivers/:id | Confirm public/protected intent and document explicitly in code or route docs | Phase 3 |
| Ops Admin | [apps/ops-admin/src/app/dashboard/drivers/page.tsx](../../../apps/ops-admin/src/app/dashboard/drivers/page.tsx) | Auth requirement not detectable for /dashboard/drivers | Confirm public/protected intent and document explicitly in code or route docs | Phase 3 |
| Ops Admin | [apps/ops-admin/src/app/dashboard/map/page.tsx](../../../apps/ops-admin/src/app/dashboard/map/page.tsx) | Auth requirement not detectable for /dashboard/map | Confirm public/protected intent and document explicitly in code or route docs | Phase 3 |
| Ops Admin | [apps/ops-admin/src/app/dashboard/reports/page.tsx](../../../apps/ops-admin/src/app/dashboard/reports/page.tsx) | Auth requirement not detectable for /dashboard/reports | Confirm public/protected intent and document explicitly in code or route docs | Phase 3 |
| Ops Admin | [apps/ops-admin/src/app/internal/command-center/page.tsx](../../../apps/ops-admin/src/app/internal/command-center/page.tsx) | Auth requirement not detectable for /internal/command-center | Confirm public/protected intent and document explicitly in code or route docs | Phase 3 |
| Chef Admin | [apps/chef-admin/src/app/dashboard/availability/page.tsx](../../../apps/chef-admin/src/app/dashboard/availability/page.tsx) | Auth requirement not detectable for /dashboard/availability | Confirm public/protected intent and document explicitly in code or route docs | Phase 3 |

## LOW

| App | File | Problem | Required fix | Suggested phase |
| --- | --- | --- | --- | --- |
| All apps | [packages/ui and app component files](../../../packages/ui and app component files) | Visual/status conventions still vary on older real pages | Gradually migrate pages to shared status/loading/error components | Phase 4 |
