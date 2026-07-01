# CLAUDE.md - RideNDine Agent Context

RideNDine is a chef-first food delivery marketplace built as a pnpm/Turborepo monorepo with four Next.js apps backed by Supabase.

Use this file as the Claude entrypoint. Codex and cross-agent context lives in `AGENTS.md`; modular Claude rules live in `.claude/rules/`.

## Required Reading

- `AGENTS.md` - cross-agent operating contract.
- `.claude/rules/ridendine-marketplace-project.md` - repo structure and command map.
- `.claude/rules/ridendine-marketplace-live-testing.md` - live browser feedback requirements.
- `.claude/rules/ridendine-marketplace-mcp-servers.md` - MCP/tool selection and health.
- `docs/agent-tooling/LIVE_TESTING.md` - step-by-step live verification playbook.

## Core Commands

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm agent:tools:doctor
pnpm agent:chef-admin:live
```

For local alternate-port chef-admin testing:

```bash
ALLOW_DEV_AUTOLOGIN=true NEXT_PUBLIC_CHEF_ADMIN_URL=http://127.0.0.1:3011 pnpm --filter @ridendine/chef-admin exec next dev -p 3011
pnpm agent:chef-admin:live:local
```

## Non-Negotiables

- Do not claim UI work is verified without browser evidence and clicked interactions.
- Do not claim full authenticated E2E while local Supabase is failing to boot or seed.
- Keep DB access routed through `@ridendine/db` repositories unless a documented exception exists.
- Never commit real credentials or `.env.local`.
- Do not auto-commit or push without explicit instruction.

## Apps

- `apps/web` - customer marketplace, port `3000`.
- `apps/chef-admin` - chef dashboard, port `3001`.
- `apps/ops-admin` - operations admin, port `3002`.
- `apps/driver-app` - driver PWA, port `3003`.

## Known Current Blockers

- Local Supabase currently fails at migration `00049_review_pii_column_lockdown_and_rls_enforcement.sql` when it attempts RLS on extension-owned `public.spatial_ref_sys`.
- Chef Admin Jest and lint are red in the current checkout; see `apps/chef-admin/E2E_EXPLORATION_REPORT_2026-06-30.md`.
- `playwright-cli` may fail when system Chrome is missing. Prefer the repo script using bundled Playwright Chromium.
