# Smoke & Audit Script Registry

Registry of the runnable checks in `scripts/smoke/` and `scripts/audit/`, derived from the
scripts themselves and the root `package.json`. Default targets shown are the scripts'
built-in defaults (production URLs `https://ridendine.ca`, `https://chef.ridendine.ca`,
`https://driver.ridendine.ca`, `https://ops.ridendine.ca`, all overridable via
`RIDENDINE_CUSTOMER_URL` / `RIDENDINE_CHEF_URL` / `RIDENDINE_DRIVER_URL` / `RIDENDINE_OPS_URL`).

"Test" = the script has a `<name>.test.cjs` companion run by `pnpm test:wiring-fixes`.

## HTTP smoke (production availability)

| Script | Alias | Validates | Target | Required env | Test |
| --- | --- | --- | --- | --- | --- |
| `production-smoke.ps1` | `smoke:prod` | HTTP status of the 4 production apps (pages, optional authenticated requests, static assets); supports `-RequireAuth`, `-SkipAuth`, `-SkipAssets` | Production (default URLs) | None required; optional `RIDENDINE_SMOKE_EMAIL` / `RIDENDINE_SMOKE_PASSWORD` for the auth leg, `RIDENDINE_*_URL` overrides | Yes |
| `responsive-production-smoke.cjs` | `smoke:responsive` | Loads the 4 production apps in Playwright Chromium at mobile (390x844) and desktop (1440x900) viewports and asserts each app's required heading renders (`Find chef-made meals near you.`, `Live Board`, `Every Bite Yum`, `Work Dashboard`) | Production (hard-coded URLs) | `RIDENDINE_SMOKE_EMAIL` / `RIDENDINE_SMOKE_PASSWORD` (3 of 4 targets need auth) | Yes |

## Auth / runtime contracts

| Script | Alias | Validates | Target | Required env | Test |
| --- | --- | --- | --- | --- | --- |
| `runtime-contracts.cjs` | (library, not run directly) | Declarative contract data: app base URLs + login paths, auth-intent pages, public/protected JSON APIs. Consumed by the other contract smokes | n/a | None | Yes |
| `runtime-contract-smoke.cjs` | `smoke:prod:contracts` | Runtime contracts across the 4 apps: public pages serve HTML, protected pages login-guard, public JSON APIs return JSON, protected JSON APIs reject anonymous requests. Exports `baseUrlForApp` / `createAppSession` used by most other smokes | Production (default URLs) | Optional `RIDENDINE_SMOKE_EMAIL` / `RIDENDINE_SMOKE_PASSWORD` for authenticated contracts, `RIDENDINE_*_URL` overrides | Yes |

## Role fixtures

| Script | Alias | Validates | Target | Required env | Test |
| --- | --- | --- | --- | --- | --- |
| `live-role-fixture-smoke.cjs` | `smoke:live-role-fixture` | Logs in with the smoke fixture on each app and probes role-scoped JSON APIs live (customer profile/orders/loyalty, chef/driver/ops capability endpoints) | Production (default URLs) | `RIDENDINE_SMOKE_EMAIL` / `RIDENDINE_SMOKE_PASSWORD` (skips authenticated probes without them unless run with `requireAuth`) | Yes |
| `non-admin-role-fixture-smoke.cjs` | `smoke:non-admin-role-fixture`; `smoke:non-admin-role-readiness` (= `--preflight --require-all-roles`); also invoked by `docs:wiring` with `--contracts-only --write-docs` | support_agent / finance_manager / ops_agent fixtures can log in to ops-admin, and capability-scoped endpoints allow/deny each role per contract | Production (default URLs) | Per role: `RIDENDINE_SUPPORT_AGENT_EMAIL`/`_PASSWORD`, `RIDENDINE_FINANCE_MANAGER_EMAIL`/`_PASSWORD`, `RIDENDINE_OPS_AGENT_EMAIL`/`_PASSWORD` (or the `RIDENDINE_SMOKE_`-prefixed variants) | Yes |

## Runtime coverage / proof (static analysis of app sources)

These read `apps/*/src/app` plus the contract modules; no network and no env vars.
Each supports `--write-docs` to regenerate its docs (used by `docs:wiring`).

| Script | Alias | Validates | Target | Required env | Test |
| --- | --- | --- | --- | --- | --- |
| `runtime-surface-classification.cjs` | `smoke:surface-classification` | Classifies every page and API route across the 4 apps (auth intent, guard intent, mutation class, HTTP methods) | Local / CI (repo files) | None | Yes |
| `runtime-coverage-audit.cjs` | `smoke:runtime-coverage` | Every discovered page/API surface is covered by a runtime contract or probe (cross-references contract smokes, role fixtures, and the high-risk ops authz contracts); writes `docs/wiring/RUNTIME_COVERAGE_AUDIT.md` | Local / CI (repo files) | None | Yes |
| `runtime-proof-disposition.cjs` | `smoke:proof-disposition` | Assigns each surface a recommended runtime proof action (public-page-smoke, login-guard-page-smoke, sampled variants, auth-entry-contract, ...) based on its classification | Local / CI (repo files) | None | Yes |

## Runtime proof execution (live)

