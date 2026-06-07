# Runtime Coverage Audit

Generated: 2026-06-07T20:59:52.837Z

This Phase 17 coverage inventory maps every discovered app page and API route file to the runtime, live-role, non-admin role, high-risk authorization, and Phase 18/19 classification contracts that currently exercise, document, or classify it. Structural uncovered rows mean a surface has no classification or contract. Proof gaps mean a surface is classified but still lacks runtime/live/static proof coverage.

## Summary

| Surface | Total discovered | Structurally covered | Structural gaps | Proof covered | Proof gaps |
|---|---:|---:|---:|---:|---:|
| Pages | 90 | 90 | 0 | 80 | 10 |
| API route files | 120 | 120 | 0 | 46 | 74 |

## Contract Source Counts

| Source | Contract rows |
|---|---:|
| high-risk-negative-authz | 33 |
| high-risk-ops-authz | 19 |
| live-role-fixture | 27 |
| non-admin-role-fixture | 15 |
| runtime-api-classification | 120 |
| runtime-authenticated-json | 15 |
| runtime-page-auth-intent | 17 |
| runtime-page-classification | 90 |
| runtime-proof-action-page | 76 |
| runtime-public-json | 7 |

## Proof Disposition Summary

| Surface | Proof gaps | Dispositioned proof gaps | Unresolved |
|---|---:|---:|---:|
| Pages | 10 | 10 | 0 |
| API route files | 74 | 74 | 0 |

## Covered Pages

