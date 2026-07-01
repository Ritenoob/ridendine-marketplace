# AGENTS.md - Chef Admin Agent Guide

## Scope

This file applies to `apps/chef-admin` in the RideNDine monorepo.

Chef Admin is the chef-facing Next.js dashboard for storefront setup, menu operations, order/kitchen work, hours, reviews, customers, payouts, analytics, growth, and profile settings.

## Local Commands

Run commands from the repository root unless a command says otherwise.

```bash
pnpm install --frozen-lockfile
pnpm --filter @ridendine/chef-admin dev
pnpm --filter @ridendine/chef-admin build
pnpm --filter @ridendine/chef-admin typecheck
pnpm --filter @ridendine/chef-admin lint
pnpm --filter @ridendine/chef-admin test -- --runInBand
pnpm agent:tools:doctor
pnpm agent:chef-admin:live
pnpm test:e2e:lifecycle:fixtures
pnpm e2e:validate-seed
```

Default dev port is `3001`. Use an alternate port when `3001` is occupied:

```bash
ALLOW_DEV_AUTOLOGIN=true NEXT_PUBLIC_CHEF_ADMIN_URL=http://127.0.0.1:3011 pnpm --filter @ridendine/chef-admin exec next dev -p 3011
pnpm agent:chef-admin:live:local
```

## Environment

Local development expects Supabase and app URL variables. Use `.env.example` as the source of truth.

Important local variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_CHEF_ADMIN_URL`
- `NEXT_PUBLIC_WEB_URL`
- `ALLOW_DEV_AUTOLOGIN`

Never commit `.env.local`.

## App Boundaries

- Routes live in `apps/chef-admin/src/app`.
- Components live in `apps/chef-admin/src/components`.
- API route handlers live in `apps/chef-admin/src/app/api`.
- Shared auth comes from `@ridendine/auth`.
- Shared data access should go through `@ridendine/db`.
- Shared UI should come from `@ridendine/ui`.
- Shared validation should come from `@ridendine/validation`.

## E2E Verification Rules

Any visible UI change requires browser verification. At minimum:

1. Start the app.
2. Open the affected route in a browser automation tool.
3. Snapshot the visible page.
4. Click the primary action affected by the change.
5. Re-snapshot and confirm the expected state.
6. Check browser console, page errors, failed network requests, and API responses.
7. Save or cite the generated `.codex-artifacts/chef-admin-live-e2e-*.md` report.

For this app, always cover:

- `/auth/login`
- `/auth/signup`
- `/auth/forgot-password`
- `/dashboard`
- `/dashboard/orders`
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

If local Supabase cannot start, report that authenticated data workflows are blocked and still verify reachable shell, auth, redirect, and error states with `ALLOW_DEV_AUTOLOGIN=true`.

## Known Verification Risks

- Supabase migration `00049_review_pii_column_lockdown_and_rls_enforcement.sql` can fail locally if its RLS loop includes extension-owned PostGIS tables such as `spatial_ref_sys`.
- Dev autologin exercises the dashboard shell but does not create a real Supabase session for API routes.
- Running `next build` while `next dev` is serving can invalidate dev `_next/static` chunks. Restart the dev server before continuing browser checks.

## Quality Gates

Before marking app work complete, run:

```bash
pnpm agent:tools:doctor
pnpm --filter @ridendine/chef-admin typecheck
pnpm --filter @ridendine/chef-admin build
pnpm --filter @ridendine/chef-admin lint
pnpm --filter @ridendine/chef-admin test -- --runInBand
pnpm agent:chef-admin:live
```

If a gate fails, record the exact failing file, test, command, and first actionable error.

## Agent Roles

- Builder: implement narrowly scoped code changes.
- Browser verifier: run route and interaction checks with Playwright or available browser tooling.
- Test maintainer: keep Jest, typecheck, lint, and build green.
- Supabase maintainer: repair migrations, seeds, RLS policies, and fixture reset paths.
- UX reviewer: inspect auth, dashboard, empty, error, and loading states for clear operator-facing language.

## Current Priority Areas

1. Repair local Supabase boot so seeded authenticated workflows can run.
2. Fix structured error rendering in availability.
3. Normalize auth validation and network error messages.
4. Restore Jest and lint gates.
5. Replace chef-admin placeholder/empty states with actionable setup or recovery paths.
