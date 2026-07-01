# AGENTS.md - RideNDine Agent Operating Contract

## Project

RideNDine is a multi-app food delivery marketplace:

- `apps/web` - customer marketplace (`3000`)
- `apps/chef-admin` - chef dashboard (`3001`)
- `apps/ops-admin` - operations admin (`3002`)
- `apps/driver-app` - driver PWA (`3003`)
- `packages/*` - shared auth, DB, engine, routing, UI, validation, utilities, and types
- `supabase/` - migrations, seeds, and RLS tests
- `e2e/` - Playwright lifecycle and smoke specs

Package manager: `pnpm@9.15.0`. Runtime: Node `>=20`.

## First Commands

```bash
pnpm install --frozen-lockfile
pnpm agent:tools:doctor
```

Use exact app gates when changing one app:

```bash
pnpm --filter @ridendine/chef-admin typecheck
pnpm --filter @ridendine/chef-admin build
pnpm --filter @ridendine/chef-admin lint
pnpm --filter @ridendine/chef-admin test -- --runInBand
```

## Live Testing

Browser verification is mandatory for UI changes. Use repo scripts before ad hoc browser code:

```bash
pnpm agent:chef-admin:live
pnpm agent:chef-admin:live:local
```

The live script writes JSON and Markdown reports under `.codex-artifacts/`. A valid UI completion report must name:

- URL tested
- route(s) visited
- button/form interaction clicked
- post-click state
- console/page errors
- failed requests and 4xx/5xx API responses
- artifact path

Full seeded E2E requires local Supabase:

```bash
pnpm dlx supabase start
pnpm test:e2e:lifecycle:fixtures
pnpm e2e:validate-seed
pnpm test:e2e:lifecycle
```

If Supabase fails, state the failing migration/seed and report the browser pass as partial.

## Tool Priority

1. Existing package scripts.
2. `scripts/agent/*` for repeatable agent feedback loops.
3. Playwright package via `@playwright/test` for browser automation.
4. Native Playwright tests in `e2e/`.
5. `impeccable detect` when installed for UI design signals.
6. Semble for intent search only if `pnpm agent:tools:doctor` reports it healthy.
7. Direct reads and `/usr/bin/find` when shell wrappers interfere with exact `find`/`rg` behavior.

`playwright-cli` is optional; it can fail on this host when system Chrome is absent. Do not treat that as a blocker if bundled Playwright Chromium works.

## Architecture Rules

- Prefer `@ridendine/db` repositories over raw Supabase `.from(...)`.
- Validate API input at route boundaries.
- UI error state must render strings, not structured error objects.
- Keep app routes in `apps/*/src/app`.
- Keep shared code in `packages/*`.
- Update affected docs in the same change as code behavior.

## Skills

Repo-local Claude skills:

- `.claude/skills/ridendine-live-verification/SKILL.md`
- `.claude/skills/ridendine-supabase-fixtures/SKILL.md`

Use them when asked to verify live flows, repair fixture readiness, or improve E2E feedback.

## MCP And Plugins

- MCP guidance: `docs/agent-tooling/MCP_SERVERS.md`
- Repo plugin scaffold: `plugins/ridendine-agent-kit/`
- Plugin guidance: `docs/agent-tooling/CODEX_PLUGIN.md`

Do not invent MCP server command names. Use `.mcp.example.json` and the docs as templates, then verify installed tools with `pnpm agent:tools:doctor`.

## Current Known Blockers

- Local Supabase migration `00049_review_pii_column_lockdown_and_rls_enforcement.sql` can fail on `public.spatial_ref_sys`.
- Chef Admin Jest and lint currently fail; see `apps/chef-admin/E2E_EXPLORATION_REPORT_2026-06-30.md`.
- Dev autologin reaches dashboard shell but does not produce a real Supabase API session.

## Git

Read git state freely. Do not run `git add`, `commit`, `push`, `pull`, `merge`, `rebase`, `reset`, `stash`, or branch switching without explicit instruction.
