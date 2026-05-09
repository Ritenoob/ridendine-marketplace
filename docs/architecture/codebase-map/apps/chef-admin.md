# Chef Admin Standalone Map

## Surface

- Domain: `chef.ridendine.ca`
- Local development URL: `http://localhost:3001`
- Primary users: Chefs
- Code root: `apps/chef-admin`
- App router root: `apps/chef-admin/src/app`
- Purpose: Chef storefront management, menu, availability, orders, kitchen operations, analytics, payouts, profile, and reviews.

## Status Summary

- Page routes: 13 total, 9 WIRED, 4 PARTIAL, 0 MISSING.
- API route files: 14 total, 3 WIRED, 10 PARTIAL.
- Internal link/API references: 34 total, 4 BROKEN, 1 UNKNOWN_DYNAMIC.

## Standalone App Diagram

```mermaid
flowchart TB
  classDef app fill:#e85d26,stroke:#111827,color:#ffffff
  classDef api fill:#dbeafe,stroke:#2563eb,color:#172033
  classDef data fill:#dcfce7,stroke:#16a34a,color:#172033
  classDef warn fill:#fef3c7,stroke:#f59e0b,color:#172033
  App["Chef Admin<br/>chef.ridendine.ca"]:::app
  Pages["13 pages"]:::api
  APIs["14 API route files"]:::api
  Shared["Shared packages"]:::data
  DB["Supabase tables/RPCs"]:::data
  External["Stripe / routing / notifications where detected"]:::warn
  App --> Pages
  Pages --> APIs
  APIs --> Shared
  APIs --> DB
  APIs --> External
```

## Pages

