# Wiring Contract Registry

Generated from `scripts/wiring/wiring-contracts.cjs`.

These contracts document route and API intent that static text scanning cannot reliably infer. They do not replace runtime tests; they keep generated wiring maps honest about known public, protected, health, and marketplace-read surfaces.

## Page Contracts

| Page file | Auth intent | Data/API intent | APIs | Tables | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| [apps/web/src/app/account/addresses/page.tsx](../../apps/web/src/app/account/addresses/page.tsx) | Customer protected | Customer address management via account layout and address APIs | `/api/addresses`, `/api/addresses?id=${id}` | `customer_addresses` | WIRED |  |
| [apps/web/src/app/account/orders/page.tsx](../../apps/web/src/app/account/orders/page.tsx) | Customer protected | Customer order history and reorder flow via cart/order APIs | `/api/cart`, `/api/orders`, `/api/orders/${order.id}` | `orders`, `order_items` | WIRED |  |
| [apps/web/src/app/account/settings/page.tsx](../../apps/web/src/app/account/settings/page.tsx) | Customer protected | Customer profile settings via profile API | `/api/profile` | `customers` | WIRED |  |
| [apps/web/src/app/auth/forgot-password/page.tsx](../../apps/web/src/app/auth/forgot-password/page.tsx) | Public auth | Public password reset request surface | None | None | WIRED |  |
| [apps/web/src/app/auth/login/page.tsx](../../apps/web/src/app/auth/login/page.tsx) | Public auth | Public customer login surface wired to app-owned login API | `/api/auth/login` | None | WIRED |  |
| [apps/web/src/app/auth/signup/page.tsx](../../apps/web/src/app/auth/signup/page.tsx) | Public auth | Public customer signup surface with referral application path | `/api/referrals/apply` | None | WIRED |  |
| [apps/web/src/app/checkout/page.tsx](../../apps/web/src/app/checkout/page.tsx) | Customer protected | Customer checkout surface with addresses, cart, and checkout APIs | `/api/addresses`, `/api/cart?storefrontId=${storefrontId}`, `/api/checkout` | `carts`, `orders` | WIRED |  |
| [apps/web/src/app/chef-signup/page.tsx](../../apps/web/src/app/chef-signup/page.tsx) | Public marketplace | Public chef acquisition and signup information page | None | None | WIRED |  |
| [apps/web/src/app/contact/page.tsx](../../apps/web/src/app/contact/page.tsx) | Public support | Public contact form wired to support API | `/api/support` | `support_tickets` | WIRED |  |
| [apps/ops-admin/src/app/auth/login/page.tsx](../../apps/ops-admin/src/app/auth/login/page.tsx) | Public auth | Public ops login surface wired to app-owned login API | `/api/auth/login` | None | WIRED |  |
| [apps/ops-admin/src/app/dashboard/analytics/page.tsx](../../apps/ops-admin/src/app/dashboard/analytics/page.tsx) | Ops protected | Ops analytics dashboard reading operational metrics | None | `driver_presence`, `drivers`, `orders` | WIRED |  |
| [apps/ops-admin/src/app/dashboard/announcements/page.tsx](../../apps/ops-admin/src/app/dashboard/announcements/page.tsx) | Ops protected | Ops announcements management surface | `/api/announcements` | None | WIRED |  |
| [apps/ops-admin/src/app/dashboard/automation/page.tsx](../../apps/ops-admin/src/app/dashboard/automation/page.tsx) | Ops protected | Ops automation rules surface | `/api/engine/rules` | None | WIRED |  |
| [apps/ops-admin/src/app/dashboard/chefs/approvals/page.tsx](../../apps/ops-admin/src/app/dashboard/chefs/approvals/page.tsx) | Ops protected | Ops chef approval workflow surface | `/api/chefs`, `/api/chefs/${id}` | `chef_profiles` | WIRED |  |
| [apps/ops-admin/src/app/dashboard/customers/page.tsx](../../apps/ops-admin/src/app/dashboard/customers/page.tsx) | Ops protected | Ops customer management surface | `/api/customers` | `customers` | WIRED |  |
| [apps/ops-admin/src/app/dashboard/deliveries/page.tsx](../../apps/ops-admin/src/app/dashboard/deliveries/page.tsx) | Ops protected | Ops delivery management surface | None | `deliveries`, `drivers`, `orders` | WIRED |  |
| [apps/ops-admin/src/app/dashboard/dispatch/page.tsx](../../apps/ops-admin/src/app/dashboard/dispatch/page.tsx) | Ops protected | Ops dispatch control surface | `/api/engine/dispatch`, `/api/engine/dispatch/offer-history` | `delivery_offers`, `deliveries` | WIRED |  |
| [apps/ops-admin/src/app/dashboard/orders/page.tsx](../../apps/ops-admin/src/app/dashboard/orders/page.tsx) | Ops protected | Ops order search and action surface | `/api/engine/orders/${orderId}`, `/api/orders` | `orders` | WIRED |  |
| [apps/ops-admin/src/app/dashboard/promos/page.tsx](../../apps/ops-admin/src/app/dashboard/promos/page.tsx) | Ops protected | Ops promotions management surface | None | `promo_codes` | WIRED |  |
| [apps/ops-admin/src/app/dashboard/support/page.tsx](../../apps/ops-admin/src/app/dashboard/support/page.tsx) | Ops protected | Ops support case surface | None | `support_tickets` | WIRED |  |
| [apps/ops-admin/src/app/dashboard/team/page.tsx](../../apps/ops-admin/src/app/dashboard/team/page.tsx) | Ops protected | Ops team and platform-user management surface | None | `platform_users` | WIRED |  |
| [apps/chef-admin/src/app/auth/forgot-password/page.tsx](../../apps/chef-admin/src/app/auth/forgot-password/page.tsx) | Public auth | Public chef password reset request surface | None | None | WIRED |  |
| [apps/chef-admin/src/app/auth/login/page.tsx](../../apps/chef-admin/src/app/auth/login/page.tsx) | Public auth | Public chef login surface using client-side Supabase auth | None | None | WIRED |  |
| [apps/chef-admin/src/app/auth/signup/page.tsx](../../apps/chef-admin/src/app/auth/signup/page.tsx) | Public auth | Public chef signup surface wired to chef signup API | `/api/auth/signup` | None | WIRED |  |
| [apps/chef-admin/src/app/dashboard/analytics/page.tsx](../../apps/chef-admin/src/app/dashboard/analytics/page.tsx) | Chef protected | Chef analytics dashboard wired to analytics API | `/api/analytics?period=${p}` | `orders`, `chef_storefronts` | WIRED |  |
| [apps/chef-admin/src/app/dashboard/reviews/page.tsx](../../apps/chef-admin/src/app/dashboard/reviews/page.tsx) | Chef protected | Chef review management surface | None | `chef_profiles`, `chef_storefronts`, `reviews` | WIRED |  |
| [apps/driver-app/src/app/auth/login/page.tsx](../../apps/driver-app/src/app/auth/login/page.tsx) | Public auth | Public driver login surface wired to app-owned login API | `/api/auth/login` | None | WIRED |  |
| [apps/driver-app/src/app/auth/signup/page.tsx](../../apps/driver-app/src/app/auth/signup/page.tsx) | Public auth | Public driver signup surface wired to driver signup API | `/api/auth/signup` | None | WIRED |  |

