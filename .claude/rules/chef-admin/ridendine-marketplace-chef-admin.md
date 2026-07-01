---
paths:
  - "apps/chef-admin/**"
---

# Chef Admin Rules

## Routes

Always consider these routes when changing Chef Admin navigation or layout:

```text
/auth/login
/auth/signup
/auth/forgot-password
/dashboard
/dashboard/orders
/dashboard/menu
/dashboard/kitchen
/dashboard/storefront
/dashboard/storefront/setup
/dashboard/availability
/dashboard/reviews
/dashboard/customers
/dashboard/payouts
/dashboard/analytics
/dashboard/growth
/dashboard/settings
```

## Gates

```bash
pnpm --filter @ridendine/chef-admin typecheck
pnpm --filter @ridendine/chef-admin build
pnpm --filter @ridendine/chef-admin lint
pnpm --filter @ridendine/chef-admin test -- --runInBand
pnpm agent:chef-admin:live
```

## UI Error Rules

- Render string messages only; never render `{ code, message }` objects directly.
- Auth pages should not show raw backend errors, Zod arrays, `fetch failed`, or `Failed to fetch`.
- Empty states must include a next action when setup is incomplete.
- Dev autologin proves shell navigation only; it does not prove API auth.
