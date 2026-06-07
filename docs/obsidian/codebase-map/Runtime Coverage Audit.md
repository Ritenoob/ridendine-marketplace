# Runtime Coverage Audit

Generated: 2026-06-07T18:12:02.753Z

This Phase 17 coverage inventory maps every discovered app page and API route file to the runtime, live-role, non-admin role, and high-risk authorization contracts that currently exercise or document it. Uncovered rows are visibility gaps for the next hardening phase; this audit does not make live requests against every dynamic or state-changing route.

## Summary

| Surface | Total discovered | Covered by current contracts | Uncovered |
|---|---:|---:|---:|
| Pages | 90 | 17 | 73 |
| API route files | 120 | 46 | 74 |

## Contract Source Counts

| Source | Contract rows |
|---|---:|
| high-risk-negative-authz | 33 |
| high-risk-ops-authz | 19 |
| live-role-fixture | 27 |
| non-admin-role-fixture | 15 |
| runtime-authenticated-json | 15 |
| runtime-page-auth-intent | 17 |
| runtime-public-json | 7 |

## Covered Pages

| App | Route | File | Contract sources |
|---|---|---|---|
| Chef Admin | `/dashboard/availability` | `apps/chef-admin/src/app/dashboard/availability/page.tsx` | runtime-page-auth-intent |
| Customer Web | `/account` | `apps/web/src/app/account/page.tsx` | runtime-page-auth-intent |
| Customer Web | `/account/favorites` | `apps/web/src/app/account/favorites/page.tsx` | runtime-page-auth-intent |
| Customer Web | `/cart` | `apps/web/src/app/cart/page.tsx` | runtime-page-auth-intent |
| Customer Web | `/chef-resources` | `apps/web/src/app/chef-resources/page.tsx` | runtime-page-auth-intent |
| Customer Web | `/chefs` | `apps/web/src/app/chefs/page.tsx` | runtime-page-auth-intent |
| Customer Web | `/how-it-works` | `apps/web/src/app/how-it-works/page.tsx` | runtime-page-auth-intent |
| Customer Web | `/maintenance` | `apps/web/src/app/maintenance/page.tsx` | runtime-page-auth-intent |
| Customer Web | `/order-confirmation/[orderId]` | `apps/web/src/app/order-confirmation/[orderId]/page.tsx` | runtime-page-auth-intent |
| Ops Admin | `/dashboard/chefs` | `apps/ops-admin/src/app/dashboard/chefs/page.tsx` | runtime-page-auth-intent |
| Ops Admin | `/dashboard/customers/[id]` | `apps/ops-admin/src/app/dashboard/customers/[id]/page.tsx` | runtime-page-auth-intent |
| Ops Admin | `/dashboard/deliveries/[id]` | `apps/ops-admin/src/app/dashboard/deliveries/[id]/page.tsx` | runtime-page-auth-intent |
| Ops Admin | `/dashboard/drivers` | `apps/ops-admin/src/app/dashboard/drivers/page.tsx` | runtime-page-auth-intent |
| Ops Admin | `/dashboard/drivers/[id]` | `apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx` | runtime-page-auth-intent |
| Ops Admin | `/dashboard/map` | `apps/ops-admin/src/app/dashboard/map/page.tsx` | runtime-page-auth-intent |
| Ops Admin | `/dashboard/reports` | `apps/ops-admin/src/app/dashboard/reports/page.tsx` | runtime-page-auth-intent |
| Ops Admin | `/internal/command-center` | `apps/ops-admin/src/app/internal/command-center/page.tsx` | runtime-page-auth-intent |

## Uncovered Pages

