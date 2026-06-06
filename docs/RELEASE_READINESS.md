# Release Readiness

This is the release gate for the four-app Ridendine marketplace:

- Customer marketplace: `https://ridendine.ca`
- Chef admin: `https://chef.ridendine.ca`
- Driver app: `https://driver.ridendine.ca`
- Ops admin: `https://ops.ridendine.ca`

## Local Toolchain

The repo requires Node.js `>=20` and `pnpm@9.15.0`. If the local shell cannot run `node`, `npm`, or `pnpm`, run:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tools/ensure-node-pnpm.ps1
```

The script downloads a portable Node.js runtime into `.local-tools/`, keeps Corepack state inside `.local-tools/corepack`, and activates the pinned pnpm version for the current process. `.local-tools/` is intentionally ignored by git.

## Pre-Push Verification

Run the full release gate from the repo root:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/release/verify-release.ps1
```

The release runner performs:

- `git diff --check`
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm audit:guards`
- `pnpm test:wiring-fixes`
- `pnpm build`
- Production smoke checks unless `-SkipProductionSmoke` is supplied

Useful switches:

- `-IncludeFormat` to run the broad `pnpm format:check` gate. The current legacy baseline is not clean, so the default runner protects changed lines with `git diff --check` and records the broad formatter gate as skipped.
- `-SkipBuild` for quick local checks when production Vercel builds are the build gate.
- `-SkipProductionSmoke` when offline or working against local-only changes.
- `-RequireProductionSmokeAuth` when seeded production credentials must be present.

## Production Smoke

Run the production smoke directly with:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/smoke/production-smoke.ps1
```

The smoke checks:

- Public page HTML for customer, chef, driver, and ops.
- Referenced `/_next/static` assets from those pages.
- `/api/health` on all four production domains.
- Authenticated customer, driver, and ops routes when credentials are supplied.

Set credentials through environment variables, never in committed files:

```powershell
$env:RIDENDINE_SMOKE_EMAIL = '<seeded smoke email>'
$env:RIDENDINE_SMOKE_PASSWORD = '<seeded smoke password>'
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/smoke/production-smoke.ps1 -RequireAuth
```

Chef admin currently uses client-side Supabase login through `@ridendine/auth` and does not expose the same app-owned `POST /api/auth/login` route as customer, driver, and ops. The smoke verifies chef production deployment, login page, static assets, health API, and runtime logs; browser-based authenticated chef workflow checks remain a separate manual or Playwright item.

## Post-Push Verification

After pushing to `master`:

1. Confirm `git rev-parse HEAD` matches `git rev-parse origin/master`.
2. Confirm Vercel production deployments for all four custom domains are `READY`.
3. Confirm each deployment reports the same `githubCommitSha`.
4. Run production smoke with auth credentials.
5. Check Vercel runtime logs for `error` and `fatal` entries on the exact latest production deployments.
6. Record deployment IDs, commit SHA, commands run, blocked commands, and results in the Obsidian vault.

## Rollback

If a production smoke or runtime log check fails after deployment:

1. Stop new phase work.
2. Identify whether the failure is build, routing, auth/session, database schema, or runtime-only.
3. Prefer a focused fix commit when the root cause is clear.
4. If the issue is broad or business-critical, promote the last known-good Vercel deployment for the affected app.
5. Record the incident, rollback or fix commit, and verification result in the Obsidian execution plan.