| App | Route | File | Contract sources |
|---|---|---|---|
| Chef Admin | `/` | `apps/chef-admin/src/app/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Chef Admin | `/auth/forgot-password` | `apps/chef-admin/src/app/auth/forgot-password/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Chef Admin | `/auth/login` | `apps/chef-admin/src/app/auth/login/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Chef Admin | `/auth/signup` | `apps/chef-admin/src/app/auth/signup/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Chef Admin | `/dashboard` | `apps/chef-admin/src/app/dashboard/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Chef Admin | `/dashboard/analytics` | `apps/chef-admin/src/app/dashboard/analytics/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Chef Admin | `/dashboard/availability` | `apps/chef-admin/src/app/dashboard/availability/page.tsx` | runtime-page-auth-intent, runtime-page-classification, runtime-proof-action-page |
| Chef Admin | `/dashboard/menu` | `apps/chef-admin/src/app/dashboard/menu/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Chef Admin | `/dashboard/orders` | `apps/chef-admin/src/app/dashboard/orders/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Chef Admin | `/dashboard/orders/[id]` | `apps/chef-admin/src/app/dashboard/orders/[id]/page.tsx` | runtime-page-classification |
| Chef Admin | `/dashboard/payouts` | `apps/chef-admin/src/app/dashboard/payouts/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Chef Admin | `/dashboard/reviews` | `apps/chef-admin/src/app/dashboard/reviews/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Chef Admin | `/dashboard/settings` | `apps/chef-admin/src/app/dashboard/settings/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Chef Admin | `/dashboard/storefront` | `apps/chef-admin/src/app/dashboard/storefront/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Chef Admin | `/dashboard/storefront/setup` | `apps/chef-admin/src/app/dashboard/storefront/setup/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Chef Admin | `/privacy` | `apps/chef-admin/src/app/privacy/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Chef Admin | `/terms` | `apps/chef-admin/src/app/terms/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/` | `apps/web/src/app/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/about` | `apps/web/src/app/about/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/account` | `apps/web/src/app/account/page.tsx` | runtime-page-auth-intent, runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/account/addresses` | `apps/web/src/app/account/addresses/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/account/favorites` | `apps/web/src/app/account/favorites/page.tsx` | runtime-page-auth-intent, runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/account/orders` | `apps/web/src/app/account/orders/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/account/settings` | `apps/web/src/app/account/settings/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/auth/forgot-password` | `apps/web/src/app/auth/forgot-password/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/auth/login` | `apps/web/src/app/auth/login/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/auth/signup` | `apps/web/src/app/auth/signup/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/cart` | `apps/web/src/app/cart/page.tsx` | runtime-page-auth-intent, runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/checkout` | `apps/web/src/app/checkout/page.tsx` | runtime-page-classification |
| Customer Web | `/chef-resources` | `apps/web/src/app/chef-resources/page.tsx` | runtime-page-auth-intent, runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/chef-signup` | `apps/web/src/app/chef-signup/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/chefs` | `apps/web/src/app/chefs/page.tsx` | runtime-page-auth-intent, runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/chefs/[slug]` | `apps/web/src/app/chefs/[slug]/page.tsx` | runtime-page-classification |
| Customer Web | `/contact` | `apps/web/src/app/contact/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/how-it-works` | `apps/web/src/app/how-it-works/page.tsx` | runtime-page-auth-intent, runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/maintenance` | `apps/web/src/app/maintenance/page.tsx` | runtime-page-auth-intent, runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/order-confirmation/[orderId]` | `apps/web/src/app/order-confirmation/[orderId]/page.tsx` | runtime-page-auth-intent, runtime-page-classification |
| Customer Web | `/orders/[id]/confirmation` | `apps/web/src/app/orders/[id]/confirmation/page.tsx` | runtime-page-classification |
| Customer Web | `/privacy` | `apps/web/src/app/privacy/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Customer Web | `/terms` | `apps/web/src/app/terms/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Driver App | `/` | `apps/driver-app/src/app/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Driver App | `/auth/login` | `apps/driver-app/src/app/auth/login/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Driver App | `/auth/signup` | `apps/driver-app/src/app/auth/signup/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Driver App | `/delivery/[id]` | `apps/driver-app/src/app/delivery/[id]/page.tsx` | runtime-page-classification |
| Driver App | `/earnings` | `apps/driver-app/src/app/earnings/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Driver App | `/history` | `apps/driver-app/src/app/history/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Driver App | `/privacy` | `apps/driver-app/src/app/privacy/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Driver App | `/profile` | `apps/driver-app/src/app/profile/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Driver App | `/settings` | `apps/driver-app/src/app/settings/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Driver App | `/terms` | `apps/driver-app/src/app/terms/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/` | `apps/ops-admin/src/app/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/auth/login` | `apps/ops-admin/src/app/auth/login/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard` | `apps/ops-admin/src/app/dashboard/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/activity` | `apps/ops-admin/src/app/dashboard/activity/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/analytics` | `apps/ops-admin/src/app/dashboard/analytics/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/announcements` | `apps/ops-admin/src/app/dashboard/announcements/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/automation` | `apps/ops-admin/src/app/dashboard/automation/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/chefs` | `apps/ops-admin/src/app/dashboard/chefs/page.tsx` | runtime-page-auth-intent, runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/chefs/[id]` | `apps/ops-admin/src/app/dashboard/chefs/[id]/page.tsx` | runtime-page-classification |
| Ops Admin | `/dashboard/chefs/approvals` | `apps/ops-admin/src/app/dashboard/chefs/approvals/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/compliance` | `apps/ops-admin/src/app/dashboard/compliance/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/customers` | `apps/ops-admin/src/app/dashboard/customers/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/customers/[id]` | `apps/ops-admin/src/app/dashboard/customers/[id]/page.tsx` | runtime-page-auth-intent, runtime-page-classification |
| Ops Admin | `/dashboard/deliveries` | `apps/ops-admin/src/app/dashboard/deliveries/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/deliveries/[id]` | `apps/ops-admin/src/app/dashboard/deliveries/[id]/page.tsx` | runtime-page-auth-intent, runtime-page-classification |
| Ops Admin | `/dashboard/dispatch` | `apps/ops-admin/src/app/dashboard/dispatch/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/drivers` | `apps/ops-admin/src/app/dashboard/drivers/page.tsx` | runtime-page-auth-intent, runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/drivers/[id]` | `apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx` | runtime-page-auth-intent, runtime-page-classification |
| Ops Admin | `/dashboard/exceptions` | `apps/ops-admin/src/app/dashboard/exceptions/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/finance` | `apps/ops-admin/src/app/dashboard/finance/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/finance/accounts/chefs` | `apps/ops-admin/src/app/dashboard/finance/accounts/chefs/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/finance/accounts/chefs/[id]` | `apps/ops-admin/src/app/dashboard/finance/accounts/chefs/[id]/page.tsx` | runtime-page-classification |
| Ops Admin | `/dashboard/finance/accounts/drivers` | `apps/ops-admin/src/app/dashboard/finance/accounts/drivers/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/finance/accounts/drivers/[id]` | `apps/ops-admin/src/app/dashboard/finance/accounts/drivers/[id]/page.tsx` | runtime-page-classification |
| Ops Admin | `/dashboard/finance/instant-payouts` | `apps/ops-admin/src/app/dashboard/finance/instant-payouts/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/finance/payouts` | `apps/ops-admin/src/app/dashboard/finance/payouts/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/finance/payouts/[runId]` | `apps/ops-admin/src/app/dashboard/finance/payouts/[runId]/page.tsx` | runtime-page-classification |
| Ops Admin | `/dashboard/finance/reconciliation` | `apps/ops-admin/src/app/dashboard/finance/reconciliation/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/finance/refunds` | `apps/ops-admin/src/app/dashboard/finance/refunds/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/health` | `apps/ops-admin/src/app/dashboard/health/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/integrations` | `apps/ops-admin/src/app/dashboard/integrations/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/map` | `apps/ops-admin/src/app/dashboard/map/page.tsx` | runtime-page-auth-intent, runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/orders` | `apps/ops-admin/src/app/dashboard/orders/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/orders/[id]` | `apps/ops-admin/src/app/dashboard/orders/[id]/page.tsx` | runtime-page-classification |
| Ops Admin | `/dashboard/promos` | `apps/ops-admin/src/app/dashboard/promos/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/reports` | `apps/ops-admin/src/app/dashboard/reports/page.tsx` | runtime-page-auth-intent, runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/settings` | `apps/ops-admin/src/app/dashboard/settings/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/support` | `apps/ops-admin/src/app/dashboard/support/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/dashboard/team` | `apps/ops-admin/src/app/dashboard/team/page.tsx` | runtime-page-classification, runtime-proof-action-page |
| Ops Admin | `/internal/command-center` | `apps/ops-admin/src/app/internal/command-center/page.tsx` | runtime-page-auth-intent, runtime-page-classification, runtime-proof-action-page |

## Uncovered Pages

| App | Route | File | Contract sources |
|---|---|---|---|
None found.

## Page Proof Gaps

| App | Route | File | Proof sources |
|---|---|---|---|
| Chef Admin | `/dashboard/orders/[id]` | `apps/chef-admin/src/app/dashboard/orders/[id]/page.tsx` | - |
| Customer Web | `/checkout` | `apps/web/src/app/checkout/page.tsx` | - |
| Customer Web | `/chefs/[slug]` | `apps/web/src/app/chefs/[slug]/page.tsx` | - |
| Customer Web | `/orders/[id]/confirmation` | `apps/web/src/app/orders/[id]/confirmation/page.tsx` | - |
| Driver App | `/delivery/[id]` | `apps/driver-app/src/app/delivery/[id]/page.tsx` | - |
| Ops Admin | `/dashboard/chefs/[id]` | `apps/ops-admin/src/app/dashboard/chefs/[id]/page.tsx` | - |
| Ops Admin | `/dashboard/finance/accounts/chefs/[id]` | `apps/ops-admin/src/app/dashboard/finance/accounts/chefs/[id]/page.tsx` | - |
| Ops Admin | `/dashboard/finance/accounts/drivers/[id]` | `apps/ops-admin/src/app/dashboard/finance/accounts/drivers/[id]/page.tsx` | - |
| Ops Admin | `/dashboard/finance/payouts/[runId]` | `apps/ops-admin/src/app/dashboard/finance/payouts/[runId]/page.tsx` | - |
| Ops Admin | `/dashboard/orders/[id]` | `apps/ops-admin/src/app/dashboard/orders/[id]/page.tsx` | - |

## Covered API Route Files

| App | Endpoint | File | Contract sources |
|---|---|---|---|
| Chef Admin | `/api/analytics` | `apps/chef-admin/src/app/api/analytics/route.ts` | runtime-api-classification |
| Chef Admin | `/api/auth/login` | `apps/chef-admin/src/app/api/auth/login/route.ts` | runtime-api-classification |
| Chef Admin | `/api/auth/signup` | `apps/chef-admin/src/app/api/auth/signup/route.ts` | runtime-api-classification |
| Chef Admin | `/api/health` | `apps/chef-admin/src/app/api/health/route.ts` | runtime-api-classification, runtime-public-json |
| Chef Admin | `/api/menu` | `apps/chef-admin/src/app/api/menu/route.ts` | runtime-api-classification |
| Chef Admin | `/api/menu/[id]` | `apps/chef-admin/src/app/api/menu/[id]/route.ts` | runtime-api-classification |
| Chef Admin | `/api/menu/[id]/options` | `apps/chef-admin/src/app/api/menu/[id]/options/route.ts` | runtime-api-classification |
| Chef Admin | `/api/menu/[id]/options/[optionId]` | `apps/chef-admin/src/app/api/menu/[id]/options/[optionId]/route.ts` | runtime-api-classification |
| Chef Admin | `/api/menu/[id]/options/[optionId]/values` | `apps/chef-admin/src/app/api/menu/[id]/options/[optionId]/values/route.ts` | runtime-api-classification |
| Chef Admin | `/api/menu/[id]/options/[optionId]/values/[valueId]` | `apps/chef-admin/src/app/api/menu/[id]/options/[optionId]/values/[valueId]/route.ts` | runtime-api-classification |
| Chef Admin | `/api/menu/categories` | `apps/chef-admin/src/app/api/menu/categories/route.ts` | runtime-api-classification |
| Chef Admin | `/api/orders` | `apps/chef-admin/src/app/api/orders/route.ts` | live-role-fixture, runtime-api-classification, runtime-authenticated-json |
| Chef Admin | `/api/orders/[id]` | `apps/chef-admin/src/app/api/orders/[id]/route.ts` | runtime-api-classification |
| Chef Admin | `/api/payouts/request` | `apps/chef-admin/src/app/api/payouts/request/route.ts` | runtime-api-classification |
| Chef Admin | `/api/payouts/setup` | `apps/chef-admin/src/app/api/payouts/setup/route.ts` | runtime-api-classification |
| Chef Admin | `/api/profile` | `apps/chef-admin/src/app/api/profile/route.ts` | live-role-fixture, runtime-api-classification, runtime-authenticated-json |
| Chef Admin | `/api/storefront` | `apps/chef-admin/src/app/api/storefront/route.ts` | live-role-fixture, runtime-api-classification, runtime-authenticated-json |
| Chef Admin | `/api/storefront/availability` | `apps/chef-admin/src/app/api/storefront/availability/route.ts` | runtime-api-classification |
| Chef Admin | `/api/upload` | `apps/chef-admin/src/app/api/upload/route.ts` | runtime-api-classification |
| Customer Web | `/api/addresses` | `apps/web/src/app/api/addresses/route.ts` | runtime-api-classification |
| Customer Web | `/api/auth/login` | `apps/web/src/app/api/auth/login/route.ts` | runtime-api-classification |
| Customer Web | `/api/auth/signup` | `apps/web/src/app/api/auth/signup/route.ts` | runtime-api-classification |
| Customer Web | `/api/cart` | `apps/web/src/app/api/cart/route.ts` | runtime-api-classification |
| Customer Web | `/api/checkout` | `apps/web/src/app/api/checkout/route.ts` | runtime-api-classification |
| Customer Web | `/api/checkout/quote` | `apps/web/src/app/api/checkout/quote/route.ts` | runtime-api-classification |
| Customer Web | `/api/eta` | `apps/web/src/app/api/eta/route.ts` | runtime-api-classification, runtime-public-json |
| Customer Web | `/api/favorites` | `apps/web/src/app/api/favorites/route.ts` | runtime-api-classification |
| Customer Web | `/api/health` | `apps/web/src/app/api/health/route.ts` | runtime-api-classification, runtime-public-json |
| Customer Web | `/api/loyalty` | `apps/web/src/app/api/loyalty/route.ts` | live-role-fixture, runtime-api-classification, runtime-authenticated-json |
| Customer Web | `/api/notifications` | `apps/web/src/app/api/notifications/route.ts` | runtime-api-classification |
| Customer Web | `/api/notifications/subscribe` | `apps/web/src/app/api/notifications/subscribe/route.ts` | runtime-api-classification |
| Customer Web | `/api/orders` | `apps/web/src/app/api/orders/route.ts` | live-role-fixture, runtime-api-classification, runtime-authenticated-json |
| Customer Web | `/api/orders/[id]` | `apps/web/src/app/api/orders/[id]/route.ts` | runtime-api-classification |
| Customer Web | `/api/orders/[id]/cancel` | `apps/web/src/app/api/orders/[id]/cancel/route.ts` | runtime-api-classification |
| Customer Web | `/api/orders/[id]/payment-status` | `apps/web/src/app/api/orders/[id]/payment-status/route.ts` | runtime-api-classification |
| Customer Web | `/api/orders/[id]/reorder` | `apps/web/src/app/api/orders/[id]/reorder/route.ts` | runtime-api-classification |
| Customer Web | `/api/payment-methods` | `apps/web/src/app/api/payment-methods/route.ts` | runtime-api-classification |
| Customer Web | `/api/profile` | `apps/web/src/app/api/profile/route.ts` | live-role-fixture, runtime-api-classification, runtime-authenticated-json |
| Customer Web | `/api/promos/validate` | `apps/web/src/app/api/promos/validate/route.ts` | runtime-api-classification |
| Customer Web | `/api/referrals` | `apps/web/src/app/api/referrals/route.ts` | runtime-api-classification |
| Customer Web | `/api/referrals/apply` | `apps/web/src/app/api/referrals/apply/route.ts` | runtime-api-classification |
| Customer Web | `/api/reviews` | `apps/web/src/app/api/reviews/route.ts` | runtime-api-classification |
| Customer Web | `/api/storefronts` | `apps/web/src/app/api/storefronts/route.ts` | runtime-api-classification, runtime-public-json |
| Customer Web | `/api/storefronts/[id]` | `apps/web/src/app/api/storefronts/[id]/route.ts` | runtime-api-classification |
| Customer Web | `/api/storefronts/[id]/menu` | `apps/web/src/app/api/storefronts/[id]/menu/route.ts` | runtime-api-classification |
| Customer Web | `/api/support` | `apps/web/src/app/api/support/route.ts` | runtime-api-classification |
| Customer Web | `/api/support/tickets` | `apps/web/src/app/api/support/tickets/route.ts` | runtime-api-classification |
| Customer Web | `/api/support/tickets/[id]` | `apps/web/src/app/api/support/tickets/[id]/route.ts` | runtime-api-classification |
| Customer Web | `/api/upload` | `apps/web/src/app/api/upload/route.ts` | runtime-api-classification |
| Customer Web | `/api/webhooks/stripe` | `apps/web/src/app/api/webhooks/stripe/route.ts` | runtime-api-classification |
| Driver App | `/api/auth/login` | `apps/driver-app/src/app/api/auth/login/route.ts` | runtime-api-classification |
| Driver App | `/api/auth/logout` | `apps/driver-app/src/app/api/auth/logout/route.ts` | runtime-api-classification |
| Driver App | `/api/auth/signup` | `apps/driver-app/src/app/api/auth/signup/route.ts` | runtime-api-classification |
| Driver App | `/api/deliveries` | `apps/driver-app/src/app/api/deliveries/route.ts` | live-role-fixture, runtime-api-classification, runtime-authenticated-json |
| Driver App | `/api/deliveries/[id]` | `apps/driver-app/src/app/api/deliveries/[id]/route.ts` | runtime-api-classification |
| Driver App | `/api/deliveries/[id]/issue` | `apps/driver-app/src/app/api/deliveries/[id]/issue/route.ts` | runtime-api-classification |
| Driver App | `/api/deliveries/[id]/proof` | `apps/driver-app/src/app/api/deliveries/[id]/proof/route.ts` | runtime-api-classification |
| Driver App | `/api/driver` | `apps/driver-app/src/app/api/driver/route.ts` | live-role-fixture, runtime-api-classification, runtime-authenticated-json |
| Driver App | `/api/driver/presence` | `apps/driver-app/src/app/api/driver/presence/route.ts` | runtime-api-classification |
| Driver App | `/api/earnings` | `apps/driver-app/src/app/api/earnings/route.ts` | live-role-fixture, runtime-api-classification, runtime-authenticated-json |
| Driver App | `/api/health` | `apps/driver-app/src/app/api/health/route.ts` | runtime-api-classification, runtime-public-json |
| Driver App | `/api/location` | `apps/driver-app/src/app/api/location/route.ts` | runtime-api-classification |
| Driver App | `/api/offers` | `apps/driver-app/src/app/api/offers/route.ts` | live-role-fixture, runtime-api-classification, runtime-authenticated-json |
| Driver App | `/api/payouts/instant` | `apps/driver-app/src/app/api/payouts/instant/route.ts` | runtime-api-classification |
| Driver App | `/api/payouts/setup` | `apps/driver-app/src/app/api/payouts/setup/route.ts` | runtime-api-classification |
| Driver App | `/api/upload` | `apps/driver-app/src/app/api/upload/route.ts` | runtime-api-classification |
| Ops Admin | `/api/analytics` | `apps/ops-admin/src/app/api/analytics/route.ts` | runtime-api-classification |
| Ops Admin | `/api/analytics/trends` | `apps/ops-admin/src/app/api/analytics/trends/route.ts` | runtime-api-classification |
| Ops Admin | `/api/announcements` | `apps/ops-admin/src/app/api/announcements/route.ts` | runtime-api-classification |
| Ops Admin | `/api/audit/recent` | `apps/ops-admin/src/app/api/audit/recent/route.ts` | runtime-api-classification |
| Ops Admin | `/api/auth/login` | `apps/ops-admin/src/app/api/auth/login/route.ts` | runtime-api-classification |
| Ops Admin | `/api/chefs` | `apps/ops-admin/src/app/api/chefs/route.ts` | live-role-fixture, runtime-api-classification, runtime-authenticated-json |
| Ops Admin | `/api/chefs/[id]` | `apps/ops-admin/src/app/api/chefs/[id]/route.ts` | runtime-api-classification |
| Ops Admin | `/api/cron/expired-offers` | `apps/ops-admin/src/app/api/cron/expired-offers/route.ts` | high-risk-negative-authz, high-risk-ops-authz, runtime-api-classification |
| Ops Admin | `/api/cron/payouts-chef-preview` | `apps/ops-admin/src/app/api/cron/payouts-chef-preview/route.ts` | high-risk-negative-authz, high-risk-ops-authz, runtime-api-classification |
| Ops Admin | `/api/cron/payouts-driver-preview` | `apps/ops-admin/src/app/api/cron/payouts-driver-preview/route.ts` | high-risk-negative-authz, high-risk-ops-authz, runtime-api-classification |
| Ops Admin | `/api/cron/reconciliation-daily` | `apps/ops-admin/src/app/api/cron/reconciliation-daily/route.ts` | high-risk-negative-authz, high-risk-ops-authz, runtime-api-classification |
| Ops Admin | `/api/cron/sla-tick` | `apps/ops-admin/src/app/api/cron/sla-tick/route.ts` | high-risk-negative-authz, high-risk-ops-authz, runtime-api-classification |
| Ops Admin | `/api/customers` | `apps/ops-admin/src/app/api/customers/route.ts` | live-role-fixture, runtime-api-classification |
| Ops Admin | `/api/customers/[id]/notify` | `apps/ops-admin/src/app/api/customers/[id]/notify/route.ts` | runtime-api-classification |
| Ops Admin | `/api/deliveries` | `apps/ops-admin/src/app/api/deliveries/route.ts` | live-role-fixture, runtime-api-classification |
| Ops Admin | `/api/deliveries/[id]` | `apps/ops-admin/src/app/api/deliveries/[id]/route.ts` | runtime-api-classification |
| Ops Admin | `/api/drivers` | `apps/ops-admin/src/app/api/drivers/route.ts` | live-role-fixture, runtime-api-classification, runtime-authenticated-json |
| Ops Admin | `/api/drivers/[id]` | `apps/ops-admin/src/app/api/drivers/[id]/route.ts` | runtime-api-classification |
| Ops Admin | `/api/engine/dashboard` | `apps/ops-admin/src/app/api/engine/dashboard/route.ts` | runtime-api-classification |
| Ops Admin | `/api/engine/dispatch` | `apps/ops-admin/src/app/api/engine/dispatch/route.ts` | high-risk-negative-authz, high-risk-ops-authz, live-role-fixture, non-admin-role-fixture, runtime-api-classification |
| Ops Admin | `/api/engine/dispatch/offer-history` | `apps/ops-admin/src/app/api/engine/dispatch/offer-history/route.ts` | high-risk-negative-authz, high-risk-ops-authz, live-role-fixture, runtime-api-classification |
| Ops Admin | `/api/engine/exceptions` | `apps/ops-admin/src/app/api/engine/exceptions/route.ts` | live-role-fixture, non-admin-role-fixture, runtime-api-classification |
| Ops Admin | `/api/engine/exceptions/[id]` | `apps/ops-admin/src/app/api/engine/exceptions/[id]/route.ts` | runtime-api-classification |
| Ops Admin | `/api/engine/finance` | `apps/ops-admin/src/app/api/engine/finance/route.ts` | high-risk-negative-authz, high-risk-ops-authz, live-role-fixture, non-admin-role-fixture, runtime-api-classification |
| Ops Admin | `/api/engine/health` | `apps/ops-admin/src/app/api/engine/health/route.ts` | live-role-fixture, runtime-api-classification, runtime-authenticated-json |
| Ops Admin | `/api/engine/maintenance` | `apps/ops-admin/src/app/api/engine/maintenance/route.ts` | runtime-api-classification |
| Ops Admin | `/api/engine/orders/[id]` | `apps/ops-admin/src/app/api/engine/orders/[id]/route.ts` | runtime-api-classification |
| Ops Admin | `/api/engine/payouts` | `apps/ops-admin/src/app/api/engine/payouts/route.ts` | high-risk-negative-authz, high-risk-ops-authz, live-role-fixture, non-admin-role-fixture, runtime-api-classification |
| Ops Admin | `/api/engine/payouts/execute` | `apps/ops-admin/src/app/api/engine/payouts/execute/route.ts` | high-risk-negative-authz, high-risk-ops-authz, runtime-api-classification |
| Ops Admin | `/api/engine/payouts/instant` | `apps/ops-admin/src/app/api/engine/payouts/instant/route.ts` | high-risk-negative-authz, high-risk-ops-authz, live-role-fixture, runtime-api-classification |
| Ops Admin | `/api/engine/payouts/instant/[id]` | `apps/ops-admin/src/app/api/engine/payouts/instant/[id]/route.ts` | high-risk-negative-authz, high-risk-ops-authz, runtime-api-classification |
| Ops Admin | `/api/engine/payouts/preview` | `apps/ops-admin/src/app/api/engine/payouts/preview/route.ts` | high-risk-negative-authz, high-risk-ops-authz, runtime-api-classification |
| Ops Admin | `/api/engine/processors/expired-offers` | `apps/ops-admin/src/app/api/engine/processors/expired-offers/route.ts` | high-risk-negative-authz, high-risk-ops-authz, runtime-api-classification |
| Ops Admin | `/api/engine/processors/sla` | `apps/ops-admin/src/app/api/engine/processors/sla/route.ts` | high-risk-negative-authz, high-risk-ops-authz, runtime-api-classification |
| Ops Admin | `/api/engine/reconciliation` | `apps/ops-admin/src/app/api/engine/reconciliation/route.ts` | live-role-fixture, non-admin-role-fixture, runtime-api-classification |
| Ops Admin | `/api/engine/refunds` | `apps/ops-admin/src/app/api/engine/refunds/route.ts` | high-risk-negative-authz, high-risk-ops-authz, live-role-fixture, runtime-api-classification |
| Ops Admin | `/api/engine/rules` | `apps/ops-admin/src/app/api/engine/rules/route.ts` | runtime-api-classification |
| Ops Admin | `/api/engine/settings` | `apps/ops-admin/src/app/api/engine/settings/route.ts` | runtime-api-classification |
| Ops Admin | `/api/engine/storefronts/[id]` | `apps/ops-admin/src/app/api/engine/storefronts/[id]/route.ts` | runtime-api-classification |
| Ops Admin | `/api/export` | `apps/ops-admin/src/app/api/export/route.ts` | runtime-api-classification |
| Ops Admin | `/api/fixtures/reset` | `apps/ops-admin/src/app/api/fixtures/reset/route.ts` | runtime-api-classification |
| Ops Admin | `/api/health` | `apps/ops-admin/src/app/api/health/route.ts` | runtime-api-classification, runtime-public-json |
| Ops Admin | `/api/internal/command-center/change-requests` | `apps/ops-admin/src/app/api/internal/command-center/change-requests/route.ts` | high-risk-negative-authz, high-risk-ops-authz, runtime-api-classification |
| Ops Admin | `/api/ops/live-board` | `apps/ops-admin/src/app/api/ops/live-board/route.ts` | live-role-fixture, runtime-api-classification, runtime-authenticated-json |
| Ops Admin | `/api/orders` | `apps/ops-admin/src/app/api/orders/route.ts` | live-role-fixture, non-admin-role-fixture, runtime-api-classification, runtime-authenticated-json |
| Ops Admin | `/api/orders/[id]` | `apps/ops-admin/src/app/api/orders/[id]/route.ts` | runtime-api-classification |
| Ops Admin | `/api/orders/[id]/refund` | `apps/ops-admin/src/app/api/orders/[id]/refund/route.ts` | high-risk-negative-authz, high-risk-ops-authz, runtime-api-classification |
| Ops Admin | `/api/promos` | `apps/ops-admin/src/app/api/promos/route.ts` | runtime-api-classification |
| Ops Admin | `/api/stripe/webhook` | `apps/ops-admin/src/app/api/stripe/webhook/route.ts` | high-risk-negative-authz, high-risk-ops-authz, runtime-api-classification |
| Ops Admin | `/api/support` | `apps/ops-admin/src/app/api/support/route.ts` | live-role-fixture, non-admin-role-fixture, runtime-api-classification |
| Ops Admin | `/api/support/[id]` | `apps/ops-admin/src/app/api/support/[id]/route.ts` | runtime-api-classification |
| Ops Admin | `/api/surge` | `apps/ops-admin/src/app/api/surge/route.ts` | runtime-api-classification |
| Ops Admin | `/api/team` | `apps/ops-admin/src/app/api/team/route.ts` | live-role-fixture, non-admin-role-fixture, runtime-api-classification |
| Ops Admin | `/internal/command-center/docs/[...docPath]` | `apps/ops-admin/src/app/internal/command-center/docs/[...docPath]/route.ts` | runtime-api-classification |

## Uncovered API Route Files

| App | Endpoint | File | Contract sources |
|---|---|---|---|
None found.

## API Proof Gaps

| App | Endpoint | File | Proof sources |
|---|---|---|---|
| Chef Admin | `/api/analytics` | `apps/chef-admin/src/app/api/analytics/route.ts` | - |
| Chef Admin | `/api/auth/login` | `apps/chef-admin/src/app/api/auth/login/route.ts` | - |
| Chef Admin | `/api/auth/signup` | `apps/chef-admin/src/app/api/auth/signup/route.ts` | - |
| Chef Admin | `/api/menu` | `apps/chef-admin/src/app/api/menu/route.ts` | - |
| Chef Admin | `/api/menu/[id]` | `apps/chef-admin/src/app/api/menu/[id]/route.ts` | - |
| Chef Admin | `/api/menu/[id]/options` | `apps/chef-admin/src/app/api/menu/[id]/options/route.ts` | - |
| Chef Admin | `/api/menu/[id]/options/[optionId]` | `apps/chef-admin/src/app/api/menu/[id]/options/[optionId]/route.ts` | - |
| Chef Admin | `/api/menu/[id]/options/[optionId]/values` | `apps/chef-admin/src/app/api/menu/[id]/options/[optionId]/values/route.ts` | - |
| Chef Admin | `/api/menu/[id]/options/[optionId]/values/[valueId]` | `apps/chef-admin/src/app/api/menu/[id]/options/[optionId]/values/[valueId]/route.ts` | - |
| Chef Admin | `/api/menu/categories` | `apps/chef-admin/src/app/api/menu/categories/route.ts` | - |
| Chef Admin | `/api/orders/[id]` | `apps/chef-admin/src/app/api/orders/[id]/route.ts` | - |
| Chef Admin | `/api/payouts/request` | `apps/chef-admin/src/app/api/payouts/request/route.ts` | - |
| Chef Admin | `/api/payouts/setup` | `apps/chef-admin/src/app/api/payouts/setup/route.ts` | - |
| Chef Admin | `/api/storefront/availability` | `apps/chef-admin/src/app/api/storefront/availability/route.ts` | - |
| Chef Admin | `/api/upload` | `apps/chef-admin/src/app/api/upload/route.ts` | - |
| Customer Web | `/api/addresses` | `apps/web/src/app/api/addresses/route.ts` | - |
| Customer Web | `/api/auth/login` | `apps/web/src/app/api/auth/login/route.ts` | - |
| Customer Web | `/api/auth/signup` | `apps/web/src/app/api/auth/signup/route.ts` | - |
| Customer Web | `/api/cart` | `apps/web/src/app/api/cart/route.ts` | - |
| Customer Web | `/api/checkout` | `apps/web/src/app/api/checkout/route.ts` | - |
| Customer Web | `/api/checkout/quote` | `apps/web/src/app/api/checkout/quote/route.ts` | - |
| Customer Web | `/api/favorites` | `apps/web/src/app/api/favorites/route.ts` | - |
| Customer Web | `/api/notifications` | `apps/web/src/app/api/notifications/route.ts` | - |
| Customer Web | `/api/notifications/subscribe` | `apps/web/src/app/api/notifications/subscribe/route.ts` | - |
| Customer Web | `/api/orders/[id]` | `apps/web/src/app/api/orders/[id]/route.ts` | - |
| Customer Web | `/api/orders/[id]/cancel` | `apps/web/src/app/api/orders/[id]/cancel/route.ts` | - |
| Customer Web | `/api/orders/[id]/payment-status` | `apps/web/src/app/api/orders/[id]/payment-status/route.ts` | - |
| Customer Web | `/api/orders/[id]/reorder` | `apps/web/src/app/api/orders/[id]/reorder/route.ts` | - |
| Customer Web | `/api/payment-methods` | `apps/web/src/app/api/payment-methods/route.ts` | - |
| Customer Web | `/api/promos/validate` | `apps/web/src/app/api/promos/validate/route.ts` | - |
| Customer Web | `/api/referrals` | `apps/web/src/app/api/referrals/route.ts` | - |
| Customer Web | `/api/referrals/apply` | `apps/web/src/app/api/referrals/apply/route.ts` | - |
| Customer Web | `/api/reviews` | `apps/web/src/app/api/reviews/route.ts` | - |
| Customer Web | `/api/storefronts/[id]` | `apps/web/src/app/api/storefronts/[id]/route.ts` | - |
| Customer Web | `/api/storefronts/[id]/menu` | `apps/web/src/app/api/storefronts/[id]/menu/route.ts` | - |
| Customer Web | `/api/support` | `apps/web/src/app/api/support/route.ts` | - |
| Customer Web | `/api/support/tickets` | `apps/web/src/app/api/support/tickets/route.ts` | - |
| Customer Web | `/api/support/tickets/[id]` | `apps/web/src/app/api/support/tickets/[id]/route.ts` | - |
| Customer Web | `/api/upload` | `apps/web/src/app/api/upload/route.ts` | - |
| Customer Web | `/api/webhooks/stripe` | `apps/web/src/app/api/webhooks/stripe/route.ts` | - |
| Driver App | `/api/auth/login` | `apps/driver-app/src/app/api/auth/login/route.ts` | - |
| Driver App | `/api/auth/logout` | `apps/driver-app/src/app/api/auth/logout/route.ts` | - |
| Driver App | `/api/auth/signup` | `apps/driver-app/src/app/api/auth/signup/route.ts` | - |
| Driver App | `/api/deliveries/[id]` | `apps/driver-app/src/app/api/deliveries/[id]/route.ts` | - |
| Driver App | `/api/deliveries/[id]/issue` | `apps/driver-app/src/app/api/deliveries/[id]/issue/route.ts` | - |
| Driver App | `/api/deliveries/[id]/proof` | `apps/driver-app/src/app/api/deliveries/[id]/proof/route.ts` | - |
| Driver App | `/api/driver/presence` | `apps/driver-app/src/app/api/driver/presence/route.ts` | - |
| Driver App | `/api/location` | `apps/driver-app/src/app/api/location/route.ts` | - |
| Driver App | `/api/payouts/instant` | `apps/driver-app/src/app/api/payouts/instant/route.ts` | - |
| Driver App | `/api/payouts/setup` | `apps/driver-app/src/app/api/payouts/setup/route.ts` | - |
| Driver App | `/api/upload` | `apps/driver-app/src/app/api/upload/route.ts` | - |
| Ops Admin | `/api/analytics` | `apps/ops-admin/src/app/api/analytics/route.ts` | - |
| Ops Admin | `/api/analytics/trends` | `apps/ops-admin/src/app/api/analytics/trends/route.ts` | - |
| Ops Admin | `/api/announcements` | `apps/ops-admin/src/app/api/announcements/route.ts` | - |
| Ops Admin | `/api/audit/recent` | `apps/ops-admin/src/app/api/audit/recent/route.ts` | - |
| Ops Admin | `/api/auth/login` | `apps/ops-admin/src/app/api/auth/login/route.ts` | - |
| Ops Admin | `/api/chefs/[id]` | `apps/ops-admin/src/app/api/chefs/[id]/route.ts` | - |
| Ops Admin | `/api/customers/[id]/notify` | `apps/ops-admin/src/app/api/customers/[id]/notify/route.ts` | - |
| Ops Admin | `/api/deliveries/[id]` | `apps/ops-admin/src/app/api/deliveries/[id]/route.ts` | - |
| Ops Admin | `/api/drivers/[id]` | `apps/ops-admin/src/app/api/drivers/[id]/route.ts` | - |
| Ops Admin | `/api/engine/dashboard` | `apps/ops-admin/src/app/api/engine/dashboard/route.ts` | - |
| Ops Admin | `/api/engine/exceptions/[id]` | `apps/ops-admin/src/app/api/engine/exceptions/[id]/route.ts` | - |
| Ops Admin | `/api/engine/maintenance` | `apps/ops-admin/src/app/api/engine/maintenance/route.ts` | - |
| Ops Admin | `/api/engine/orders/[id]` | `apps/ops-admin/src/app/api/engine/orders/[id]/route.ts` | - |
| Ops Admin | `/api/engine/rules` | `apps/ops-admin/src/app/api/engine/rules/route.ts` | - |
| Ops Admin | `/api/engine/settings` | `apps/ops-admin/src/app/api/engine/settings/route.ts` | - |
| Ops Admin | `/api/engine/storefronts/[id]` | `apps/ops-admin/src/app/api/engine/storefronts/[id]/route.ts` | - |
| Ops Admin | `/api/export` | `apps/ops-admin/src/app/api/export/route.ts` | - |
| Ops Admin | `/api/fixtures/reset` | `apps/ops-admin/src/app/api/fixtures/reset/route.ts` | - |
| Ops Admin | `/api/orders/[id]` | `apps/ops-admin/src/app/api/orders/[id]/route.ts` | - |
| Ops Admin | `/api/promos` | `apps/ops-admin/src/app/api/promos/route.ts` | - |
| Ops Admin | `/api/support/[id]` | `apps/ops-admin/src/app/api/support/[id]/route.ts` | - |
| Ops Admin | `/api/surge` | `apps/ops-admin/src/app/api/surge/route.ts` | - |
| Ops Admin | `/internal/command-center/docs/[...docPath]` | `apps/ops-admin/src/app/internal/command-center/docs/[...docPath]/route.ts` | - |
