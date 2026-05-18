# Monitoring Runbook

How the platform is watched and how on-call responds when something breaks. Scoped to `docs/plans/2026-05-18-production-readiness-stabilization.md` Task 11 + Truth 2 of the readiness plan.

## Signals and their owners

| Signal | Source | Watches | On-call recipient | SLA |
|--------|--------|---------|--------------------|-----|
| `/api/health` non-200 on any of 4 apps | UptimeRobot (external) | All four `*.ridendine.ca` health endpoints | Sean's email + SMS | ≤60s detection, ≤5 min triage |
| 5xx response or unhandled exception | Sentry | All four apps, server + edge + client | Sean's email (`sentry@cashflowarmy.com` or equivalent) | ≤60s |
| Stripe webhook delivery failure | Stripe Dashboard | `webhook.endpoint_id` for `ridendine.ca/api/webhooks/stripe` and `ops.ridendine.ca/api/stripe/webhook` | Stripe email + Sentry mirror | ≤24h aggregate alert; 0 acceptable in normal ops |
| Engine processor 401 (cron blocked) | Custom: synthetic monitor → `GET /api/engine/processors/sla` with valid Bearer | Resolves cron infra silently breaking | Sean's email | ≤5 min |
| `processorRuns.<name>.lastSuccessAt` staleness | Synthetic monitor → `GET /api/engine/health` parses payload | Resolves cron firing but failing repeatedly | Sean's email | ≤10 min after expected schedule |
| Daily reconciliation diff | `apps/ops-admin/src/app/api/cron/reconciliation-daily/route.ts` | Stripe ↔ `ledger_entries` mismatch | `FINANCE_RECONCILIATION_EMAIL` env var | ≤4h after 05:30 UTC daily |

## UptimeRobot setup

**Why UptimeRobot:** free tier covers 4 monitors at 5-min interval — exactly what soft-launch needs. Upgrade to paid tier or BetterStack/Vercel monitors when traffic justifies sub-minute granularity.

Create 4 monitors, one per app:

| Monitor name | URL | Method | Expected | Interval |
|--------------|-----|--------|----------|----------|
| Ridendine Web | `https://ridendine.ca/api/health` | HTTP(s) keyword | Body contains `"status":"up"` (or similar — verify against actual `apps/web/src/app/api/health/route.ts` response) | 5 min |
| Chef Admin | `https://chef.ridendine.ca/api/health` | HTTP(s) keyword | Same | 5 min |
| Ops Admin | `https://ops.ridendine.ca/api/health` | HTTP(s) keyword | Same | 5 min |
| Driver App | `https://driver.ridendine.ca/api/health` | HTTP(s) keyword | Same | 5 min |

**Alert contacts:**
- Primary: `sean@cashflowarmy.com` (instant email)
- Secondary: SMS to Sean's phone (configure UptimeRobot SMS integration)
- Alert trigger: 1 consecutive failure (i.e., one 5-min cycle of red)
- Resend: every 30 min until resolved

## Sentry setup

**Project:** single Sentry project for all 4 apps; tagged by `initialScope.tags.app` (per `apps/<name>/sentry.*.config.ts`). Filter in Sentry UI with `app:web`, `app:chef-admin`, `app:ops-admin`, `app:driver-app`.

**Env var:** `NEXT_PUBLIC_SENTRY_DSN` set per Vercel project (4 projects, same DSN value).

**Alert rules:**
- Severity `error` or `fatal` → instant email to Sean (no rate-limit during soft-launch — adjust once volume known).
- New issue (first occurrence of an error fingerprint) → email immediately.
- Release-tag tracking: set `SENTRY_RELEASE` to git SHA at build time so issues map to deploys.

**Sample rate:**
- `tracesSampleRate`: 0.1 in production, 1.0 in dev — already set in config.
- `replaysOnErrorSampleRate`: 1.0 in production — capture session replay only when an error occurs.
- `replaysSessionSampleRate`: 0 — no full-session recording (privacy + cost).

## Stripe webhook failure alert

Stripe Dashboard → Developers → Webhooks → `webhook.endpoint_id` for `ridendine.ca/api/webhooks/stripe`:

- Toggle "Email me when delivery fails" → ON
- Set "after X consecutive failures" → 1
- Recipient: `sean@cashflowarmy.com`

Repeat for the ops-admin finance webhook at `ops.ridendine.ca/api/stripe/webhook` once Task 8 (live keys cutover) configures it.

## Synthetic monitor: engine processor freshness