| Status | Route | Page file | Layout | Auth | Tables | APIs called | Components |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PARTIAL | `/auth/login` | [apps/chef-admin/src/app/auth/login/page.tsx](../../../../apps/chef-admin/src/app/auth/login/page.tsx) | [apps/chef-admin/src/app/auth/layout.tsx](../../../../apps/chef-admin/src/app/auth/layout.tsx) | Public | None detected | None detected | `Button`, `Input` |
| PARTIAL | `/auth/signup` | [apps/chef-admin/src/app/auth/signup/page.tsx](../../../../apps/chef-admin/src/app/auth/signup/page.tsx) | [apps/chef-admin/src/app/auth/layout.tsx](../../../../apps/chef-admin/src/app/auth/layout.tsx) | Public | None detected | `/api/auth/signup` | `Button`, `Input`, `PasswordStrength` |
| PARTIAL | `/dashboard/analytics` | [apps/chef-admin/src/app/dashboard/analytics/page.tsx](../../../../apps/chef-admin/src/app/dashboard/analytics/page.tsx) | [apps/chef-admin/src/app/dashboard/layout.tsx](../../../../apps/chef-admin/src/app/dashboard/layout.tsx) | Undetected | None detected | `/api/analytics?period=${p}` | `Card` |
| WIRED | `/dashboard/availability` | [apps/chef-admin/src/app/dashboard/availability/page.tsx](../../../../apps/chef-admin/src/app/dashboard/availability/page.tsx) | [apps/chef-admin/src/app/dashboard/layout.tsx](../../../../apps/chef-admin/src/app/dashboard/layout.tsx) | Undetected | None detected | None detected | `@/components/availability/weekly-availability-form` |
| WIRED | `/dashboard/menu` | [apps/chef-admin/src/app/dashboard/menu/page.tsx](../../../../apps/chef-admin/src/app/dashboard/menu/page.tsx) | [apps/chef-admin/src/app/dashboard/layout.tsx](../../../../apps/chef-admin/src/app/dashboard/layout.tsx) | Detected | `chef_profiles` | None detected | `@/components/menu/menu-list` |
| WIRED | `/dashboard/orders/:id` | [apps/chef-admin/src/app/dashboard/orders/[id]/page.tsx](../../../../apps/chef-admin/src/app/dashboard/orders/[id]/page.tsx) | [apps/chef-admin/src/app/dashboard/layout.tsx](../../../../apps/chef-admin/src/app/dashboard/layout.tsx) | Detected | `chef_profiles`, `chef_storefronts`, `orders` | None detected | `Badge`, `Card` |
| WIRED | `/dashboard/orders` | [apps/chef-admin/src/app/dashboard/orders/page.tsx](../../../../apps/chef-admin/src/app/dashboard/orders/page.tsx) | [apps/chef-admin/src/app/dashboard/layout.tsx](../../../../apps/chef-admin/src/app/dashboard/layout.tsx) | Detected | `chef_profiles`, `orders` | None detected | `@/components/orders/orders-list` |
| WIRED | `/dashboard` | [apps/chef-admin/src/app/dashboard/page.tsx](../../../../apps/chef-admin/src/app/dashboard/page.tsx) | [apps/chef-admin/src/app/dashboard/layout.tsx](../../../../apps/chef-admin/src/app/dashboard/layout.tsx) | Detected | `chef_availability`, `chef_payout_accounts`, `chef_profiles`, `customers` | None detected | None detected |
| WIRED | `/dashboard/payouts` | [apps/chef-admin/src/app/dashboard/payouts/page.tsx](../../../../apps/chef-admin/src/app/dashboard/payouts/page.tsx) | [apps/chef-admin/src/app/dashboard/layout.tsx](../../../../apps/chef-admin/src/app/dashboard/layout.tsx) | Detected | `chef_payout_accounts`, `chef_payouts`, `chef_profiles`, `chef_storefronts`, `orders` | `/api/payouts/request`, `/api/payouts/setup` | `Badge`, `Button`, `Card` |
| PARTIAL | `/dashboard/reviews` | [apps/chef-admin/src/app/dashboard/reviews/page.tsx](../../../../apps/chef-admin/src/app/dashboard/reviews/page.tsx) | [apps/chef-admin/src/app/dashboard/layout.tsx](../../../../apps/chef-admin/src/app/dashboard/layout.tsx) | Detected | `chef_profiles`, `chef_storefronts`, `reviews` | None detected | `Badge`, `Button`, `Card` |
| WIRED | `/dashboard/settings` | [apps/chef-admin/src/app/dashboard/settings/page.tsx](../../../../apps/chef-admin/src/app/dashboard/settings/page.tsx) | [apps/chef-admin/src/app/dashboard/layout.tsx](../../../../apps/chef-admin/src/app/dashboard/layout.tsx) | Detected | None detected | None detected | `@/components/profile/profile-form`, `@/components/settings/notification-preferences` |
| WIRED | `/dashboard/storefront` | [apps/chef-admin/src/app/dashboard/storefront/page.tsx](../../../../apps/chef-admin/src/app/dashboard/storefront/page.tsx) | [apps/chef-admin/src/app/dashboard/layout.tsx](../../../../apps/chef-admin/src/app/dashboard/layout.tsx) | Detected | `chef_profiles` | None detected | `@/components/storefront/storefront-form`, `@/components/storefront/storefront-setup-form`, `EmptyState` |
| WIRED | `/` | [apps/chef-admin/src/app/page.tsx](../../../../apps/chef-admin/src/app/page.tsx) | [apps/chef-admin/src/app/layout.tsx](../../../../apps/chef-admin/src/app/layout.tsx) | Public | None detected | None detected | None detected |

## APIs

