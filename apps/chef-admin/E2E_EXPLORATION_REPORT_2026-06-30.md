# Chef Admin E2E Exploration Report - 2026-06-30

Checkout: `/home/nygma/Desktop/ridendine-marketplace-github`
App: `apps/chef-admin`
Dev URL tested: `http://127.0.0.1:3011`
Browser engine: Playwright bundled Chromium

## Executive Summary

Chef Admin can install, typecheck, build, and render the public/auth/dashboard shell. Full authenticated workflow testing is blocked by the local Supabase migration failure. With `ALLOW_DEV_AUTOLOGIN=true`, the dashboard shell is reachable and navigation works, but API-backed pages either show empty/no-profile states, 401 recovery messages, or, in one case, a hard error boundary.

The most important fixes are:

1. Repair local Supabase boot by excluding extension-owned tables from migration `00049`.
2. Fix `/dashboard/availability`, which crashes after a 401 from `/api/storefront/availability`.
3. Normalize auth error display so users do not see `fetch failed`, `Failed to fetch`, or raw Zod JSON.
4. Restore the red Jest and lint gates.
5. Replace dashboard no-profile/no-storefront dead ends with actionable setup/retry paths.

## Environment Started

Dependency install:

```bash
pnpm install --frozen-lockfile
```

Result: passed.

Local env:

- Created ignored `.env.local` with placeholder local values.
- Set `ALLOW_DEV_AUTOLOGIN=true`.
- Used port `3011` because port `3001` was already occupied by another Next server.

Dev server command:

```bash
ALLOW_DEV_AUTOLOGIN=true NEXT_PUBLIC_CHEF_ADMIN_URL=http://127.0.0.1:3011 pnpm --filter @ridendine/chef-admin exec next dev -p 3011
```

Result: passed, server ready on `http://localhost:3011`.

## Artifacts

Artifacts are under `.codex-artifacts/`:

- `chef-admin-e2e-3011.json` - route crawl, full rendered text, links, buttons, clicks, console/page/network evidence.
- `chef-admin-auth-focused-after-restart-3011.json` - clean auth form interaction evidence after restarting dev server.
- `chef-admin-auth-focused-3011.json` - invalidated dev chunk pass after running `next build` while dev server was live; kept as harness evidence.
- `chef-admin-jest-3011.json` - structured Jest results.
- `chef-admin-signup-rendered-3011.html` - rendered signup HTML for design scan.
- `chef-admin-dashboard-rendered-3011.html` - rendered dashboard HTML for design scan.

## Supabase / Fixture Status

Fixture static checks passed:

```bash
pnpm test:e2e:lifecycle:fixtures
pnpm e2e:validate-seed
```

Result:

- `Lifecycle fixture preflight passed.`
- `OK - every id literal is a valid UUID and every *_id reference resolves.`

Local Supabase failed:

```bash
pnpm dlx supabase start
```

Failure:

```text
ERROR: must be owner of table spatial_ref_sys (SQLSTATE 42501)
At statement: 4
EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
```

Source:

- `supabase/migrations/00049_review_pii_column_lockdown_and_rls_enforcement.sql:48`
- `supabase/migrations/00049_review_pii_column_lockdown_and_rls_enforcement.sql:61`

The migration loops through every ordinary public table without RLS. PostGIS creates public extension tables such as `spatial_ref_sys`; the migration treats them as app tables and attempts to alter them.

Recommendation:

- Exclude extension-owned/system tables from the loop.
- Prefer filtering by tables owned by the migration/app owner, by known application schemas, or by excluding `pg_depend` extension members.
- Add a migration smoke test that runs `supabase start`/`db reset` from a clean volume.

Until this is fixed, seeded chef account workflows cannot be fully verified.

## Route Coverage

### Public and Auth Routes