| App | Route | File | Contract sources |
|---|---|---|---|
| Chef Admin | `/` | `apps/chef-admin/src/app/page.tsx` | - |
| Chef Admin | `/auth/forgot-password` | `apps/chef-admin/src/app/auth/forgot-password/page.tsx` | - |
| Chef Admin | `/auth/login` | `apps/chef-admin/src/app/auth/login/page.tsx` | - |
| Chef Admin | `/auth/signup` | `apps/chef-admin/src/app/auth/signup/page.tsx` | - |
| Chef Admin | `/dashboard` | `apps/chef-admin/src/app/dashboard/page.tsx` | - |
| Chef Admin | `/dashboard/analytics` | `apps/chef-admin/src/app/dashboard/analytics/page.tsx` | - |
| Chef Admin | `/dashboard/menu` | `apps/chef-admin/src/app/dashboard/menu/page.tsx` | - |
| Chef Admin | `/dashboard/orders` | `apps/chef-admin/src/app/dashboard/orders/page.tsx` | - |
| Chef Admin | `/dashboard/orders/[id]` | `apps/chef-admin/src/app/dashboard/orders/[id]/page.tsx` | - |
| Chef Admin | `/dashboard/payouts` | `apps/chef-admin/src/app/dashboard/payouts/page.tsx` | - |
| Chef Admin | `/dashboard/reviews` | `apps/chef-admin/src/app/dashboard/reviews/page.tsx` | - |
| Chef Admin | `/dashboard/settings` | `apps/chef-admin/src/app/dashboard/settings/page.tsx` | - |
| Chef Admin | `/dashboard/storefront` | `apps/chef-admin/src/app/dashboard/storefront/page.tsx` | - |
| Chef Admin | `/dashboard/storefront/setup` | `apps/chef-admin/src/app/dashboard/storefront/setup/page.tsx` | - |
| Chef Admin | `/privacy` | `apps/chef-admin/src/app/privacy/page.tsx` | - |
| Chef Admin | `/terms` | `apps/chef-admin/src/app/terms/page.tsx` | - |
| Customer Web | `/` | `apps/web/src/app/page.tsx` | - |
| Customer Web | `/about` | `apps/web/src/app/about/page.tsx` | - |
| Customer Web | `/account/addresses` | `apps/web/src/app/account/addresses/page.tsx` | - |
| Customer Web | `/account/orders` | `apps/web/src/app/account/orders/page.tsx` | - |
| Customer Web | `/account/settings` | `apps/web/src/app/account/settings/page.tsx` | - |
| Customer Web | `/auth/forgot-password` | `apps/web/src/app/auth/forgot-password/page.tsx` | - |
| Customer Web | `/auth/login` | `apps/web/src/app/auth/login/page.tsx` | - |
| Customer Web | `/auth/signup` | `apps/web/src/app/auth/signup/page.tsx` | - |
| Customer Web | `/checkout` | `apps/web/src/app/checkout/page.tsx` | - |
| Customer Web | `/chef-signup` | `apps/web/src/app/chef-signup/page.tsx` | - |
| Customer Web | `/chefs/[slug]` | `apps/web/src/app/chefs/[slug]/page.tsx` | - |
| Customer Web | `/contact` | `apps/web/src/app/contact/page.tsx` | - |
| Customer Web | `/orders/[id]/confirmation` | `apps/web/src/app/orders/[id]/confirmation/page.tsx` | - |
| Customer Web | `/privacy` | `apps/web/src/app/privacy/page.tsx` | - |
| Customer Web | `/terms` | `apps/web/src/app/terms/page.tsx` | - |
| Driver App | `/` | `apps/driver-app/src/app/page.tsx` | - |
| Driver App | `/auth/login` | `apps/driver-app/src/app/auth/login/page.tsx` | - |
| Driver App | `/auth/signup` | `apps/driver-app/src/app/auth/signup/page.tsx` | - |
| Driver App | `/delivery/[id]` | `apps/driver-app/src/app/delivery/[id]/page.tsx` | - |
| Driver App | `/earnings` | `apps/driver-app/src/app/earnings/page.tsx` | - |
| Driver App | `/history` | `apps/driver-app/src/app/history/page.tsx` | - |
| Driver App | `/privacy` | `apps/driver-app/src/app/privacy/page.tsx` | - |
| Driver App | `/profile` | `apps/driver-app/src/app/profile/page.tsx` | - |
| Driver App | `/settings` | `apps/driver-app/src/app/settings/page.tsx` | - |
| Driver App | `/terms` | `apps/driver-app/src/app/terms/page.tsx` | - |
| Ops Admin | `/` | `apps/ops-admin/src/app/page.tsx` | - |
| Ops Admin | `/auth/login` | `apps/ops-admin/src/app/auth/login/page.tsx` | - |
| Ops Admin | `/dashboard` | `apps/ops-admin/src/app/dashboard/page.tsx` | - |
| Ops Admin | `/dashboard/activity` | `apps/ops-admin/src/app/dashboard/activity/page.tsx` | - |
| Ops Admin | `/dashboard/analytics` | `apps/ops-admin/src/app/dashboard/analytics/page.tsx` | - |
| Ops Admin | `/dashboard/announcements` | `apps/ops-admin/src/app/dashboard/announcements/page.tsx` | - |
| Ops Admin | `/dashboard/automation` | `apps/ops-admin/src/app/dashboard/automation/page.tsx` | - |
| Ops Admin | `/dashboard/chefs/[id]` | `apps/ops-admin/src/app/dashboard/chefs/[id]/page.tsx` | - |
| Ops Admin | `/dashboard/chefs/approvals` | `apps/ops-admin/src/app/dashboard/chefs/approvals/page.tsx` | - |
| Ops Admin | `/dashboard/compliance` | `apps/ops-admin/src/app/dashboard/compliance/page.tsx` | - |
| Ops Admin | `/dashboard/customers` | `apps/ops-admin/src/app/dashboard/customers/page.tsx` | - |
| Ops Admin | `/dashboard/deliveries` | `apps/ops-admin/src/app/dashboard/deliveries/page.tsx` | - |
| Ops Admin | `/dashboard/dispatch` | `apps/ops-admin/src/app/dashboard/dispatch/page.tsx` | - |
| Ops Admin | `/dashboard/exceptions` | `apps/ops-admin/src/app/dashboard/exceptions/page.tsx` | - |
| Ops Admin | `/dashboard/finance` | `apps/ops-admin/src/app/dashboard/finance/page.tsx` | - |
| Ops Admin | `/dashboard/finance/accounts/chefs` | `apps/ops-admin/src/app/dashboard/finance/accounts/chefs/page.tsx` | - |
| Ops Admin | `/dashboard/finance/accounts/chefs/[id]` | `apps/ops-admin/src/app/dashboard/finance/accounts/chefs/[id]/page.tsx` | - |
| Ops Admin | `/dashboard/finance/accounts/drivers` | `apps/ops-admin/src/app/dashboard/finance/accounts/drivers/page.tsx` | - |
| Ops Admin | `/dashboard/finance/accounts/drivers/[id]` | `apps/ops-admin/src/app/dashboard/finance/accounts/drivers/[id]/page.tsx` | - |
| Ops Admin | `/dashboard/finance/instant-payouts` | `apps/ops-admin/src/app/dashboard/finance/instant-payouts/page.tsx` | - |
| Ops Admin | `/dashboard/finance/payouts` | `apps/ops-admin/src/app/dashboard/finance/payouts/page.tsx` | - |
| Ops Admin | `/dashboard/finance/payouts/[runId]` | `apps/ops-admin/src/app/dashboard/finance/payouts/[runId]/page.tsx` | - |
| Ops Admin | `/dashboard/finance/reconciliation` | `apps/ops-admin/src/app/dashboard/finance/reconciliation/page.tsx` | - |
| Ops Admin | `/dashboard/finance/refunds` | `apps/ops-admin/src/app/dashboard/finance/refunds/page.tsx` | - |
| Ops Admin | `/dashboard/health` | `apps/ops-admin/src/app/dashboard/health/page.tsx` | - |
| Ops Admin | `/dashboard/integrations` | `apps/ops-admin/src/app/dashboard/integrations/page.tsx` | - |
| Ops Admin | `/dashboard/orders` | `apps/ops-admin/src/app/dashboard/orders/page.tsx` | - |
| Ops Admin | `/dashboard/orders/[id]` | `apps/ops-admin/src/app/dashboard/orders/[id]/page.tsx` | - |
| Ops Admin | `/dashboard/promos` | `apps/ops-admin/src/app/dashboard/promos/page.tsx` | - |
| Ops Admin | `/dashboard/settings` | `apps/ops-admin/src/app/dashboard/settings/page.tsx` | - |
| Ops Admin | `/dashboard/support` | `apps/ops-admin/src/app/dashboard/support/page.tsx` | - |
| Ops Admin | `/dashboard/team` | `apps/ops-admin/src/app/dashboard/team/page.tsx` | - |