## API Contracts

| API file | Auth intent | Request contract | Response contract | Tables | External | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [apps/web/src/app/api/eta/route.ts](../../apps/web/src/app/api/eta/route.ts) | Public marketplace read | Query params: storefrontId and addressId are required | JSON ETA window only; falls back to a safe default if routing fails | None | Routing provider | WIRED | Read-only customer ETA quote route; no address payload is returned. |
| [apps/web/src/app/api/health/route.ts](../../apps/web/src/app/api/health/route.ts) | Public health check | No request body | JSON operational health payload | `chef_storefronts` | Stripe, Supabase | WIRED |  |
| [apps/web/src/app/api/storefronts/route.ts](../../apps/web/src/app/api/storefronts/route.ts) | Public marketplace read | Optional discovery query params: q, limit, offset, sortBy, cuisine, featured | JSON public storefront summaries | `chef_storefronts` | None | WIRED |  |
| [apps/web/src/app/api/storefronts/[id]/route.ts](../../apps/web/src/app/api/storefronts/[id]/route.ts) | Public marketplace read | Route param: storefront slug or id | JSON public storefront detail | `chef_storefronts` | None | WIRED |  |
| [apps/web/src/app/api/storefronts/[id]/menu/route.ts](../../apps/web/src/app/api/storefronts/[id]/menu/route.ts) | Public marketplace read | Route param: active storefront id | JSON public menu categories, available items, and item options | `chef_storefronts`, `menu_item_options`, `menu_items` | None | WIRED |  |
| [apps/ops-admin/src/app/api/health/route.ts](../../apps/ops-admin/src/app/api/health/route.ts) | Public health check | No request body | JSON ops operational health payload and table probes | `chef_profiles`, `customers`, `deliveries`, `driver_presence`, `drivers`, `orders` | Stripe, Supabase | WIRED |  |
| [apps/chef-admin/src/app/api/health/route.ts](../../apps/chef-admin/src/app/api/health/route.ts) | Public health check | No request body | JSON chef-admin operational health payload | `chef_profiles` | Stripe, Supabase | WIRED |  |
| [apps/chef-admin/src/app/api/storefront/route.ts](../../apps/chef-admin/src/app/api/storefront/route.ts) | Chef protected | GET has no body; POST/PATCH accept chef storefront settings | JSON chef storefront payload or validation/error envelope | `chef_kitchens`, `chef_storefronts` | Supabase | WIRED |  |
| [apps/driver-app/src/app/api/health/route.ts](../../apps/driver-app/src/app/api/health/route.ts) | Public health check | No request body | JSON driver-app operational health payload | `drivers` | Stripe, Supabase | WIRED |  |
