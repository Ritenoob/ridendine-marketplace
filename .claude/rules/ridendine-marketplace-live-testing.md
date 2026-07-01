# Live Testing And Feedback

## Rule

No UI change is complete without a browser run that clicks the affected control and records post-click evidence.

## Preferred Commands

```bash
pnpm agent:tools:doctor
pnpm agent:chef-admin:live
pnpm agent:chef-admin:live:local
```

Use `agent:chef-admin:live:local` with:

```bash
ALLOW_DEV_AUTOLOGIN=true NEXT_PUBLIC_CHEF_ADMIN_URL=http://127.0.0.1:3011 pnpm --filter @ridendine/chef-admin exec next dev -p 3011
```

## Evidence Contract

Report:

- command run
- base URL
- routes visited
- clicked button/form
- resulting visible state
- console/page errors
- failed network requests
- local artifact paths under `.codex-artifacts/`

## Blocking States

- Supabase migration/seed failure means seeded authenticated E2E is blocked.
- Browser route renders with 401 API calls are partial verification, not full workflow proof.
- Error boundaries, Next overlays, page errors, failed primary actions, or 5xx responses block completion.

## After Build

Restart `next dev` after `next build` before browser checks. A live dev server can serve stale `_next/static` chunk URLs after a build.
