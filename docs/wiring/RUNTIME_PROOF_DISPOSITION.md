# Runtime Proof Disposition

Generated: 2026-06-07T19:07:00.474Z

This Phase 20/21 proof disposition audit assigns every remaining runtime proof gap to an explicit next proof action. It does not make new production calls or mutate data; it converts the remaining proof gaps into actionable buckets for future safe smoke, negative authorization, sample-data, or contract-only work.

## Summary

| Surface | Total discovered | Proof covered | Proof gaps | Dispositioned proof gaps | Unresolved |
|---|---:|---:|---:|---:|---:|
| Pages | 90 | 17 | 73 | 73 | 0 |
| API route handlers | 120 | 46 | 74 | 74 | 0 |

## Page Proof Gap Disposition

| App | Route | File | Auth intent | Next proof action | Recommended proof action |
|---|---|---|---|---|---|
| Chef Admin | `/` | `apps/chef-admin/src/app/page.tsx` | protected-redirect | login-guard-page-smoke | login-guard-page-smoke |
| Chef Admin | `/auth/forgot-password` | `apps/chef-admin/src/app/auth/forgot-password/page.tsx` | public-auth-entry | public-page-smoke | public-page-smoke |
| Chef Admin | `/auth/login` | `apps/chef-admin/src/app/auth/login/page.tsx` | public-auth-entry | public-page-smoke | public-page-smoke |
| Chef Admin | `/auth/signup` | `apps/chef-admin/src/app/auth/signup/page.tsx` | public-auth-entry | public-page-smoke | public-page-smoke |
| Chef Admin | `/dashboard` | `apps/chef-admin/src/app/dashboard/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Chef Admin | `/dashboard/analytics` | `apps/chef-admin/src/app/dashboard/analytics/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Chef Admin | `/dashboard/menu` | `apps/chef-admin/src/app/dashboard/menu/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Chef Admin | `/dashboard/orders` | `apps/chef-admin/src/app/dashboard/orders/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Chef Admin | `/dashboard/orders/[id]` | `apps/chef-admin/src/app/dashboard/orders/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Chef Admin | `/dashboard/payouts` | `apps/chef-admin/src/app/dashboard/payouts/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Chef Admin | `/dashboard/reviews` | `apps/chef-admin/src/app/dashboard/reviews/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Chef Admin | `/dashboard/settings` | `apps/chef-admin/src/app/dashboard/settings/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Chef Admin | `/dashboard/storefront` | `apps/chef-admin/src/app/dashboard/storefront/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Chef Admin | `/dashboard/storefront/setup` | `apps/chef-admin/src/app/dashboard/storefront/setup/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Chef Admin | `/privacy` | `apps/chef-admin/src/app/privacy/page.tsx` | public | public-page-smoke | public-page-smoke |
| Chef Admin | `/terms` | `apps/chef-admin/src/app/terms/page.tsx` | public | public-page-smoke | public-page-smoke |
| Customer Web | `/` | `apps/web/src/app/page.tsx` | public | public-page-smoke | public-page-smoke |
| Customer Web | `/about` | `apps/web/src/app/about/page.tsx` | public | public-page-smoke | public-page-smoke |
| Customer Web | `/account/addresses` | `apps/web/src/app/account/addresses/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Customer Web | `/account/orders` | `apps/web/src/app/account/orders/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Customer Web | `/account/settings` | `apps/web/src/app/account/settings/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Customer Web | `/auth/forgot-password` | `apps/web/src/app/auth/forgot-password/page.tsx` | public-auth-entry | public-page-smoke | public-page-smoke |
| Customer Web | `/auth/login` | `apps/web/src/app/auth/login/page.tsx` | public-auth-entry | public-page-smoke | public-page-smoke |
| Customer Web | `/auth/signup` | `apps/web/src/app/auth/signup/page.tsx` | public-auth-entry | public-page-smoke | public-page-smoke |
| Customer Web | `/checkout` | `apps/web/src/app/checkout/page.tsx` | mixed-auth-dependent | public-shell-and-auth-action-smoke | public-shell-and-auth-action-smoke |
| Customer Web | `/chef-signup` | `apps/web/src/app/chef-signup/page.tsx` | public | public-page-smoke | public-page-smoke |
| Customer Web | `/chefs/[slug]` | `apps/web/src/app/chefs/[slug]/page.tsx` | public | public-page-smoke | public-page-smoke |
| Customer Web | `/contact` | `apps/web/src/app/contact/page.tsx` | public | public-page-smoke | public-page-smoke |
| Customer Web | `/orders/[id]/confirmation` | `apps/web/src/app/orders/[id]/confirmation/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Customer Web | `/privacy` | `apps/web/src/app/privacy/page.tsx` | public | public-page-smoke | public-page-smoke |
| Customer Web | `/terms` | `apps/web/src/app/terms/page.tsx` | public | public-page-smoke | public-page-smoke |
| Driver App | `/` | `apps/driver-app/src/app/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Driver App | `/auth/login` | `apps/driver-app/src/app/auth/login/page.tsx` | public-auth-entry | public-page-smoke | public-page-smoke |
| Driver App | `/auth/signup` | `apps/driver-app/src/app/auth/signup/page.tsx` | public-auth-entry | public-page-smoke | public-page-smoke |
| Driver App | `/delivery/[id]` | `apps/driver-app/src/app/delivery/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Driver App | `/earnings` | `apps/driver-app/src/app/earnings/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Driver App | `/history` | `apps/driver-app/src/app/history/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Driver App | `/privacy` | `apps/driver-app/src/app/privacy/page.tsx` | public | public-page-smoke | public-page-smoke |
| Driver App | `/profile` | `apps/driver-app/src/app/profile/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Driver App | `/settings` | `apps/driver-app/src/app/settings/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Driver App | `/terms` | `apps/driver-app/src/app/terms/page.tsx` | public | public-page-smoke | public-page-smoke |
| Ops Admin | `/` | `apps/ops-admin/src/app/page.tsx` | protected-redirect | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/auth/login` | `apps/ops-admin/src/app/auth/login/page.tsx` | public-auth-entry | public-page-smoke | public-page-smoke |
| Ops Admin | `/dashboard` | `apps/ops-admin/src/app/dashboard/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/activity` | `apps/ops-admin/src/app/dashboard/activity/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/analytics` | `apps/ops-admin/src/app/dashboard/analytics/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/announcements` | `apps/ops-admin/src/app/dashboard/announcements/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/automation` | `apps/ops-admin/src/app/dashboard/automation/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/chefs/[id]` | `apps/ops-admin/src/app/dashboard/chefs/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Ops Admin | `/dashboard/chefs/approvals` | `apps/ops-admin/src/app/dashboard/chefs/approvals/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/compliance` | `apps/ops-admin/src/app/dashboard/compliance/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/customers` | `apps/ops-admin/src/app/dashboard/customers/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/deliveries` | `apps/ops-admin/src/app/dashboard/deliveries/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/dispatch` | `apps/ops-admin/src/app/dashboard/dispatch/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/exceptions` | `apps/ops-admin/src/app/dashboard/exceptions/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/finance` | `apps/ops-admin/src/app/dashboard/finance/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/finance/accounts/chefs` | `apps/ops-admin/src/app/dashboard/finance/accounts/chefs/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/finance/accounts/chefs/[id]` | `apps/ops-admin/src/app/dashboard/finance/accounts/chefs/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Ops Admin | `/dashboard/finance/accounts/drivers` | `apps/ops-admin/src/app/dashboard/finance/accounts/drivers/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/finance/accounts/drivers/[id]` | `apps/ops-admin/src/app/dashboard/finance/accounts/drivers/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Ops Admin | `/dashboard/finance/instant-payouts` | `apps/ops-admin/src/app/dashboard/finance/instant-payouts/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/finance/payouts` | `apps/ops-admin/src/app/dashboard/finance/payouts/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/finance/payouts/[runId]` | `apps/ops-admin/src/app/dashboard/finance/payouts/[runId]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Ops Admin | `/dashboard/finance/reconciliation` | `apps/ops-admin/src/app/dashboard/finance/reconciliation/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/finance/refunds` | `apps/ops-admin/src/app/dashboard/finance/refunds/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/health` | `apps/ops-admin/src/app/dashboard/health/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/integrations` | `apps/ops-admin/src/app/dashboard/integrations/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/orders` | `apps/ops-admin/src/app/dashboard/orders/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/orders/[id]` | `apps/ops-admin/src/app/dashboard/orders/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Ops Admin | `/dashboard/promos` | `apps/ops-admin/src/app/dashboard/promos/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/settings` | `apps/ops-admin/src/app/dashboard/settings/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/support` | `apps/ops-admin/src/app/dashboard/support/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |
| Ops Admin | `/dashboard/team` | `apps/ops-admin/src/app/dashboard/team/page.tsx` | protected | login-guard-page-smoke | login-guard-page-smoke |

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
