# Runtime Proof Disposition

Generated: 2026-06-07T21:00:00.716Z

This Phase 20/21 proof disposition audit assigns every remaining runtime proof gap to an explicit next proof action. It does not make new production calls or mutate data; it converts the remaining proof gaps into actionable buckets for future safe smoke, negative authorization, sample-data, or contract-only work.

## Summary

| Surface | Total discovered | Proof covered | Proof gaps | Dispositioned proof gaps | Unresolved |
|---|---:|---:|---:|---:|---:|
| Pages | 90 | 80 | 10 | 10 | 0 |
| API route handlers | 120 | 46 | 74 | 74 | 0 |

## Page Proof Gap Disposition

| App | Route | File | Auth intent | Next proof action | Recommended proof action |
|---|---|---|---|---|---|
| Chef Admin | `/dashboard/orders/[id]` | `apps/chef-admin/src/app/dashboard/orders/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Customer Web | `/checkout` | `apps/web/src/app/checkout/page.tsx` | mixed-auth-dependent | public-shell-and-auth-action-smoke | public-shell-and-auth-action-smoke |
| Customer Web | `/chefs/[slug]` | `apps/web/src/app/chefs/[slug]/page.tsx` | public | public-page-smoke | public-page-smoke |
| Customer Web | `/orders/[id]/confirmation` | `apps/web/src/app/orders/[id]/confirmation/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Driver App | `/delivery/[id]` | `apps/driver-app/src/app/delivery/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Ops Admin | `/dashboard/chefs/[id]` | `apps/ops-admin/src/app/dashboard/chefs/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Ops Admin | `/dashboard/finance/accounts/chefs/[id]` | `apps/ops-admin/src/app/dashboard/finance/accounts/chefs/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Ops Admin | `/dashboard/finance/accounts/drivers/[id]` | `apps/ops-admin/src/app/dashboard/finance/accounts/drivers/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Ops Admin | `/dashboard/finance/payouts/[runId]` | `apps/ops-admin/src/app/dashboard/finance/payouts/[runId]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Ops Admin | `/dashboard/orders/[id]` | `apps/ops-admin/src/app/dashboard/orders/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |

## API Proof Gap Disposition

