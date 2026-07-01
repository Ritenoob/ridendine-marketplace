---
name: ridendine-live-verification
description: Run RideNDine live browser verification and feedback loops. Use when testing UI changes, checking Chef Admin or other app routes, producing E2E evidence, collecting console/network/page errors, validating mobile navigation, or preparing a user-facing live testing report.
---

# RideNDine Live Verification

## Workflow

1. Read `AGENTS.md` and `.claude/rules/ridendine-marketplace-live-testing.md`.
2. Run tool health:

   ```bash
   pnpm agent:tools:doctor
   ```

3. Start only the app under test.
4. Run the relevant live script before making completion claims.
5. Report artifact paths from `.codex-artifacts/`.

## Chef Admin

Default port:

```bash
pnpm --filter @ridendine/chef-admin dev
pnpm agent:chef-admin:live
```

Alternate local port:

```bash
ALLOW_DEV_AUTOLOGIN=true NEXT_PUBLIC_CHEF_ADMIN_URL=http://127.0.0.1:3011 pnpm --filter @ridendine/chef-admin exec next dev -p 3011
pnpm agent:chef-admin:live:local
```

## Evidence Rules

Classify the outcome:

- `LIVE_PASS` - browser interaction and backend boundary passed.
- `LIVE_PARTIAL` - route rendered but data/auth/Supabase blocked full proof.
- `UNIT_VERIFIED` - tests ran but no browser proof.
- `BLOCKED` - named environment blocker prevents meaningful continuation.

Never call a UI task done without:

- route URL
- clicked primary action
- post-click state
- console/page error status
- failed request/HTTP issue status
- artifact path

## Fallbacks

- If `playwright-cli` fails because system Chrome is missing, use the repo script. It launches bundled Playwright Chromium from `@playwright/test`.
- If Supabase fails, run shell/error-state verification only and mark the result `LIVE_PARTIAL`.
- If `next build` ran while `next dev` was live, restart the dev server before browser testing.