| Status | Endpoint | Methods | File | Auth | Tables | Packages | External |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PARTIAL | `/api/analytics` | GET | [apps/chef-admin/src/app/api/analytics/route.ts](../../../../apps/chef-admin/src/app/api/analytics/route.ts) | Undetected | `order_items`, `orders`, `reviews` | @ridendine/db | None detected |
| WIRED | `/api/auth/signup` | POST | [apps/chef-admin/src/app/api/auth/signup/route.ts](../../../../apps/chef-admin/src/app/api/auth/signup/route.ts) | Detected | None detected | @ridendine/db, @ridendine/utils, @ridendine/validation | Supabase |
| PARTIAL | `/api/health` | GET | [apps/chef-admin/src/app/api/health/route.ts](../../../../apps/chef-admin/src/app/api/health/route.ts) | Undetected | `chef_profiles` | @ridendine/db, @ridendine/utils | Stripe, Supabase |
| PARTIAL | `/api/menu/:id` | DELETE, GET, PATCH | [apps/chef-admin/src/app/api/menu/[id]/route.ts](../../../../apps/chef-admin/src/app/api/menu/[id]/route.ts) | Undetected | None detected | @ridendine/db | Supabase |
| PARTIAL | `/api/menu/categories` | GET, POST | [apps/chef-admin/src/app/api/menu/categories/route.ts](../../../../apps/chef-admin/src/app/api/menu/categories/route.ts) | Undetected | None detected | @ridendine/db | Supabase |
| PARTIAL | `/api/menu` | GET, POST | [apps/chef-admin/src/app/api/menu/route.ts](../../../../apps/chef-admin/src/app/api/menu/route.ts) | Undetected | None detected | @ridendine/db | Supabase |
| PARTIAL | `/api/orders/:id` | GET, PATCH | [apps/chef-admin/src/app/api/orders/[id]/route.ts](../../../../apps/chef-admin/src/app/api/orders/[id]/route.ts) | Undetected | `orders` | @ridendine/db, @ridendine/types, @ridendine/utils | None detected |
| PARTIAL | `/api/orders` | GET | [apps/chef-admin/src/app/api/orders/route.ts](../../../../apps/chef-admin/src/app/api/orders/route.ts) | Undetected | `customer_addresses`, `customers`, `orders` | @ridendine/db | None detected |
| MISSING | `/api/payouts/request` | POST | [apps/chef-admin/src/app/api/payouts/request/route.ts](../../../../apps/chef-admin/src/app/api/payouts/request/route.ts) | Undetected | None detected | None detected | None detected |
| WIRED | `/api/payouts/setup` | POST | [apps/chef-admin/src/app/api/payouts/setup/route.ts](../../../../apps/chef-admin/src/app/api/payouts/setup/route.ts) | Detected | `chef_payout_accounts`, `chef_profiles` | @ridendine/db, @ridendine/engine | Stripe, Supabase |
| WIRED | `/api/profile` | GET, PATCH | [apps/chef-admin/src/app/api/profile/route.ts](../../../../apps/chef-admin/src/app/api/profile/route.ts) | Detected | None detected | @ridendine/db | Supabase |
| PARTIAL | `/api/storefront/availability` | GET, PUT | [apps/chef-admin/src/app/api/storefront/availability/route.ts](../../../../apps/chef-admin/src/app/api/storefront/availability/route.ts) | Undetected | `chef_availability` | @ridendine/db | None detected |
| PARTIAL | `/api/storefront` | GET, PATCH, POST | [apps/chef-admin/src/app/api/storefront/route.ts](../../../../apps/chef-admin/src/app/api/storefront/route.ts) | Undetected | `chef_kitchens`, `chef_storefronts` | @ridendine/db | Supabase |
| PARTIAL | `/api/upload` | POST | [apps/chef-admin/src/app/api/upload/route.ts](../../../../apps/chef-admin/src/app/api/upload/route.ts) | Undetected | None detected | @ridendine/db, @ridendine/utils | Supabase |

## Broken Or Unproven Links

| Status | Source file | Kind | Target | Notes |
| --- | --- | --- | --- | --- |
| BROKEN | [apps/chef-admin/src/app/auth/login/page.tsx](../../../../apps/chef-admin/src/app/auth/login/page.tsx) | href | `/auth/forgot-password` | No matching page route file detected |
| BROKEN | [apps/chef-admin/src/app/auth/signup/page.tsx](../../../../apps/chef-admin/src/app/auth/signup/page.tsx) | href | `/privacy` | No matching page route file detected |
| BROKEN | [apps/chef-admin/src/app/auth/signup/page.tsx](../../../../apps/chef-admin/src/app/auth/signup/page.tsx) | href | `/terms` | No matching page route file detected |
| BROKEN | [apps/chef-admin/src/app/dashboard/storefront/page.tsx](../../../../apps/chef-admin/src/app/dashboard/storefront/page.tsx) | href | `/dashboard/storefront/setup` | No matching page route file detected |
| UNKNOWN_DYNAMIC | [apps/chef-admin/src/app/dashboard/page.tsx](../../../../apps/chef-admin/src/app/dashboard/page.tsx) | href | `/chefs/${storefront.slug}` | No matching page route file detected |
