# CLAUDE.md - Chef Admin Context

## Product Context

`apps/chef-admin` is RideNDine's chef operations console. It is not a marketing site. The first screen after login should help a chef manage the business: storefront readiness, active orders, kitchen status, menu capacity, hours, reviews, customers, payouts, analytics, growth, and profile settings.

## Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind
- Supabase
- pnpm workspace packages under `packages/*`

## Routes To Know

- `/auth/login`
- `/auth/signup`
- `/auth/forgot-password`
- `/dashboard`
- `/dashboard/orders`
- `/dashboard/orders/[id]`
- `/dashboard/menu`
- `/dashboard/kitchen`
- `/dashboard/storefront`
- `/dashboard/storefront/setup`
- `/dashboard/availability`
- `/dashboard/reviews`
- `/dashboard/customers`
- `/dashboard/payouts`
- `/dashboard/analytics`
- `/dashboard/growth`
- `/dashboard/settings`

## Development Commands

```bash
pnpm install --frozen-lockfile
pnpm --filter @ridendine/chef-admin dev
pnpm --filter @ridendine/chef-admin typecheck
pnpm --filter @ridendine/chef-admin build
pnpm --filter @ridendine/chef-admin lint
pnpm --filter @ridendine/chef-admin test -- --runInBand
pnpm agent:tools:doctor
pnpm agent:chef-admin:live
```

Use an alternate port when needed:

```bash
ALLOW_DEV_AUTOLOGIN=true NEXT_PUBLIC_CHEF_ADMIN_URL=http://127.0.0.1:3011 pnpm --filter @ridendine/chef-admin exec next dev -p 3011
pnpm agent:chef-admin:live:local
```

## Data Rules

- Prefer `@ridendine/db` repositories over raw Supabase `.from(...)` calls.
- Validate API boundary inputs with Zod or shared validation helpers.
- API errors should return structured JSON, but UI must render a string message, never an error object.
- Dashboard autologin is local-only and does not replace a real Supabase authenticated session for API E2E.

## UI Rules

- Admin UI should be dense, readable, and action-oriented.
- Every empty state should tell the chef what to do next.
- Every failed API state should show a useful recovery message.
- Avoid nested cards and decorative complexity inside operational screens.
- Keep sidebar/header navigation stable on desktop and mobile.

## Required Verification

For any UI or route change:

1. Run the app.
2. Open the relevant route with browser automation.
3. Click the changed control.
4. Confirm the resulting visual state.
5. Check console errors, page errors, failed requests, and 4xx/5xx API responses.
6. Cite the `.codex-artifacts/chef-admin-live-e2e-*.md` feedback report.

For data-backed flows, first make local Supabase healthy:

```bash
pnpm dlx supabase start
pnpm test:e2e:lifecycle:fixtures
pnpm e2e:validate-seed
```

If Supabase fails, document the migration or seed blocker and do not claim full authenticated E2E.

## Current Known Blockers

- Local Supabase currently fails at migration `00049_review_pii_column_lockdown_and_rls_enforcement.sql` because its public-table RLS loop attempts `ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY`.
- The availability page can crash by rendering `{ code, message }` error objects directly.
- The auth pages expose low-level backend/network messages in user-facing UI.
- Chef Admin Jest and lint gates are currently red in this checkout.
