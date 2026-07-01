# Project: RideNDine Marketplace

Last updated: 2026-06-30

## Stack

- pnpm/Turborepo monorepo
- Next.js App Router apps
- React + TypeScript + Tailwind
- Supabase Postgres/Auth/RLS
- Jest unit tests
- Playwright E2E

## Apps

| App | Package | Port |
| --- | --- | --- |
| Customer web | `@ridendine/web` | `3000` |
| Chef admin | `@ridendine/chef-admin` | `3001` |
| Ops admin | `@ridendine/ops-admin` | `3002` |
| Driver app | `@ridendine/driver-app` | `3003` |

## Commands

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
pnpm test:smoke
pnpm agent:tools:doctor
```

Use app filters for focused work:

```bash
pnpm --filter @ridendine/chef-admin typecheck
pnpm --filter @ridendine/chef-admin build
pnpm --filter @ridendine/chef-admin lint
pnpm --filter @ridendine/chef-admin test -- --runInBand
```

## Boundaries

- App routes: `apps/*/src/app`.
- App components: `apps/*/src/components`.
- Shared repositories and Supabase clients: `packages/db`.
- Shared validation: `packages/validation`.
- Shared UI tokens/components: `packages/ui`.
- Runtime contracts and wiring docs: `docs/wiring`.

## Current Tool Gotchas

- Use `/usr/bin/find` when exact `find` predicates/actions matter; a shell wrapper may reject compound predicates.
- `rg` may be shell-rewritten in some sessions. If `rg --files` errors, use `/usr/bin/find` or direct `grep`.
- `playwright-cli` can fail without system Chrome. Prefer repo scripts using bundled Playwright Chromium.
- Semble is optional; run `pnpm agent:tools:doctor` before relying on it.