| App | Endpoint | File | Guard intent | Next proof action | Recommended proof action |
|---|---|---|---|---|---|
| Chef Admin | `/api/analytics` | `apps/chef-admin/src/app/api/analytics/route.ts` | protected-session | authenticated-json-smoke | authenticated-json-smoke |
| Chef Admin | `/api/auth/login` | `apps/chef-admin/src/app/api/auth/login/route.ts` | public-auth-entry | auth-entry-contract | auth-entry-contract |
| Chef Admin | `/api/auth/signup` | `apps/chef-admin/src/app/api/auth/signup/route.ts` | public-auth-entry | auth-entry-contract | auth-entry-contract |
| Chef Admin | `/api/menu` | `apps/chef-admin/src/app/api/menu/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Chef Admin | `/api/menu/[id]` | `apps/chef-admin/src/app/api/menu/[id]/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Chef Admin | `/api/menu/[id]/options` | `apps/chef-admin/src/app/api/menu/[id]/options/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Chef Admin | `/api/menu/[id]/options/[optionId]` | `apps/chef-admin/src/app/api/menu/[id]/options/[optionId]/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Chef Admin | `/api/menu/[id]/options/[optionId]/values` | `apps/chef-admin/src/app/api/menu/[id]/options/[optionId]/values/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Chef Admin | `/api/menu/[id]/options/[optionId]/values/[valueId]` | `apps/chef-admin/src/app/api/menu/[id]/options/[optionId]/values/[valueId]/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Chef Admin | `/api/menu/categories` | `apps/chef-admin/src/app/api/menu/categories/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Chef Admin | `/api/orders/[id]` | `apps/chef-admin/src/app/api/orders/[id]/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Chef Admin | `/api/payouts/request` | `apps/chef-admin/src/app/api/payouts/request/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Chef Admin | `/api/payouts/setup` | `apps/chef-admin/src/app/api/payouts/setup/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Chef Admin | `/api/storefront/availability` | `apps/chef-admin/src/app/api/storefront/availability/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Chef Admin | `/api/upload` | `apps/chef-admin/src/app/api/upload/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Customer Web | `/api/addresses` | `apps/web/src/app/api/addresses/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Customer Web | `/api/auth/login` | `apps/web/src/app/api/auth/login/route.ts` | public-auth-entry | auth-entry-contract | auth-entry-contract |
| Customer Web | `/api/auth/signup` | `apps/web/src/app/api/auth/signup/route.ts` | public-auth-entry | auth-entry-contract | auth-entry-contract |
| Customer Web | `/api/cart` | `apps/web/src/app/api/cart/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Customer Web | `/api/checkout` | `apps/web/src/app/api/checkout/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Customer Web | `/api/checkout/quote` | `apps/web/src/app/api/checkout/quote/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Customer Web | `/api/favorites` | `apps/web/src/app/api/favorites/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Customer Web | `/api/notifications` | `apps/web/src/app/api/notifications/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Customer Web | `/api/notifications/subscribe` | `apps/web/src/app/api/notifications/subscribe/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Customer Web | `/api/orders/[id]` | `apps/web/src/app/api/orders/[id]/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Customer Web | `/api/orders/[id]/cancel` | `apps/web/src/app/api/orders/[id]/cancel/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Customer Web | `/api/orders/[id]/payment-status` | `apps/web/src/app/api/orders/[id]/payment-status/route.ts` | protected-session | sampled-authenticated-json-smoke | sampled-authenticated-json-smoke |
| Customer Web | `/api/orders/[id]/reorder` | `apps/web/src/app/api/orders/[id]/reorder/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Customer Web | `/api/payment-methods` | `apps/web/src/app/api/payment-methods/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Customer Web | `/api/promos/validate` | `apps/web/src/app/api/promos/validate/route.ts` | protected-session | authenticated-json-smoke | authenticated-json-smoke |
| Customer Web | `/api/referrals` | `apps/web/src/app/api/referrals/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Customer Web | `/api/referrals/apply` | `apps/web/src/app/api/referrals/apply/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Customer Web | `/api/reviews` | `apps/web/src/app/api/reviews/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Customer Web | `/api/storefronts/[id]` | `apps/web/src/app/api/storefronts/[id]/route.ts` | public-read | public-json-smoke | public-json-smoke |
| Customer Web | `/api/storefronts/[id]/menu` | `apps/web/src/app/api/storefronts/[id]/menu/route.ts` | public-read | public-json-smoke | public-json-smoke |
| Customer Web | `/api/support` | `apps/web/src/app/api/support/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Customer Web | `/api/support/tickets` | `apps/web/src/app/api/support/tickets/route.ts` | protected-session | authenticated-json-smoke | authenticated-json-smoke |
| Customer Web | `/api/support/tickets/[id]` | `apps/web/src/app/api/support/tickets/[id]/route.ts` | protected-session | sampled-authenticated-json-smoke | sampled-authenticated-json-smoke |
| Customer Web | `/api/upload` | `apps/web/src/app/api/upload/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Customer Web | `/api/webhooks/stripe` | `apps/web/src/app/api/webhooks/stripe/route.ts` | signature-guarded | signature-contract | signature-contract |
| Driver App | `/api/auth/login` | `apps/driver-app/src/app/api/auth/login/route.ts` | public-auth-entry | auth-entry-contract | auth-entry-contract |
| Driver App | `/api/auth/logout` | `apps/driver-app/src/app/api/auth/logout/route.ts` | public-auth-entry | auth-entry-contract | auth-entry-contract |
| Driver App | `/api/auth/signup` | `apps/driver-app/src/app/api/auth/signup/route.ts` | public-auth-entry | auth-entry-contract | auth-entry-contract |
| Driver App | `/api/deliveries/[id]` | `apps/driver-app/src/app/api/deliveries/[id]/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Driver App | `/api/deliveries/[id]/issue` | `apps/driver-app/src/app/api/deliveries/[id]/issue/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Driver App | `/api/deliveries/[id]/proof` | `apps/driver-app/src/app/api/deliveries/[id]/proof/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Driver App | `/api/driver/presence` | `apps/driver-app/src/app/api/driver/presence/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Driver App | `/api/location` | `apps/driver-app/src/app/api/location/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Driver App | `/api/payouts/instant` | `apps/driver-app/src/app/api/payouts/instant/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Driver App | `/api/payouts/setup` | `apps/driver-app/src/app/api/payouts/setup/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Driver App | `/api/upload` | `apps/driver-app/src/app/api/upload/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Ops Admin | `/api/analytics` | `apps/ops-admin/src/app/api/analytics/route.ts` | protected-session | authenticated-json-smoke | authenticated-json-smoke |
| Ops Admin | `/api/analytics/trends` | `apps/ops-admin/src/app/api/analytics/trends/route.ts` | protected-session | authenticated-json-smoke | authenticated-json-smoke |
| Ops Admin | `/api/announcements` | `apps/ops-admin/src/app/api/announcements/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Ops Admin | `/api/audit/recent` | `apps/ops-admin/src/app/api/audit/recent/route.ts` | protected-session | authenticated-json-smoke | authenticated-json-smoke |
| Ops Admin | `/api/auth/login` | `apps/ops-admin/src/app/api/auth/login/route.ts` | public-auth-entry | auth-entry-contract | auth-entry-contract |
| Ops Admin | `/api/chefs/[id]` | `apps/ops-admin/src/app/api/chefs/[id]/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Ops Admin | `/api/customers/[id]/notify` | `apps/ops-admin/src/app/api/customers/[id]/notify/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Ops Admin | `/api/deliveries/[id]` | `apps/ops-admin/src/app/api/deliveries/[id]/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Ops Admin | `/api/drivers/[id]` | `apps/ops-admin/src/app/api/drivers/[id]/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Ops Admin | `/api/engine/dashboard` | `apps/ops-admin/src/app/api/engine/dashboard/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Ops Admin | `/api/engine/exceptions/[id]` | `apps/ops-admin/src/app/api/engine/exceptions/[id]/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Ops Admin | `/api/engine/maintenance` | `apps/ops-admin/src/app/api/engine/maintenance/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Ops Admin | `/api/engine/orders/[id]` | `apps/ops-admin/src/app/api/engine/orders/[id]/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Ops Admin | `/api/engine/rules` | `apps/ops-admin/src/app/api/engine/rules/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Ops Admin | `/api/engine/settings` | `apps/ops-admin/src/app/api/engine/settings/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Ops Admin | `/api/engine/storefronts/[id]` | `apps/ops-admin/src/app/api/engine/storefronts/[id]/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Ops Admin | `/api/export` | `apps/ops-admin/src/app/api/export/route.ts` | protected-session | authenticated-json-smoke | authenticated-json-smoke |
| Ops Admin | `/api/fixtures/reset` | `apps/ops-admin/src/app/api/fixtures/reset/route.ts` | fixture-only | fixture-contract | fixture-contract |
| Ops Admin | `/api/orders/[id]` | `apps/ops-admin/src/app/api/orders/[id]/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Ops Admin | `/api/promos` | `apps/ops-admin/src/app/api/promos/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Ops Admin | `/api/support/[id]` | `apps/ops-admin/src/app/api/support/[id]/route.ts` | protected-session | negative-authz-contract | negative-authz-contract |
| Ops Admin | `/api/surge` | `apps/ops-admin/src/app/api/surge/route.ts` | protected-session | authenticated-read-and-negative-write-contract | authenticated-read-and-negative-write-contract |
| Ops Admin | `/internal/command-center/docs/[...docPath]` | `apps/ops-admin/src/app/internal/command-center/docs/[...docPath]/route.ts` | internal-docs | internal-docs-contract | internal-docs-contract |

## Failures

None found.
