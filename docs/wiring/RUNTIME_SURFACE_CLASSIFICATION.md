# Runtime Surface Classification

Generated: 2026-06-07T19:06:58.428Z

This Phase 18/19 classification inventory records the intended auth, guard, method, mutation-risk, and smoke-bucket treatment for every discovered app page and route handler. It is structural coverage, not a claim that every dynamic or mutating route is safe to exercise against production.

## Summary

| Surface | Total discovered | Classified | Unclassified |
|---|---:|---:|---:|
| Pages | 90 | 90 | 0 |
| API route handlers | 120 | 120 | 0 |

## Page Surface Classification

| App | Route | File | Auth intent | Smoke bucket | Reason |
|---|---|---|---|---|---|
| Chef Admin | `/` | `apps/chef-admin/src/app/page.tsx` | protected-redirect | redirect-or-login-guard | Root shim that redirects into a protected workspace. |
| Chef Admin | `/auth/forgot-password` | `apps/chef-admin/src/app/auth/forgot-password/page.tsx` | public-auth-entry | public-html | Public authentication entry page that creates or recovers a session. |
| Chef Admin | `/auth/login` | `apps/chef-admin/src/app/auth/login/page.tsx` | public-auth-entry | public-html | Public authentication entry page that creates or recovers a session. |
| Chef Admin | `/auth/signup` | `apps/chef-admin/src/app/auth/signup/page.tsx` | public-auth-entry | public-html | Public authentication entry page that creates or recovers a session. |
| Chef Admin | `/dashboard` | `apps/chef-admin/src/app/dashboard/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Chef Admin | `/dashboard/analytics` | `apps/chef-admin/src/app/dashboard/analytics/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Chef Admin | `/dashboard/availability` | `apps/chef-admin/src/app/dashboard/availability/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Chef Admin | `/dashboard/menu` | `apps/chef-admin/src/app/dashboard/menu/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Chef Admin | `/dashboard/orders` | `apps/chef-admin/src/app/dashboard/orders/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Chef Admin | `/dashboard/orders/[id]` | `apps/chef-admin/src/app/dashboard/orders/[id]/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Chef Admin | `/dashboard/payouts` | `apps/chef-admin/src/app/dashboard/payouts/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Chef Admin | `/dashboard/reviews` | `apps/chef-admin/src/app/dashboard/reviews/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Chef Admin | `/dashboard/settings` | `apps/chef-admin/src/app/dashboard/settings/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Chef Admin | `/dashboard/storefront` | `apps/chef-admin/src/app/dashboard/storefront/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Chef Admin | `/dashboard/storefront/setup` | `apps/chef-admin/src/app/dashboard/storefront/setup/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Chef Admin | `/privacy` | `apps/chef-admin/src/app/privacy/page.tsx` | public | public-html | Public marketing, legal, discovery, or informational page. |
| Chef Admin | `/terms` | `apps/chef-admin/src/app/terms/page.tsx` | public | public-html | Public marketing, legal, discovery, or informational page. |
| Customer Web | `/` | `apps/web/src/app/page.tsx` | public | public-html | Public marketing, legal, discovery, or informational page. |
| Customer Web | `/about` | `apps/web/src/app/about/page.tsx` | public | public-html | Public marketing, legal, discovery, or informational page. |
| Customer Web | `/account` | `apps/web/src/app/account/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Customer Web | `/account/addresses` | `apps/web/src/app/account/addresses/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Customer Web | `/account/favorites` | `apps/web/src/app/account/favorites/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Customer Web | `/account/orders` | `apps/web/src/app/account/orders/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Customer Web | `/account/settings` | `apps/web/src/app/account/settings/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Customer Web | `/auth/forgot-password` | `apps/web/src/app/auth/forgot-password/page.tsx` | public-auth-entry | public-html | Public authentication entry page that creates or recovers a session. |
| Customer Web | `/auth/login` | `apps/web/src/app/auth/login/page.tsx` | public-auth-entry | public-html | Public authentication entry page that creates or recovers a session. |
| Customer Web | `/auth/signup` | `apps/web/src/app/auth/signup/page.tsx` | public-auth-entry | public-html | Public authentication entry page that creates or recovers a session. |
| Customer Web | `/cart` | `apps/web/src/app/cart/page.tsx` | public | public-html | Public marketing, legal, discovery, or informational page. |
| Customer Web | `/checkout` | `apps/web/src/app/checkout/page.tsx` | mixed-auth-dependent | public-html-with-auth-actions | Browsable shell where final workflow actions depend on authenticated user context. |
| Customer Web | `/chef-resources` | `apps/web/src/app/chef-resources/page.tsx` | public | public-html | Public marketing, legal, discovery, or informational page. |
| Customer Web | `/chef-signup` | `apps/web/src/app/chef-signup/page.tsx` | public | public-html | Public marketing, legal, discovery, or informational page. |
| Customer Web | `/chefs` | `apps/web/src/app/chefs/page.tsx` | public | public-html | Public marketing, legal, discovery, or informational page. |
| Customer Web | `/chefs/[slug]` | `apps/web/src/app/chefs/[slug]/page.tsx` | public | public-html | Public marketing, legal, discovery, or informational page. |
| Customer Web | `/contact` | `apps/web/src/app/contact/page.tsx` | public | public-html | Public marketing, legal, discovery, or informational page. |
| Customer Web | `/how-it-works` | `apps/web/src/app/how-it-works/page.tsx` | public | public-html | Public marketing, legal, discovery, or informational page. |
| Customer Web | `/maintenance` | `apps/web/src/app/maintenance/page.tsx` | public | public-html | Public marketing, legal, discovery, or informational page. |
| Customer Web | `/order-confirmation/[orderId]` | `apps/web/src/app/order-confirmation/[orderId]/page.tsx` | public | public-html | Public marketing, legal, discovery, or informational page. |
| Customer Web | `/orders/[id]/confirmation` | `apps/web/src/app/orders/[id]/confirmation/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Customer Web | `/privacy` | `apps/web/src/app/privacy/page.tsx` | public | public-html | Public marketing, legal, discovery, or informational page. |
| Customer Web | `/terms` | `apps/web/src/app/terms/page.tsx` | public | public-html | Public marketing, legal, discovery, or informational page. |
| Driver App | `/` | `apps/driver-app/src/app/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Driver App | `/auth/login` | `apps/driver-app/src/app/auth/login/page.tsx` | public-auth-entry | public-html | Public authentication entry page that creates or recovers a session. |
| Driver App | `/auth/signup` | `apps/driver-app/src/app/auth/signup/page.tsx` | public-auth-entry | public-html | Public authentication entry page that creates or recovers a session. |
| Driver App | `/delivery/[id]` | `apps/driver-app/src/app/delivery/[id]/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Driver App | `/earnings` | `apps/driver-app/src/app/earnings/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Driver App | `/history` | `apps/driver-app/src/app/history/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Driver App | `/privacy` | `apps/driver-app/src/app/privacy/page.tsx` | public | public-html | Public marketing, legal, discovery, or informational page. |
| Driver App | `/profile` | `apps/driver-app/src/app/profile/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Driver App | `/settings` | `apps/driver-app/src/app/settings/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Driver App | `/terms` | `apps/driver-app/src/app/terms/page.tsx` | public | public-html | Public marketing, legal, discovery, or informational page. |
| Ops Admin | `/` | `apps/ops-admin/src/app/page.tsx` | protected-redirect | redirect-or-login-guard | Root shim that redirects into a protected workspace. |
| Ops Admin | `/auth/login` | `apps/ops-admin/src/app/auth/login/page.tsx` | public-auth-entry | public-html | Public authentication entry page that creates or recovers a session. |
| Ops Admin | `/dashboard` | `apps/ops-admin/src/app/dashboard/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/activity` | `apps/ops-admin/src/app/dashboard/activity/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/analytics` | `apps/ops-admin/src/app/dashboard/analytics/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/announcements` | `apps/ops-admin/src/app/dashboard/announcements/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/automation` | `apps/ops-admin/src/app/dashboard/automation/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/chefs` | `apps/ops-admin/src/app/dashboard/chefs/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/chefs/[id]` | `apps/ops-admin/src/app/dashboard/chefs/[id]/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/chefs/approvals` | `apps/ops-admin/src/app/dashboard/chefs/approvals/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/compliance` | `apps/ops-admin/src/app/dashboard/compliance/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/customers` | `apps/ops-admin/src/app/dashboard/customers/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/customers/[id]` | `apps/ops-admin/src/app/dashboard/customers/[id]/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/deliveries` | `apps/ops-admin/src/app/dashboard/deliveries/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/deliveries/[id]` | `apps/ops-admin/src/app/dashboard/deliveries/[id]/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/dispatch` | `apps/ops-admin/src/app/dashboard/dispatch/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/drivers` | `apps/ops-admin/src/app/dashboard/drivers/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/drivers/[id]` | `apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/exceptions` | `apps/ops-admin/src/app/dashboard/exceptions/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/finance` | `apps/ops-admin/src/app/dashboard/finance/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/finance/accounts/chefs` | `apps/ops-admin/src/app/dashboard/finance/accounts/chefs/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/finance/accounts/chefs/[id]` | `apps/ops-admin/src/app/dashboard/finance/accounts/chefs/[id]/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/finance/accounts/drivers` | `apps/ops-admin/src/app/dashboard/finance/accounts/drivers/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/finance/accounts/drivers/[id]` | `apps/ops-admin/src/app/dashboard/finance/accounts/drivers/[id]/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/finance/instant-payouts` | `apps/ops-admin/src/app/dashboard/finance/instant-payouts/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/finance/payouts` | `apps/ops-admin/src/app/dashboard/finance/payouts/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/finance/payouts/[runId]` | `apps/ops-admin/src/app/dashboard/finance/payouts/[runId]/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/finance/reconciliation` | `apps/ops-admin/src/app/dashboard/finance/reconciliation/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/finance/refunds` | `apps/ops-admin/src/app/dashboard/finance/refunds/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/health` | `apps/ops-admin/src/app/dashboard/health/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/integrations` | `apps/ops-admin/src/app/dashboard/integrations/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/map` | `apps/ops-admin/src/app/dashboard/map/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/orders` | `apps/ops-admin/src/app/dashboard/orders/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/orders/[id]` | `apps/ops-admin/src/app/dashboard/orders/[id]/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/promos` | `apps/ops-admin/src/app/dashboard/promos/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/reports` | `apps/ops-admin/src/app/dashboard/reports/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/settings` | `apps/ops-admin/src/app/dashboard/settings/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/support` | `apps/ops-admin/src/app/dashboard/support/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/dashboard/team` | `apps/ops-admin/src/app/dashboard/team/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |
| Ops Admin | `/internal/command-center` | `apps/ops-admin/src/app/internal/command-center/page.tsx` | protected | login-guard | Application workspace page that requires an authenticated app user or redirects to login. |