| Route | Result | Notes |
| --- | --- | --- |
| `/` | Redirect/rendered dashboard via dev autologin | Shows storefront setup CTA. |
| `/auth/login` | Rendered | Submit with bad credentials returned `/api/auth/login` 401 and displayed `fetch failed`. |
| `/auth/signup` | Rendered | Password mismatch displays correctly. Valid weak password displays raw Zod JSON. |
| `/auth/forgot-password` | Rendered | Submit against placeholder Supabase shows `Failed to fetch`. |
| `/privacy` | Rendered | Draft legal text visible. |
| `/terms` | Rendered | Draft legal text visible. |

### Dashboard Routes

| Route | Result | Notes |
| --- | --- | --- |
| `/dashboard` | Rendered | Shows `Set up your storefront` CTA. |
| `/dashboard/orders` | Rendered | Shows `No storefront found. Please complete your setup.` |
| `/dashboard/menu` | Rendered | Shows `No storefront found. Please complete your setup.` |
| `/dashboard/kitchen` | Rendered with API failure | `/api/kitchen/overview` returns 401; page says unable to load kitchen data. |
| `/dashboard/storefront` | Rendered with auth-required state | Says sign in required despite dev autologin shell. |
| `/dashboard/storefront/setup` | Rendered with auth-required state | Says sign in required. |
| `/dashboard/availability` | Failed | 401 from `/api/storefront/availability`, then React error boundary. |
| `/dashboard/reviews` | Rendered | Minimal page title only under this unauthenticated/dev-autologin state. |
| `/dashboard/customers` | Rendered with API failure | `/api/customers` returns 401; page says unable to load customer data. |
| `/dashboard/payouts` | Rendered | Minimal page title under this state. |
| `/dashboard/analytics` | Rendered with API failure | `/api/analytics?period=month` returns 401; page says unable to load analytics. |
| `/dashboard/growth` | Rendered with API failure | `/api/growth?window=weeks` returns 401; page says unable to load growth data. |
| `/dashboard/settings` | Rendered | Shows `No profile found. Please complete your setup.` |
| `/dashboard/orders/RND-004` | 404 | Seeded order detail cannot be verified until Supabase seed is available. |

### Mobile Navigation

Viewport `390x844`:

- Open menu button worked.
- Mobile nav opened.
- Clicking `Orders` navigated to `/dashboard/orders`.

### Sign Out

Final interaction:

- Before: `/dashboard`
- Clicked `Sign out`
- After: `/auth/login`

Result: passed.

## Functional Findings

### F1 - Supabase Migration Blocks Real E2E

Severity: critical
Area: database/local environment

Evidence:

- `pnpm dlx supabase start` exits 1.
- Migration `00049` attempts to enable RLS on `public.spatial_ref_sys`.

Impact:

- Seeded accounts such as `sean@ridendine.ca` cannot be used locally.
- Kitchen, menu, orders, storefront, payouts, analytics, and order detail flows cannot be tested against real data.

Recommendation:

- Fix migration `00049` first.
- Then run `supabase db reset`, seed, and execute full authenticated Playwright flows.

### F2 - Availability Page Crashes On Structured API Error

Severity: high
Area: dashboard availability

Evidence:

- `/dashboard/availability` requests `/api/storefront/availability`.
- API returns 401.
- Page throws: `Objects are not valid as a React child (found: object with keys {code, message})`.
- Error boundary displays `Something went wrong`.

Code:

- `apps/chef-admin/src/components/availability/weekly-availability-form.tsx:36`
- `apps/chef-admin/src/components/availability/weekly-availability-form.tsx:164`

Root cause:

```ts
setError(json.error || 'Failed to load');
...
{error && <p className="mt-4 text-sm text-danger">{error}</p>}
```

`json.error` can be an object, but React children must be renderable primitives.

Recommendation:

- Normalize API error objects before setting React state:
  - `json.error?.message`
  - fallback to `json.message`
  - fallback to a route-specific string.
- Add a regression test that mocks `{ success: false, error: { code, message } }`.

