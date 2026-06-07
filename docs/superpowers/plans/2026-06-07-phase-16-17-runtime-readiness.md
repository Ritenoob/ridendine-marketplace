# Phase 16-17 Runtime Readiness Plan

## Context

The current `master` head is already pushed and the GitHub/Vercel checks are green. The latest authenticated production contract smoke passes with the seeded super-admin test account. The remaining hardening work is to turn the next two review gaps into repeatable repo checks and generated Obsidian-ready documentation.

## Phase 16: Non-Admin Role Fixture Readiness

Goal: make the blocked non-admin live-role proof explicit, testable, and safe to run without exposing credentials or mutating production data.

1. Add a credential readiness model for the seeded non-admin Ops test roles:
   - `support_agent`
   - `finance_manager`
   - `ops_agent`
2. Add a `--preflight` command path to `scripts/smoke/non-admin-role-fixture-smoke.cjs`.
3. Keep production safety boundaries:
   - no service-role mutation
   - no generated secrets in docs
   - no live network calls during readiness-only preflight
4. Expand generated docs with a readiness table that lists only env var names and configured/missing status.
5. Add tests proving:
   - readiness does not leak secret values
   - preflight fails when all required role credentials are missing
   - preflight passes without network when all role credentials are configured
6. Add the readiness evidence to the known wiring verification script.

## Phase 17: Runtime Coverage Audit

Goal: inventory every discovered app page and API route file, then map which ones are covered by current runtime, live-role, non-admin role, and high-risk authorization contracts.

1. Add a runtime coverage audit script that discovers:
   - all customer, chef, driver, and ops `page.tsx` surfaces
   - all customer, chef, driver, and ops API `route.ts` files
2. Compare discovered surfaces against existing contract sources:
   - runtime contract smoke
   - live role fixture smoke
   - non-admin role fixture smoke
   - high-risk Ops positive authorization contracts
   - high-risk Ops negative authorization contracts
3. Generate markdown docs in all mirrors:
   - `docs/wiring`
   - `docs/architecture/codebase-map/wiring`
   - `docs/obsidian/codebase-map`
4. Treat uncovered surfaces as audit gaps, not immediate test failures. The first phase is full visibility; later phases can choose which gaps become live probes.
5. Add tests proving discovery, contract-source mapping, generated markdown, and expected minimum inventory counts.
6. Add the runtime coverage audit to wiring verification and documentation generation.

## Verification

Run these checks before pushing:

1. `pnpm test:wiring-fixes`
2. `pnpm smoke:runtime-coverage -- --write-docs`
3. `pnpm smoke:non-admin-role-fixture -- --contracts-only --write-docs`
4. `pnpm docs:wiring`
5. `pnpm smoke:prod:contracts -- --require-auth`
6. GitHub/Vercel checks for the pushed commit

