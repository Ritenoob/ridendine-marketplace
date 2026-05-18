# Infrastructure Audit — 2026-05-18

Scope-limited audit of Sentry + distributed rate-limiting wiring across the monorepo, scoped to `docs/plans/2026-05-18-production-readiness-stabilization.md` Task 9. Confirms the code-side state and isolates remaining work to operator actions only.

## Sentry

### Code-side state — complete ✅

All four apps already ship Sentry configs:

| App | File | Loads DSN from |
|-----|------|-----------------|
| `apps/web` | `sentry.{client,server,edge}.config.ts` | `process.env.NEXT_PUBLIC_SENTRY_DSN` |
| `apps/chef-admin` | `sentry.{client,server,edge}.config.ts` | `process.env.NEXT_PUBLIC_SENTRY_DSN` |
| `apps/ops-admin` | `sentry.{client,server,edge}.config.ts` | `process.env.NEXT_PUBLIC_SENTRY_DSN` |
| `apps/driver-app` | `sentry.{client,server,edge}.config.ts` | `process.env.NEXT_PUBLIC_SENTRY_DSN` |

Common configuration:
- `tracesSampleRate`: 0.1 in production, 1.0 otherwise
- `environment`: `process.env.NODE_ENV ?? 'development'`
- `replaysSessionSampleRate`: 0 (no session recording — privacy-safe default)
- `replaysOnErrorSampleRate`: 1.0 in production, 0 otherwise (error-only replays)
- Init is gated on `NEXT_PUBLIC_SENTRY_DSN` being truthy, so missing-DSN = no-op (no errors thrown)

### Material gap — single shared DSN ⚠️

All four apps read the **same** env var name (`NEXT_PUBLIC_SENTRY_DSN`). If Sean sets one DSN value at the team level in Vercel, all 4 apps push errors into the same Sentry project, indistinguishable by source app.

**Two paths to resolve:**

- **Path A (single project):** Add `tags: { app: 'web' | 'chef-admin' | 'ops-admin' | 'driver-app' }` to each `Sentry.init({ ... })` call. Then filter in Sentry by `app:web` etc. Lowest setup cost; one Sentry project to maintain. **Recommended for soft-launch.**
- **Path B (four projects):** Rename per app — `NEXT_PUBLIC_SENTRY_DSN_WEB`, `..._CHEF_ADMIN`, `..._OPS_ADMIN`, `..._DRIVER_APP` — and edit each `sentry.*.config.ts` to read the matching one. Higher maintenance, cleaner separation, four Sentry projects to staff.

Path A is the recommended soft-launch choice. Implementation is a one-liner per `sentry.client.config.ts` / `sentry.server.config.ts` per app; can be folded into Task 9 implementation work.

### Operator action remaining

Set `NEXT_PUBLIC_SENTRY_DSN` in production scope on each of the four Vercel projects:
- `ridendine-web` (prj id unknown from this audit; Sean to confirm)
- `ridendine-chef-admin` (id unknown)
- `ridendine-ops-admin` (`prj_RgQF9FvEBdpW4v8px65TaPLJQnsY`)
- `ridendine-driver-app` (id unknown)

Verification: trigger a deliberate test error in each app and confirm it lands in the Sentry project within 60 seconds.

## Distributed rate limiting

### Code-side state — complete ✅

`packages/utils/src/rate-limit/index.ts` already implements the full Upstash-or-memory selector:

- `resolveStore()` (line 27) chooses `UpstashRateLimitStore` when both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set, otherwise falls back to `MemoryRateLimitStore`.
- `getRateLimitProviderStatus()` (line 42) returns the provider name, ready/degraded flags, and a reason string. In a production-like environment running on memory, it marks itself `degraded: true` with a clear reason.
- `evaluateRateLimit()` (line 98) uses an in-memory fallback when the distributed provider is missing **but** propagates `degraded: true` on every decision so ops can detect the gap.
- Failure handling: `fail_closed` policies return 0/0 with `retryAfter: 60` on provider error; otherwise fail-open with `degraded: true`.

Five tests in `packages/utils/src/rate-limit/rate-limit.test.ts` cover: dev-mode memory provider, production degraded state without distributed provider, in-memory fallback in degraded mode, low-risk fail-open allow, and limit-exhaustion denial.

### No material gap ✅

The original plan Task 9 was authored assuming the wire-up did not exist; the actual code already has it. The only Task 9 outcome that remains is operator-side: set the Upstash env vars in Vercel.

### Operator action remaining

Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in production scope on each of the four Vercel projects. Per-instance memory will continue to function until then but reports `degraded: true` via `/api/health.rateLimit.degraded`.

Verification:
1. After env-var push and redeploy, `GET /api/health` on each app should return `rateLimit: { ready: true, provider: 'upstash', degraded: false }`.
2. Hammer `POST /api/checkout` 100× in 60s from one IP; observe 429 responses after the policy threshold.

## Task 9 DoD reconciliation

| Plan DoD bullet | Status | Note |
|----|----|----|
| `UPSTASH_REDIS_REST_URL` + `_TOKEN` set in prod for 4 apps | ⏳ | Operator action — Sean |
| `GET /api/health` reports `provider: 'upstash'` on each app | ⏳ | Gated on env-var push |
| Rate-limit kick-in: 100 req / 60s → 429 | ⏳ | Gated on env-var push + a test policy on `/api/checkout` if not already in place |
| Sentry DSN set + test error captured per app | ⏳ | Operator action |
| `.env.example` documents the new env vars | ⏳ | Repo edit; check whether already present (next sub-task below) |
| `LAUNCH_CHECKLIST.md` T14 marked `[x]` | ⏳ | Gated on Upstash env-var push |
| `pnpm --filter @ridendine/utils test -- rate-limit-provider` | ✅ | 5 existing tests cover both modes |

## Recommended micro-tasks for the next code session

1. **Apply Path A tagging** (Sentry): add `tags: { app: '<name>' }` to each `Sentry.init({})` in the 4 apps' client/server/edge configs. 12 small edits.
2. **Verify `.env.example`** lists `NEXT_PUBLIC_SENTRY_DSN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` with empty values + setup comments. Check both root and per-app `.env.example` files.
3. **Document** the Sentry+Upstash setup in `docs/MONITORING_RUNBOOK.md` once Task 11 starts.

None of these are blocking for the soft-launch — the operator action (env-var push) is the gating step.
