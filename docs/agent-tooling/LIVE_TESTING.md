# Live Testing Playbook

## Goal

Agents must produce live evidence: rendered pages, clicks, post-click state, console errors, network failures, and artifact paths.

## Fast Chef Admin Loop

Start the app:

```bash
ALLOW_DEV_AUTOLOGIN=true NEXT_PUBLIC_CHEF_ADMIN_URL=http://127.0.0.1:3011 pnpm --filter @ridendine/chef-admin exec next dev -p 3011
```

Run the feedback sweep:

```bash
pnpm agent:chef-admin:live:local
```

Outputs:

- `.codex-artifacts/chef-admin-live-e2e-*.json`
- `.codex-artifacts/chef-admin-live-e2e-*.md`

## Full Seeded Lifecycle

```bash
pnpm dlx supabase start
pnpm test:e2e:lifecycle:fixtures
pnpm e2e:validate-seed
pnpm test:e2e:lifecycle
```

If Supabase fails, stop calling the run full E2E. Report the failing migration/seed and continue only with shell/error-state verification.

## Required Report Fields

- base URL
- command
- routes
- clicked controls
- visible result
- console/page errors
- failed requests
- 4xx/5xx API responses
- test/build/lint status
- artifact paths

## Tool Health

Run:

```bash
pnpm agent:tools:doctor
```

The script writes:

- `.codex-artifacts/agent-tool-health.json`
- `.codex-artifacts/agent-tool-health.md`

Use bundled Playwright Chromium when `playwright-cli` cannot find system Chrome.