## API Route Handler Classification

| App | Endpoint | File | Methods | Guard intent | Mutation class | Risk | Smoke bucket |
|---|---|---|---|---|---|---|---|
| Chef Admin | `/api/analytics` | `apps/chef-admin/src/app/api/analytics/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Chef Admin | `/api/auth/login` | `apps/chef-admin/src/app/api/auth/login/route.ts` | POST | public-auth-entry | mutating | medium | auth-entry-contract |
| Chef Admin | `/api/auth/signup` | `apps/chef-admin/src/app/api/auth/signup/route.ts` | POST | public-auth-entry | mutating | medium | auth-entry-contract |
| Chef Admin | `/api/health` | `apps/chef-admin/src/app/api/health/route.ts` | GET | public-read | read-only | low | public-json |
| Chef Admin | `/api/menu` | `apps/chef-admin/src/app/api/menu/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Chef Admin | `/api/menu/[id]` | `apps/chef-admin/src/app/api/menu/[id]/route.ts` | GET, PATCH, DELETE | protected-session | mixed | medium | authenticated-read |
| Chef Admin | `/api/menu/[id]/options` | `apps/chef-admin/src/app/api/menu/[id]/options/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Chef Admin | `/api/menu/[id]/options/[optionId]` | `apps/chef-admin/src/app/api/menu/[id]/options/[optionId]/route.ts` | PATCH, DELETE | protected-session | mutating | medium | negative-authz-contract-only |
| Chef Admin | `/api/menu/[id]/options/[optionId]/values` | `apps/chef-admin/src/app/api/menu/[id]/options/[optionId]/values/route.ts` | POST | protected-session | mutating | medium | negative-authz-contract-only |
| Chef Admin | `/api/menu/[id]/options/[optionId]/values/[valueId]` | `apps/chef-admin/src/app/api/menu/[id]/options/[optionId]/values/[valueId]/route.ts` | PATCH, DELETE | protected-session | mutating | medium | negative-authz-contract-only |
| Chef Admin | `/api/menu/categories` | `apps/chef-admin/src/app/api/menu/categories/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Chef Admin | `/api/orders` | `apps/chef-admin/src/app/api/orders/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Chef Admin | `/api/orders/[id]` | `apps/chef-admin/src/app/api/orders/[id]/route.ts` | GET, PATCH | protected-session | mixed | medium | authenticated-read |
| Chef Admin | `/api/payouts/request` | `apps/chef-admin/src/app/api/payouts/request/route.ts` | POST | protected-session | mutating | medium | negative-authz-contract-only |
| Chef Admin | `/api/payouts/setup` | `apps/chef-admin/src/app/api/payouts/setup/route.ts` | POST | protected-session | mutating | medium | negative-authz-contract-only |
| Chef Admin | `/api/profile` | `apps/chef-admin/src/app/api/profile/route.ts` | GET, PATCH | protected-session | mixed | medium | authenticated-read |
| Chef Admin | `/api/storefront` | `apps/chef-admin/src/app/api/storefront/route.ts` | GET, POST, PATCH | protected-session | mixed | medium | authenticated-read |
| Chef Admin | `/api/storefront/availability` | `apps/chef-admin/src/app/api/storefront/availability/route.ts` | GET, PUT | protected-session | mixed | medium | authenticated-read |
| Chef Admin | `/api/upload` | `apps/chef-admin/src/app/api/upload/route.ts` | POST | protected-session | mutating | medium | negative-authz-contract-only |
| Customer Web | `/api/addresses` | `apps/web/src/app/api/addresses/route.ts` | GET, POST, PATCH, DELETE | protected-session | mixed | medium | authenticated-read |
| Customer Web | `/api/auth/login` | `apps/web/src/app/api/auth/login/route.ts` | POST | public-auth-entry | mutating | medium | auth-entry-contract |
| Customer Web | `/api/auth/signup` | `apps/web/src/app/api/auth/signup/route.ts` | POST | public-auth-entry | mutating | medium | auth-entry-contract |
| Customer Web | `/api/cart` | `apps/web/src/app/api/cart/route.ts` | GET, POST, PATCH, DELETE | protected-session | mixed | medium | authenticated-read |
| Customer Web | `/api/checkout` | `apps/web/src/app/api/checkout/route.ts` | POST | protected-session | mutating | medium | negative-authz-contract-only |
| Customer Web | `/api/checkout/quote` | `apps/web/src/app/api/checkout/quote/route.ts` | POST | protected-session | mutating | medium | negative-authz-contract-only |
| Customer Web | `/api/eta` | `apps/web/src/app/api/eta/route.ts` | GET | public-read | read-only | low | public-json |
| Customer Web | `/api/favorites` | `apps/web/src/app/api/favorites/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Customer Web | `/api/health` | `apps/web/src/app/api/health/route.ts` | GET | public-read | read-only | low | public-json |
| Customer Web | `/api/loyalty` | `apps/web/src/app/api/loyalty/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Customer Web | `/api/notifications` | `apps/web/src/app/api/notifications/route.ts` | GET, POST, PATCH | protected-session | mixed | medium | authenticated-read |
| Customer Web | `/api/notifications/subscribe` | `apps/web/src/app/api/notifications/subscribe/route.ts` | POST, DELETE | protected-session | mutating | medium | negative-authz-contract-only |
| Customer Web | `/api/orders` | `apps/web/src/app/api/orders/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Customer Web | `/api/orders/[id]` | `apps/web/src/app/api/orders/[id]/route.ts` | GET, PATCH | protected-session | mixed | medium | authenticated-read |
| Customer Web | `/api/orders/[id]/cancel` | `apps/web/src/app/api/orders/[id]/cancel/route.ts` | POST | protected-session | mutating | medium | negative-authz-contract-only |
| Customer Web | `/api/orders/[id]/payment-status` | `apps/web/src/app/api/orders/[id]/payment-status/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Customer Web | `/api/orders/[id]/reorder` | `apps/web/src/app/api/orders/[id]/reorder/route.ts` | POST | protected-session | mutating | medium | negative-authz-contract-only |
| Customer Web | `/api/payment-methods` | `apps/web/src/app/api/payment-methods/route.ts` | GET, DELETE | protected-session | mixed | medium | authenticated-read |
| Customer Web | `/api/profile` | `apps/web/src/app/api/profile/route.ts` | GET, PATCH | protected-session | mixed | medium | authenticated-read |
| Customer Web | `/api/promos/validate` | `apps/web/src/app/api/promos/validate/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Customer Web | `/api/referrals` | `apps/web/src/app/api/referrals/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Customer Web | `/api/referrals/apply` | `apps/web/src/app/api/referrals/apply/route.ts` | POST | protected-session | mutating | medium | negative-authz-contract-only |
| Customer Web | `/api/reviews` | `apps/web/src/app/api/reviews/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Customer Web | `/api/storefronts` | `apps/web/src/app/api/storefronts/route.ts` | GET | public-read | read-only | low | public-json |
| Customer Web | `/api/storefronts/[id]` | `apps/web/src/app/api/storefronts/[id]/route.ts` | GET | public-read | read-only | low | public-json |
| Customer Web | `/api/storefronts/[id]/menu` | `apps/web/src/app/api/storefronts/[id]/menu/route.ts` | GET | public-read | read-only | low | public-json |
| Customer Web | `/api/support` | `apps/web/src/app/api/support/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Customer Web | `/api/support/tickets` | `apps/web/src/app/api/support/tickets/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Customer Web | `/api/support/tickets/[id]` | `apps/web/src/app/api/support/tickets/[id]/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Customer Web | `/api/upload` | `apps/web/src/app/api/upload/route.ts` | POST | protected-session | mutating | medium | negative-authz-contract-only |
| Customer Web | `/api/webhooks/stripe` | `apps/web/src/app/api/webhooks/stripe/route.ts` | POST | signature-guarded | mutating | high | signature-contract-only |
| Driver App | `/api/auth/login` | `apps/driver-app/src/app/api/auth/login/route.ts` | POST | public-auth-entry | mutating | medium | auth-entry-contract |
| Driver App | `/api/auth/logout` | `apps/driver-app/src/app/api/auth/logout/route.ts` | POST | public-auth-entry | mutating | medium | auth-entry-contract |
| Driver App | `/api/auth/signup` | `apps/driver-app/src/app/api/auth/signup/route.ts` | POST | public-auth-entry | mutating | medium | auth-entry-contract |
| Driver App | `/api/deliveries` | `apps/driver-app/src/app/api/deliveries/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Driver App | `/api/deliveries/[id]` | `apps/driver-app/src/app/api/deliveries/[id]/route.ts` | GET, PATCH | protected-session | mixed | medium | authenticated-read |
| Driver App | `/api/deliveries/[id]/issue` | `apps/driver-app/src/app/api/deliveries/[id]/issue/route.ts` | POST | protected-session | mutating | medium | negative-authz-contract-only |
| Driver App | `/api/deliveries/[id]/proof` | `apps/driver-app/src/app/api/deliveries/[id]/proof/route.ts` | POST | protected-session | mutating | medium | negative-authz-contract-only |
| Driver App | `/api/driver` | `apps/driver-app/src/app/api/driver/route.ts` | GET, PATCH | protected-session | mixed | medium | authenticated-read |
| Driver App | `/api/driver/presence` | `apps/driver-app/src/app/api/driver/presence/route.ts` | GET, PATCH | protected-session | mixed | medium | authenticated-read |
| Driver App | `/api/earnings` | `apps/driver-app/src/app/api/earnings/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Driver App | `/api/health` | `apps/driver-app/src/app/api/health/route.ts` | GET | public-read | read-only | low | public-json |
| Driver App | `/api/location` | `apps/driver-app/src/app/api/location/route.ts` | POST | protected-session | mutating | medium | negative-authz-contract-only |
| Driver App | `/api/offers` | `apps/driver-app/src/app/api/offers/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Driver App | `/api/payouts/instant` | `apps/driver-app/src/app/api/payouts/instant/route.ts` | POST | protected-session | mutating | medium | negative-authz-contract-only |
| Driver App | `/api/payouts/setup` | `apps/driver-app/src/app/api/payouts/setup/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Driver App | `/api/upload` | `apps/driver-app/src/app/api/upload/route.ts` | POST | protected-session | mutating | medium | negative-authz-contract-only |
| Ops Admin | `/api/analytics` | `apps/ops-admin/src/app/api/analytics/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Ops Admin | `/api/analytics/trends` | `apps/ops-admin/src/app/api/analytics/trends/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Ops Admin | `/api/announcements` | `apps/ops-admin/src/app/api/announcements/route.ts` | POST | protected-session | mutating | medium | negative-authz-contract-only |
| Ops Admin | `/api/audit/recent` | `apps/ops-admin/src/app/api/audit/recent/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Ops Admin | `/api/auth/login` | `apps/ops-admin/src/app/api/auth/login/route.ts` | POST | public-auth-entry | mutating | medium | auth-entry-contract |
| Ops Admin | `/api/chefs` | `apps/ops-admin/src/app/api/chefs/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Ops Admin | `/api/chefs/[id]` | `apps/ops-admin/src/app/api/chefs/[id]/route.ts` | PATCH | protected-session | mutating | medium | negative-authz-contract-only |
| Ops Admin | `/api/cron/expired-offers` | `apps/ops-admin/src/app/api/cron/expired-offers/route.ts` | GET, POST | token-guarded | mixed | high | token-contract-only |
| Ops Admin | `/api/cron/payouts-chef-preview` | `apps/ops-admin/src/app/api/cron/payouts-chef-preview/route.ts` | GET, POST | token-guarded | mixed | high | token-contract-only |
| Ops Admin | `/api/cron/payouts-driver-preview` | `apps/ops-admin/src/app/api/cron/payouts-driver-preview/route.ts` | GET, POST | token-guarded | mixed | high | token-contract-only |
| Ops Admin | `/api/cron/reconciliation-daily` | `apps/ops-admin/src/app/api/cron/reconciliation-daily/route.ts` | GET, POST | token-guarded | mixed | high | token-contract-only |
| Ops Admin | `/api/cron/sla-tick` | `apps/ops-admin/src/app/api/cron/sla-tick/route.ts` | GET, POST | token-guarded | mixed | high | token-contract-only |
| Ops Admin | `/api/customers` | `apps/ops-admin/src/app/api/customers/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Ops Admin | `/api/customers/[id]/notify` | `apps/ops-admin/src/app/api/customers/[id]/notify/route.ts` | POST | protected-session | mutating | medium | negative-authz-contract-only |
| Ops Admin | `/api/deliveries` | `apps/ops-admin/src/app/api/deliveries/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Ops Admin | `/api/deliveries/[id]` | `apps/ops-admin/src/app/api/deliveries/[id]/route.ts` | PATCH | protected-session | mutating | medium | negative-authz-contract-only |
| Ops Admin | `/api/drivers` | `apps/ops-admin/src/app/api/drivers/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Ops Admin | `/api/drivers/[id]` | `apps/ops-admin/src/app/api/drivers/[id]/route.ts` | PATCH | protected-session | mutating | medium | negative-authz-contract-only |
| Ops Admin | `/api/engine/dashboard` | `apps/ops-admin/src/app/api/engine/dashboard/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Ops Admin | `/api/engine/dispatch` | `apps/ops-admin/src/app/api/engine/dispatch/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Ops Admin | `/api/engine/dispatch/offer-history` | `apps/ops-admin/src/app/api/engine/dispatch/offer-history/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Ops Admin | `/api/engine/exceptions` | `apps/ops-admin/src/app/api/engine/exceptions/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Ops Admin | `/api/engine/exceptions/[id]` | `apps/ops-admin/src/app/api/engine/exceptions/[id]/route.ts` | GET, PATCH | protected-session | mixed | medium | authenticated-read |
| Ops Admin | `/api/engine/finance` | `apps/ops-admin/src/app/api/engine/finance/route.ts` | GET, POST | protected-session | mixed | high | authenticated-read |
| Ops Admin | `/api/engine/health` | `apps/ops-admin/src/app/api/engine/health/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Ops Admin | `/api/engine/maintenance` | `apps/ops-admin/src/app/api/engine/maintenance/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Ops Admin | `/api/engine/orders/[id]` | `apps/ops-admin/src/app/api/engine/orders/[id]/route.ts` | GET, PATCH | protected-session | mixed | medium | authenticated-read |
| Ops Admin | `/api/engine/payouts` | `apps/ops-admin/src/app/api/engine/payouts/route.ts` | GET, POST | protected-session | mixed | high | authenticated-read |
| Ops Admin | `/api/engine/payouts/execute` | `apps/ops-admin/src/app/api/engine/payouts/execute/route.ts` | POST | protected-session | mutating | high | negative-authz-contract-only |
| Ops Admin | `/api/engine/payouts/instant` | `apps/ops-admin/src/app/api/engine/payouts/instant/route.ts` | GET | protected-session | read-only | high | authenticated-read |
| Ops Admin | `/api/engine/payouts/instant/[id]` | `apps/ops-admin/src/app/api/engine/payouts/instant/[id]/route.ts` | POST, DELETE | protected-session | mutating | high | negative-authz-contract-only |
| Ops Admin | `/api/engine/payouts/preview` | `apps/ops-admin/src/app/api/engine/payouts/preview/route.ts` | POST | protected-session | mutating | high | negative-authz-contract-only |
| Ops Admin | `/api/engine/processors/expired-offers` | `apps/ops-admin/src/app/api/engine/processors/expired-offers/route.ts` | GET, POST | token-guarded | mixed | high | token-contract-only |
| Ops Admin | `/api/engine/processors/sla` | `apps/ops-admin/src/app/api/engine/processors/sla/route.ts` | GET, POST | token-guarded | mixed | high | token-contract-only |
| Ops Admin | `/api/engine/reconciliation` | `apps/ops-admin/src/app/api/engine/reconciliation/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Ops Admin | `/api/engine/refunds` | `apps/ops-admin/src/app/api/engine/refunds/route.ts` | GET, POST | protected-session | mixed | high | authenticated-read |
| Ops Admin | `/api/engine/rules` | `apps/ops-admin/src/app/api/engine/rules/route.ts` | GET, PATCH | protected-session | mixed | medium | authenticated-read |
| Ops Admin | `/api/engine/settings` | `apps/ops-admin/src/app/api/engine/settings/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Ops Admin | `/api/engine/storefronts/[id]` | `apps/ops-admin/src/app/api/engine/storefronts/[id]/route.ts` | GET, PATCH | protected-session | mixed | medium | authenticated-read |
| Ops Admin | `/api/export` | `apps/ops-admin/src/app/api/export/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Ops Admin | `/api/fixtures/reset` | `apps/ops-admin/src/app/api/fixtures/reset/route.ts` | POST | fixture-only | mutating | high | fixture-contract-only |
| Ops Admin | `/api/health` | `apps/ops-admin/src/app/api/health/route.ts` | GET | public-read | read-only | low | public-json |
| Ops Admin | `/api/internal/command-center/change-requests` | `apps/ops-admin/src/app/api/internal/command-center/change-requests/route.ts` | GET, POST, PATCH | command-center-guarded | mixed | high | command-center-contract-only |
| Ops Admin | `/api/ops/live-board` | `apps/ops-admin/src/app/api/ops/live-board/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Ops Admin | `/api/orders` | `apps/ops-admin/src/app/api/orders/route.ts` | GET | protected-session | read-only | low | authenticated-read |
| Ops Admin | `/api/orders/[id]` | `apps/ops-admin/src/app/api/orders/[id]/route.ts` | GET, PATCH | protected-session | mixed | medium | authenticated-read |
| Ops Admin | `/api/orders/[id]/refund` | `apps/ops-admin/src/app/api/orders/[id]/refund/route.ts` | POST | protected-session | mutating | high | negative-authz-contract-only |
| Ops Admin | `/api/promos` | `apps/ops-admin/src/app/api/promos/route.ts` | GET, POST, PATCH, DELETE | protected-session | mixed | medium | authenticated-read |
| Ops Admin | `/api/stripe/webhook` | `apps/ops-admin/src/app/api/stripe/webhook/route.ts` | POST | signature-guarded | mutating | high | signature-contract-only |
| Ops Admin | `/api/support` | `apps/ops-admin/src/app/api/support/route.ts` | GET, POST | protected-session | mixed | medium | authenticated-read |
| Ops Admin | `/api/support/[id]` | `apps/ops-admin/src/app/api/support/[id]/route.ts` | PATCH | protected-session | mutating | medium | negative-authz-contract-only |
| Ops Admin | `/api/surge` | `apps/ops-admin/src/app/api/surge/route.ts` | GET, PATCH | protected-session | mixed | medium | authenticated-read |
| Ops Admin | `/api/team` | `apps/ops-admin/src/app/api/team/route.ts` | GET, POST, PATCH | protected-session | mixed | high | authenticated-read |
| Ops Admin | `/internal/command-center/docs/[...docPath]` | `apps/ops-admin/src/app/internal/command-center/docs/[...docPath]/route.ts` | GET | internal-docs | read-only | high | internal-docs-contract |

## Failures

None found.
