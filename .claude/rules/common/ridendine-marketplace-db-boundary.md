---
paths:
  - "apps/**/src/app/api/**"
  - "apps/**/src/app/**/page.tsx"
  - "packages/db/**"
  - "supabase/**"
---

# DB Boundary And Fixtures

## Data Access

- Prefer `@ridendine/db` repositories over raw Supabase `.from(...)`.
- If raw Supabase is necessary, keep it local, documented, and covered by tests.
- Keep RLS and role assumptions explicit in route tests and smoke scripts.

## Local Supabase Readiness

Before claiming full lifecycle E2E:

```bash
pnpm dlx supabase start
pnpm test:e2e:lifecycle:fixtures
pnpm e2e:validate-seed
pnpm test:e2e:lifecycle
```

Current known blocker: migration `00049_review_pii_column_lockdown_and_rls_enforcement.sql` can try to alter extension-owned `public.spatial_ref_sys`. Exclude extension-owned tables from blanket RLS loops.

## Seed Safety

- Use `supabase/seeds/seed.sql` for deterministic lifecycle data.
- Never point fixture reset or smoke scripts at production credentials.
- Keep `.env.local` out of git.