| Script | Alias | Validates | Target | Required env | Test |
| --- | --- | --- | --- | --- | --- |
| `runtime-proof-action-smoke.cjs` | `smoke:proof-actions` | Executes the recommended proof actions live: page smokes, public/authenticated JSON smokes, including dynamic routes filled in with sample fixture IDs | Production (default URLs) | `RIDENDINE_SMOKE_EMAIL` / `RIDENDINE_SMOKE_PASSWORD` for authenticated actions; `RIDENDINE_SAMPLE_*` IDs for sampled dynamic routes | Yes |
| `runtime-sample-fixtures.cjs` | `smoke:sample-fixtures` | Resolves and validates the sample entity IDs used to fill dynamic route segments (`RIDENDINE_SAMPLE_CHEF_ID`, `_CHEF_SLUG`, `_STOREFRONT_ID`, `_CUSTOMER_ID`, `_DRIVER_ID`, `_DELIVERY_ID`, `_ORDER_ID`, `_PAYOUT_RUN_ID`, `_SUPPORT_TICKET_ID`); can log in to discover missing samples | Production (default URLs) | `RIDENDINE_SAMPLE_*` (any subset); `RIDENDINE_SMOKE_EMAIL`/`_PASSWORD` or `RIDENDINE_ADMIN_EMAIL`/`_PASSWORD` for live discovery | Yes |

## Mutation smoke (opt-in, writes data)

| Script | Alias | Validates | Target | Required env | Test |
| --- | --- | --- | --- | --- | --- |
| `driver-shift-mutation-smoke.cjs` | `smoke:driver-shift-mutation` | Live driver shift start/end mutation flow against the driver app using a disposable driver fixture. Refuses to run unless explicitly enabled and the fixture is confirmed disposable | Production (default `https://driver.ridendine.ca`), opt-in only | Required: `RIDENDINE_SHIFT_MUTATION_SMOKE=1`, `RIDENDINE_SHIFT_MUTATION_EMAIL`, `RIDENDINE_SHIFT_MUTATION_PASSWORD`, `RIDENDINE_SHIFT_MUTATION_DRIVER_ID`, `RIDENDINE_SHIFT_MUTATION_FIXTURE_OK=disposable-driver`. Optional: `RIDENDINE_SHIFT_MUTATION_CLEANUP_OPEN_SHIFT`, `RIDENDINE_SHIFT_MUTATION_ALLOW_RESTART_AFTER_CLEANUP`, `RIDENDINE_SHIFT_MUTATION_TIMEOUT_MS`, `RIDENDINE_DRIVER_URL` | Yes |

## Exports

| Script | Alias | Validates | Target | Required env | Test |
| --- | --- | --- | --- | --- | --- |
| `ops-export-audit-smoke.cjs` | `smoke:ops-export-audit` | Authenticated ops-admin `/api/export` CSV export (default `type=orders`) and that the export is recorded via `/api/audit` | Production (default `https://ops.ridendine.ca`) | `RIDENDINE_SMOKE_EMAIL` / `RIDENDINE_SMOKE_PASSWORD`; optional `RIDENDINE_OPS_URL` | Yes |

## Audits (`scripts/audit/`)

| Script | Alias | Validates | Target | Required env | Test |
| --- | --- | --- | --- | --- | --- |
| `check-api-route-guards.mjs` | `audit:guards` | Static: every state-changing handler (POST/PATCH/PUT/DELETE) in `apps/*/src/app/api/**/route.ts` calls an approved guard | Local / CI (repo files) | None | No |
| `db-boundary-ratchet.mjs` | `audit:db-boundary` | Per-app count of `db-boundary/no-raw-supabase-from` ESLint warnings does not exceed the committed baseline (`db-boundary-baseline.json`); `--write-baseline` rewrites the baseline | Local / CI (repo files) | None | No |
| `high-risk-ops-authz-contracts.cjs` | `audit:ops-authz` | Static evidence: high-risk ops-admin routes (dispatch, finance, refunds, payouts, team) contain the required guard/capability tokens per method | Local / CI (repo files) | None | Yes |
| `high-risk-ops-negative-authz.cjs` | `audit:ops-negative-authz` | Static evidence: denial matrices — non-platform and under-privileged roles (customer, chef_user, driver, support_agent, ...) are denied each high-risk capability | Local / CI (repo files) | None | Yes |
| `sean-super-admin-fixture.cjs` | `audit:sean-super-admin` | Static evidence: local seed, dedicated seed SQL, and bootstrap script all keep the `sean@ridendine.ca` super-admin fixture intact (auth user, metadata role, profile) | Local / CI (repo files) | None | Yes |
| `verify-db-hardening.mjs` | `audit:db-hardening` | Read-only DB checks: `uq_deliveries_order_id` unique index exists, no duplicate `deliveries.order_id` rows, no `SECURITY DEFINER` function executable by anon/PUBLIC (migrations 00045/00046) | Whatever database `DATABASE_URL` points at | `DATABASE_URL` (read from `.env` / `.env.local` in repo root) | No |
| `generate-production-readiness-audit.cjs` | (no alias) | Generates the `AUDIT_AND_PLANNING/PRODUCTION_READINESS_AUDIT` report set from a static scan of apps, packages, and expected DB entities | Local (repo files) | None | No |

Supporting data file: `scripts/audit/db-boundary-baseline.json` — committed per-app warning
baseline consumed by `db-boundary-ratchet.mjs`.