### F3 - Auth Pages Expose Low-Level Error Text

Severity: high
Area: auth UX

Evidence after clean dev-server restart:

- Login bad credentials: `fetch failed`.
- Forgot password with placeholder Supabase: `Failed to fetch`.
- Signup weak password: raw Zod JSON:

```text
[ { "validation": "regex", "code": "invalid_string", "message": "Password must contain at least one uppercase letter", "path": [ "password" ] } ]
```

Code:

- `apps/chef-admin/src/app/api/auth/signup/route.ts:91`
- `apps/chef-admin/src/app/api/auth/signup/route.ts:140`
- `apps/chef-admin/src/app/api/auth/signup/route.ts:141`

Recommendation:

- Convert Zod errors to a concise field-level message.
- Convert network/auth backend failures to user-facing copy:
  - "Could not reach authentication service. Try again."
  - "Invalid email or password."
  - "Password must contain at least one uppercase letter."
- Keep structured details in logs, not in visible UI.

### F4 - Dev Autologin Gives A Shell But Not API Auth

Severity: high
Area: local testing/auth architecture

Evidence:

- Dashboard shell shows authenticated-looking header.
- API-backed routes still return 401:
  - `/api/kitchen/overview`
  - `/api/storefront/availability`
  - `/api/customers`
  - `/api/analytics?period=month`
  - `/api/growth?window=weeks`
- Storefront and setup pages say sign in required.

Impact:

- `ALLOW_DEV_AUTOLOGIN=true` is useful for shell navigation but not enough for realistic E2E.

Recommendation:

- After Supabase boot is fixed, prefer seeded real login for E2E.
- If dev autologin remains supported, make its limitations explicit or provide a local mock actor context for API routes.

### F5 - `View Storefront` Link Points To Chef Admin Root

Severity: medium
Area: navigation

Evidence:

- Sidebar footer uses `href="/"` with `target="_blank"`.
- In chef-admin, `/` routes back into chef-admin/dashboard under dev autologin.

Code:

- `apps/chef-admin/src/components/layout/sidebar.tsx:128`

Recommendation:

- Link to the real customer storefront URL using `NEXT_PUBLIC_WEB_URL` plus the chef/storefront slug when available.
- If no storefront exists, hide the link or point to setup.

### F6 - Jest Gate Is Red

Severity: high
Area: tests

Command:

```bash
pnpm --filter @ridendine/chef-admin test -- --runInBand --json --outputFile ../../.codex-artifacts/chef-admin-jest-3011.json
```

Result:

- Test suites: 3 failed, 14 passed, 17 total.
- Tests: 9 failed, 93 passed, 102 total.

Failures:

- `apps/chef-admin/src/components/kitchen/__tests__/kitchen-order-queue.test.tsx`
  - `patches customer name on the hydrated second onInsert call`
  - `does NOT revert an in-flight order when a stale tickets prop arrives`
- `apps/chef-admin/src/app/api/kitchen/overview/__tests__/route.test.ts`
  - expected 200, received 500.
- `apps/chef-admin/src/components/kitchen/__tests__/prep-countdown.test.tsx`
  - six tests fail because `window.matchMedia is not a function`.

Code reference:

- `apps/chef-admin/src/components/kitchen/prep-countdown.tsx:85`

Recommendation:

- Add a safe `window.matchMedia` guard or Jest setup mock.
- Fix KitchenOrderQueue stale-ticket state behavior or update the assertion if the UI intentionally changed.
- Fix the API route unit fixture so `/api/kitchen/overview` returns 200 for the expected happy path.

### F7 - Lint Gate Is Red

Severity: medium
Area: static quality

Command:

```bash
pnpm --filter @ridendine/chef-admin lint
```

Result:

- 10 errors.
- 65 warnings.

Blocking errors:

- `@typescript-eslint/no-require-imports` in test files:
  - `apps/chef-admin/src/__tests__/orders-list-readiness.test.tsx:198`
  - `apps/chef-admin/src/app/api/kitchen/overview/__tests__/route.test.ts`
  - `apps/chef-admin/src/components/kitchen/__tests__/kitchen-order-queue.test.tsx`
  - `apps/chef-admin/src/lib/__tests__/sound.test.ts`

Warnings:

- Many raw Supabase `.from(...)` calls bypass the DB boundary rule.
- One unused eslint-disable in `apps/chef-admin/src/lib/sound.ts`.

Recommendation:

- Replace test `require(...)` calls with imports or dynamic `await import(...)` patterns.
- Decide whether DB-boundary warnings are an active migration requirement or need documented exceptions.

### F8 - Production Build Passes With Warnings

Severity: low
Area: build/performance hygiene

Command:

```bash
pnpm --filter @ridendine/chef-admin build
```

Result: passed.

Warnings:

- Webpack cache warning about serializing a `140kiB` string.
- Node warns that `packages/ui/src/tokens.ts` is reparsed as ESM because `packages/ui/package.json` lacks `"type": "module"`.

Recommendation:

- Add `"type": "module"` to `packages/ui/package.json` only after checking package consumers.
- Investigate the large serialized string if build/startup performance matters.

### F9 - Design Detector Warning

Severity: low
Area: UI polish

Command:

```bash
impeccable detect --json .codex-artifacts/chef-admin-signup-rendered-3011.html .codex-artifacts/chef-admin-dashboard-rendered-3011.html
```

Result:

- One `nested-cards` warning in signup rendered HTML.

Recommendation:

- Flatten nested card structure in signup/auth layout if this surface gets design polish.

### F10 - Running Build While Dev Server Is Live Invalidates Dev Chunks

Severity: test harness note
Area: local workflow

Evidence:

- After `next build` ran while `next dev` was still serving, the browser saw many 404s for dev `_next/static` chunks and MIME errors.
- Restarting `next dev` cleared this artifact.

Recommendation:

- Restart the dev server after production build checks before continuing browser E2E.
- Do not treat those chunk 404s as app defects unless they reproduce after restart.

## Quality Gate Summary

| Gate | Command | Result |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | Passed |
| Fixture preflight | `pnpm test:e2e:lifecycle:fixtures` | Passed |
| Seed UUID validation | `pnpm e2e:validate-seed` | Passed |
| Supabase local start | `pnpm dlx supabase start` | Failed |
| Typecheck | `pnpm --filter @ridendine/chef-admin typecheck` | Passed |
| Build | `pnpm --filter @ridendine/chef-admin build` | Passed |
| Jest | `pnpm --filter @ridendine/chef-admin test -- --runInBand` | Failed |
| Lint | `pnpm --filter @ridendine/chef-admin lint` | Failed |
| Browser E2E | Playwright bundled Chromium | Partial pass; full auth/data blocked by Supabase |
| Design detector | `impeccable detect` | Ran; 1 warning |

## Recommended Fix Order

1. Fix migration `00049` and prove `pnpm dlx supabase start` or `supabase db reset` passes from clean state.
2. Seed local Supabase and run real login with seeded chef credentials.
3. Fix availability error normalization and add a regression test.
4. Fix auth error normalization for login, signup, and forgot password.
5. Fix Jest failures.
6. Fix lint errors, then decide how to handle DB-boundary warnings.
7. Correct `View Storefront` target.
8. Re-run browser E2E with real seeded data:
   - login
   - storefront setup
   - menu category/item CRUD
   - order list/detail
   - kitchen accept/reject/start/ready flow
   - availability save
   - customers/analytics/growth/payouts/reviews pages
   - settings save
   - mobile nav
   - sign out

## Bottom Line

The app shell is alive and buildable, but Chef Admin is not ready to call E2E healthy. The database boot blocker must be fixed first; after that, the highest-value product bug is the availability crash, followed by auth error quality and the red Jest/lint gates.