## Covered API Route Files

| App | Endpoint | File | Contract sources |
|---|---|---|---|
| Chef Admin | `/api/health` | `apps/chef-admin/src/app/api/health/route.ts` | runtime-public-json |
| Chef Admin | `/api/orders` | `apps/chef-admin/src/app/api/orders/route.ts` | live-role-fixture, runtime-authenticated-json |
| Chef Admin | `/api/profile` | `apps/chef-admin/src/app/api/profile/route.ts` | live-role-fixture, runtime-authenticated-json |
| Chef Admin | `/api/storefront` | `apps/chef-admin/src/app/api/storefront/route.ts` | live-role-fixture, runtime-authenticated-json |
| Customer Web | `/api/eta` | `apps/web/src/app/api/eta/route.ts` | runtime-public-json |
| Customer Web | `/api/health` | `apps/web/src/app/api/health/route.ts` | runtime-public-json |
| Customer Web | `/api/loyalty` | `apps/web/src/app/api/loyalty/route.ts` | live-role-fixture, runtime-authenticated-json |
| Customer Web | `/api/orders` | `apps/web/src/app/api/orders/route.ts` | live-role-fixture, runtime-authenticated-json |
| Customer Web | `/api/profile` | `apps/web/src/app/api/profile/route.ts` | live-role-fixture, runtime-authenticated-json |
| Customer Web | `/api/storefronts` | `apps/web/src/app/api/storefronts/route.ts` | runtime-public-json |
| Driver App | `/api/deliveries` | `apps/driver-app/src/app/api/deliveries/route.ts` | live-role-fixture, runtime-authenticated-json |
| Driver App | `/api/driver` | `apps/driver-app/src/app/api/driver/route.ts` | live-role-fixture, runtime-authenticated-json |
| Driver App | `/api/earnings` | `apps/driver-app/src/app/api/earnings/route.ts` | live-role-fixture, runtime-authenticated-json |
| Driver App | `/api/health` | `apps/driver-app/src/app/api/health/route.ts` | runtime-public-json |
| Driver App | `/api/offers` | `apps/driver-app/src/app/api/offers/route.ts` | live-role-fixture, runtime-authenticated-json |
| Ops Admin | `/api/chefs` | `apps/ops-admin/src/app/api/chefs/route.ts` | live-role-fixture, runtime-authenticated-json |
| Ops Admin | `/api/cron/expired-offers` | `apps/ops-admin/src/app/api/cron/expired-offers/route.ts` | high-risk-negative-authz, high-risk-ops-authz |
| Ops Admin | `/api/cron/payouts-chef-preview` | `apps/ops-admin/src/app/api/cron/payouts-chef-preview/route.ts` | high-risk-negative-authz, high-risk-ops-authz |
| Ops Admin | `/api/cron/payouts-driver-preview` | `apps/ops-admin/src/app/api/cron/payouts-driver-preview/route.ts` | high-risk-negative-authz, high-risk-ops-authz |
| Ops Admin | `/api/cron/reconciliation-daily` | `apps/ops-admin/src/app/api/cron/reconciliation-daily/route.ts` | high-risk-negative-authz, high-risk-ops-authz |
| Ops Admin | `/api/cron/sla-tick` | `apps/ops-admin/src/app/api/cron/sla-tick/route.ts` | high-risk-negative-authz, high-risk-ops-authz |
| Ops Admin | `/api/customers` | `apps/ops-admin/src/app/api/customers/route.ts` | live-role-fixture |
| Ops Admin | `/api/deliveries` | `apps/ops-admin/src/app/api/deliveries/route.ts` | live-role-fixture |
| Ops Admin | `/api/drivers` | `apps/ops-admin/src/app/api/drivers/route.ts` | live-role-fixture, runtime-authenticated-json |
| Ops Admin | `/api/engine/dispatch` | `apps/ops-admin/src/app/api/engine/dispatch/route.ts` | high-risk-negative-authz, high-risk-ops-authz, live-role-fixture, non-admin-role-fixture |
| Ops Admin | `/api/engine/dispatch/offer-history` | `apps/ops-admin/src/app/api/engine/dispatch/offer-history/route.ts` | high-risk-negative-authz, high-risk-ops-authz, live-role-fixture |
| Ops Admin | `/api/engine/exceptions` | `apps/ops-admin/src/app/api/engine/exceptions/route.ts` | live-role-fixture, non-admin-role-fixture |
| Ops Admin | `/api/engine/finance` | `apps/ops-admin/src/app/api/engine/finance/route.ts` | high-risk-negative-authz, high-risk-ops-authz, live-role-fixture, non-admin-role-fixture |
| Ops Admin | `/api/engine/health` | `apps/ops-admin/src/app/api/engine/health/route.ts` | live-role-fixture, runtime-authenticated-json |
| Ops Admin | `/api/engine/payouts` | `apps/ops-admin/src/app/api/engine/payouts/route.ts` | high-risk-negative-authz, high-risk-ops-authz, live-role-fixture, non-admin-role-fixture |
| Ops Admin | `/api/engine/payouts/execute` | `apps/ops-admin/src/app/api/engine/payouts/execute/route.ts` | high-risk-negative-authz, high-risk-ops-authz |
| Ops Admin | `/api/engine/payouts/instant` | `apps/ops-admin/src/app/api/engine/payouts/instant/route.ts` | high-risk-negative-authz, high-risk-ops-authz, live-role-fixture |
| Ops Admin | `/api/engine/payouts/instant/[id]` | `apps/ops-admin/src/app/api/engine/payouts/instant/[id]/route.ts` | high-risk-negative-authz, high-risk-ops-authz |
| Ops Admin | `/api/engine/payouts/preview` | `apps/ops-admin/src/app/api/engine/payouts/preview/route.ts` | high-risk-negative-authz, high-risk-ops-authz |
| Ops Admin | `/api/engine/processors/expired-offers` | `apps/ops-admin/src/app/api/engine/processors/expired-offers/route.ts` | high-risk-negative-authz, high-risk-ops-authz |
| Ops Admin | `/api/engine/processors/sla` | `apps/ops-admin/src/app/api/engine/processors/sla/route.ts` | high-risk-negative-authz, high-risk-ops-authz |
| Ops Admin | `/api/engine/reconciliation` | `apps/ops-admin/src/app/api/engine/reconciliation/route.ts` | live-role-fixture, non-admin-role-fixture |
| Ops Admin | `/api/engine/refunds` | `apps/ops-admin/src/app/api/engine/refunds/route.ts` | high-risk-negative-authz, high-risk-ops-authz, live-role-fixture |
| Ops Admin | `/api/health` | `apps/ops-admin/src/app/api/health/route.ts` | runtime-public-json |
| Ops Admin | `/api/internal/command-center/change-requests` | `apps/ops-admin/src/app/api/internal/command-center/change-requests/route.ts` | high-risk-negative-authz, high-risk-ops-authz |
| Ops Admin | `/api/ops/live-board` | `apps/ops-admin/src/app/api/ops/live-board/route.ts` | live-role-fixture, runtime-authenticated-json |
| Ops Admin | `/api/orders` | `apps/ops-admin/src/app/api/orders/route.ts` | live-role-fixture, non-admin-role-fixture, runtime-authenticated-json |
| Ops Admin | `/api/orders/[id]/refund` | `apps/ops-admin/src/app/api/orders/[id]/refund/route.ts` | high-risk-negative-authz, high-risk-ops-authz |
| Ops Admin | `/api/stripe/webhook` | `apps/ops-admin/src/app/api/stripe/webhook/route.ts` | high-risk-negative-authz, high-risk-ops-authz |
| Ops Admin | `/api/support` | `apps/ops-admin/src/app/api/support/route.ts` | live-role-fixture, non-admin-role-fixture |
| Ops Admin | `/api/team` | `apps/ops-admin/src/app/api/team/route.ts` | live-role-fixture, non-admin-role-fixture |

## Uncovered API Route Files

| App | Endpoint | File | Contract sources |
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
