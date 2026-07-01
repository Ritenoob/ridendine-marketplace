---
name: ridendine-supabase-fixtures
description: Verify and repair RideNDine local Supabase migrations, seeds, RLS readiness, and lifecycle E2E fixtures. Use when Supabase start/reset fails, seeded users are unavailable, lifecycle E2E cannot run, or agents need to prove authenticated data workflows.
---

# RideNDine Supabase Fixtures

## Readiness Sequence

Run from the repo root:

```bash
pnpm dlx supabase start
pnpm test:e2e:lifecycle:fixtures
pnpm e2e:validate-seed
pnpm test:e2e:lifecycle
```

Do not claim seeded authenticated E2E until all four pass.

## Current Known Failure

Migration `supabase/migrations/00049_review_pii_column_lockdown_and_rls_enforcement.sql` can fail:

```text
ERROR: must be owner of table spatial_ref_sys (SQLSTATE 42501)
```

Cause: the migration loops through ordinary public tables without excluding extension-owned PostGIS tables.

Fix direction:

- Exclude extension-owned tables from blanket RLS loops.
- Keep app-owned public tables covered.
- Re-run `pnpm dlx supabase start` from a clean local stack.
- Re-run fixture and seed validation after the migration passes.

## Seed Contract

- Deterministic seed lives at `supabase/seeds/seed.sql`.
- Static fixture checks:

  ```bash
  pnpm test:e2e:lifecycle:fixtures
  pnpm e2e:validate-seed
  ```

- Seeded lifecycle E2E is the proof, not placeholder `.env.local` values.

## Reporting

When blocked, report:

- command
- failing migration/statement
- SQLSTATE
- whether containers stopped
- next repair step