UptimeRobot keyword monitor against `https://ops.ridendine.ca/api/engine/health`:

- Method: HTTP GET (use `keyword` mode)
- Headers: include the ops-admin session cookie OR provision a long-lived token if Sean has one set up; alternatively poll a dedicated public-safe endpoint that returns the same processor freshness signal.
- Expected: response body includes `"readiness":` AND `"processorRuns":{"sla":{"lastSuccessAt":` with a timestamp within the last 5 minutes.

If `lastSuccessAt` falls more than 5 minutes behind expected schedule (SLA processor runs every minute per `apps/ops-admin/vercel.json` cron), email Sean.

A simpler proxy: a synthetic GET to `/api/engine/processors/sla` with a valid Bearer header expecting 200. Doesn't catch silent succeed-with-wrong-data failures, but catches the 401 regression cleanly.

## Daily reconciliation

`apps/ops-admin/src/app/api/cron/reconciliation-daily/route.ts` runs at 05:30 UTC daily. Configure:

- `FINANCE_RECONCILIATION_EMAIL`: Sean's email (or finance owner). Set in ops-admin Vercel env, production scope.
- Reconciliation route must emit an email when diff is non-zero (verify implementation; if absent, add per readiness plan Task 11 implementation work).
- Output: per-day diff report summarizing Stripe payouts/charges vs `ledger_entries` totals. Mismatches > $0.01 trigger an exception email.

## Deliberate-misconfiguration drill (Truth 2 verification)

Per the readiness plan's Goal Verification Truth 2, monitoring must be proven live while the system is live:

1. Confirm the lifecycle E2E test (`e2e/lifecycle/full-marketplace-lifecycle.spec.ts` once Task 5 is implemented) is queued or running against the production-scope endpoints.
2. On the ops-admin Vercel project, edit `CRON_SECRET` to an invalid value (e.g. `INVALID_DRILL_<timestamp>`). Save without redeploying — or redeploy to force live propagation.
3. Wait for next cron tick (≤60s for SLA). Production cron will return 401 from `/api/engine/processors/sla`.
4. Expect:
   - Sentry: error issue logged within 60s with tag `app:ops-admin`.
   - Synthetic monitor: alert email within 5 min reporting cron 401.
   - UptimeRobot: no alert (health endpoint still returns 200; only the processor is broken — this is correct behavior since `/api/health` doesn't auth-check the processor token).
5. Record the timestamps and recipient confirmation here in this runbook (append a "Drill log" subsection per drill date).
6. Restore the env var to its valid value, redeploy, verify next SLA tick returns 200.

Drill log:

| Date | Drill type | Sentry timestamp | UptimeRobot timestamp | Synthetic monitor timestamp | Recovered at | Notes |
|------|------------|-------------------|------------------------|-----------------------------|---------------|-------|
| _(future)_ | — | — | — | — | — | First drill scheduled after Task 11 operator setup completes |

## Incident response — first-pass triage

When an alert fires:

1. **Check Vercel deployment status** for the affected app — if a deploy in the last 30 min, suspect the deploy.
2. **Open Sentry** for the affected app tag — look for new issues since last green.
3. **Check Supabase status** at `status.supabase.com` — if Supabase is degraded, our app stack will trail.
4. **Check Stripe status** at `status.stripe.com` — webhook failures often track Stripe outages.
5. If an actual incident, follow `docs/BACKUP_AND_ROLLBACK.md` for rollback procedure.

Escalation:
- L1 (Sean) → on-call rotation: TBD; soft-launch is solo.
- L2 (engineering on-call): TBD; soft-launch is solo.
- L3 (external infra): Vercel support, Supabase support, Stripe support — credentials in 1Password (or wherever the team stores them — confirm).

## Out of scope (for now)

- PagerDuty / Opsgenie integration — soft-launch is one-person on-call; email + SMS suffice.
- Distributed tracing across the engine — Sentry traces handle in-process; cross-service tracing comes after soft-launch.
- Custom Grafana / Datadog dashboards — Sentry + Stripe + Vercel built-in dashboards cover soft-launch needs.
- Log aggregation (Logflare, Datadog Logs) — Vercel runtime logs + Sentry breadcrumbs cover initial bug investigation.

## Update procedure

When monitoring infrastructure changes:
1. Update the appropriate "Signals and their owners" row.
2. If a new env var is added, document it in `docs/ENVIRONMENT_VARIABLES.md`.
3. If the alert recipient changes, update every reference in this doc + the Vercel env var holding the email.
4. After any deliberate drill, append a row to "Drill log."
