# Ridendine — Security Review

**Target:** https://ridendine.ca (production) + source at `C:\RIDENDINE\ridendine-marketplace`
**Date:** 2026-06-17
**Reviewer:** Claude Code (authorized by the application owner, sean@cashflowarmy.com)
**Type:** External black-box assessment (passive/non-intrusive) + source-code remediation
**Stack:** Next.js (App Router) on Vercel · Supabase (Postgres + Auth + PostgREST) · Stripe · Sentry · Upstash Redis

---

## 1. Executive summary

Ridendine's externally observable security posture is **above average for an early-stage product**. HTTPS/HSTS, the core security headers, Supabase Row-Level Security (RLS), and secret hygiene are all in good shape — notably, **no secret keys were found leaked in client code**, and RLS actively blocks anonymous reads/writes of private tables.

The review identified **6 issues**, none critical. The most material were a weakened Content-Security-Policy (scripts allowed `unsafe-inline`/`unsafe-eval`) and a public `reviews` table that exposed customer/order linkage IDs to the anonymous API key. All six have source-level fixes applied (uncommitted, pending your review/deploy).

| Severity | Count | Issues |
|----------|-------|--------|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 1 | CSP allows `unsafe-inline` / `unsafe-eval` for scripts |
| Low | 4 | Health endpoint info disclosure; reviews PII columns; `X-Powered-By` header; broad anon `GRANT ALL` (RLS-only protection) |
| Informational | 1 | Checkout-idempotency migration flagged `degraded` |

**Current data note:** the database appears to contain **seed/test data** (placeholder UUID patterns like `a1a1a1a1-…`, `11111111-…`). No real customer PII was observed or extracted. Fixing the data-exposure items before real customers onboard is the priority.

---

## 2. Scope & methodology

**In scope:** the public production site and its externally reachable API/Supabase surface, plus the application source code for remediation.

**Methodology — passive / non-intrusive only:**
- HTTP/HTTPS response + redirect inspection (security headers, TLS posture, cookies).
- Client-asset analysis: downloaded the homepage + 15 JS bundles (~800 KB) and scanned for leaked secrets.
- Sensitive-path probing (GET only): `.env`, `.git`, `package.json`, config, `robots.txt`, `sitemap.xml`, `/api/*`.
- Supabase RLS testing with the **public anon key**: schema-root access, per-table read attempts (counts only — no data dumped), and a single empty INSERT probe (rejected, created nothing).
- Source review of the relevant Next.js config, middleware, API routes, and Supabase migrations.

**Explicitly NOT performed** (would require explicit authorization / credentials): authenticated-session testing, injection/fuzzing, brute force, destructive writes, denial-of-service, and any test against the admin apps (`chef-admin`, `ops-admin`, `driver-app`).

**Limitations:** black-box external testing reflects only what is observable without credentials. Some private tables returned `200 / 0 rows` to the anon key — correct behavior for RLS filtering an empty table, but indistinguishable from "RLS off on an empty table" from the outside. A full authenticated RLS audit is recommended as a follow-up.

---

## 3. What is already done well

- **HTTPS enforced** — `http://` → `308` redirect to `https://`.
- **HSTS** — `max-age=63072000; includeSubDomains; preload` (2 years, preload-eligible).
- **Security headers present** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`, and a real Content-Security-Policy.
- **No secrets in client code** — scanned for Stripe secret keys (`sk_…`/`rk_…`), Supabase `service_role`, AWS keys, and private-key blocks: **none found**. Only the publishable/anon keys (intended to be public) are present.
- **No exposed sensitive files** — `.env`, `.env.local`, `.git/config`, `package.json`, `next.config.js` all return `404`.
- **Supabase RLS enforced** — anonymous INSERT rejected with `42501: new row violates row-level security policy`; private tables (`profiles`, `users`, `orders`, `customers`, `notifications`) return 0 rows / 404 to the anon key; the schema-introspection root requires `service_role`.
- **Anonymous sign-ins disabled** (`anonymous_provider_disabled`).
- **Auth correctness** — middleware uses `supabase.auth.getUser()` (server-verified JWT) for protect/redirect decisions, not the spoofable `getSession()`.
- **Payments via Stripe** — card data offloaded, reducing PCI scope.

---

## 4. Findings & remediation

### 4.1 — [Medium] CSP allowed `unsafe-inline` and `unsafe-eval` for scripts

**Observed CSP (script-src):**
```
script-src 'self' 'unsafe-eval' 'unsafe-inline' js.stripe.com va.vercel-scripts.com
```
`'unsafe-inline'` lets an injected inline `<script>` execute, and `'unsafe-eval'` permits `eval()`-class execution — together these substantially weaken CSP as an XSS mitigation, which is the header's primary purpose.

**Risk:** if any XSS sink exists, this CSP would not contain it.

**Fix applied:** replaced the static CSP with a **per-request nonce + `'strict-dynamic'`** policy. `'unsafe-eval'` is now permitted in development only; production ships neither `unsafe-inline` nor `unsafe-eval` for scripts. `style-src` retains `'unsafe-inline'` (Next.js injects inline styles; inline *style* injection is far lower risk than scripts). Implemented as an opt-in `cspBuilder` on the shared auth-middleware factory so the nonce reaches Next.js's renderer.
- `packages/auth/src/middleware.ts` (new `cspBuilder` option; nonce injected into request headers + set on every response)
- `apps/web/src/middleware.ts` (`buildCsp()` wired in)
- `apps/web/next.config.js` (static CSP removed)

**Required validation:** CSP changes can break third-party scripts. **Deploy to a Vercel preview and complete a test checkout** (Stripe), verifying no CSP violations in the browser console, before promoting to production.

---

### 4.2 — [Low] `/api/health` information disclosure

**Observed:** the public, unauthenticated endpoint returned environment, `version`, **`buildSha` (exact git commit)**, infrastructure provider (`upstash-redis`), and per-dependency health — including `"checkoutIdempotencyMigration":"degraded"`.

**Risk:** hands an attacker a precise fingerprint (commit to diff against, infra, and a self-declared "degraded" subsystem) to prioritize attacks.

**Fix applied** (`apps/web/src/app/api/health/route.ts`): public callers now receive a minimal `{ ok, service, readiness }`; full diagnostics require an `x-health-token` header matching `HEALTH_CHECK_TOKEN`. The HTTP **status code still reflects readiness** (200/503), so external uptime monitors keep working without a token.

**Required action:** set `HEALTH_CHECK_TOKEN` (random secret) in Vercel for your monitoring to read detailed health.

---

### 4.3 — [Low] `reviews` exposed `customer_id` / `order_id` to the anon key

**Observed:** policy `"Public can view reviews" … USING (is_visible = true)` (migration `00017`) makes reviews publicly readable — intended — but RLS cannot filter **columns**, so the anon REST API exposed `customer_id` and `order_id`, linking public reviews to private customers/orders and enabling enumeration/correlation.

**Fix applied** (`supabase/migrations/00049_review_pii_column_lockdown_and_rls_enforcement.sql`): column-level lockdown — `REVOKE SELECT ON reviews FROM anon, authenticated`, then `GRANT SELECT` only on safe display columns (`id, storefront_id, rating, comment, chef_response, chef_responded_at, is_visible, created_at`). Reviews stay public; the linkage IDs are hidden. The web app is unaffected because it reads reviews exclusively via the **service-role admin client** (`apps/web/src/app/api/reviews/route.ts`), which bypasses these restrictions.

---

### 4.4 — [Low] `X-Powered-By: Next.js`

**Observed:** framework disclosure header on all responses.
**Fix applied:** `poweredByHeader: false` in `apps/web/next.config.js`.

---

### 4.5 — [Low] Broad anon `GRANT ALL` leaves RLS as the only barrier

**Observed:** migration `00029` ran `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role` plus `ALTER DEFAULT PRIVILEGES … GRANT ALL`. This means every table — current and future — is reachable by the public role at the privilege layer, with **RLS as the sole protection**. RLS is currently enforcing correctly (verified), but a single table created without RLS enabled would be fully exposed.

**Fix applied** (in `00049`): a defensive block that `ENABLE ROW LEVEL SECURITY` on every `public` base table not already protected (no-op where already on; `service_role` bypasses RLS, so application/admin access is unaffected).

**Recommendation (follow-up):** revisit the `GRANT ALL` model — narrow default privileges so new tables are private-by-default rather than relying on remembering to enable RLS each time.

---

### 4.6 — [Informational] Checkout-idempotency migration `degraded`

**Observed:** health reported `"checkoutIdempotencyMigration":"degraded"`, driven by `CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED !== 'true'`. The migration itself (`00018_phase_c_checkout_idempotency`) exists in the repo.

**Risk:** broken/absent checkout idempotency can cause **double charges or duplicate orders** — a reliability *and* financial-integrity concern. (It also no longer leaks publicly after fix 4.2.)

**Required action:** confirm `00018` is applied in production, then set `CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED=true` in Vercel.

---

## 5. Action checklist (owner)

- [ ] Review the uncommitted source changes (4 files) and the new migration `00049`.
- [ ] Run `pnpm install && pnpm --filter web typecheck && pnpm --filter @ridendine/auth test && pnpm --filter web build`.
- [ ] **Deploy to a Vercel preview; complete a test Stripe checkout; confirm zero CSP console violations.** Then promote.
- [ ] Apply migration `00049` to production (`supabase db push` / your flow).
- [ ] Reconcile which migrations are actually applied in production (prod appeared behind the repo — the anon-reviews policy dropped in `00042` was still live).
- [ ] Set Vercel env vars: `HEALTH_CHECK_TOKEN` (random secret), `CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED=true` (after confirming `00018`).

## 6. Recommended follow-ups (not yet done)

- Apply the same CSP/header hardening to `chef-admin`, `ops-admin`, `driver-app` (they share the middleware factory — small change each).
- **Authenticated RLS audit:** with a throwaway test account, verify every user-scoped policy actually isolates per-user data (e.g., user A cannot read user B's orders). Black-box testing cannot confirm this.
- Tighten the `00029` privilege model toward private-by-default.
- Consider adding `/.well-known/security.txt` with a contact for vulnerability reports.

---

## 7. Evidence appendix (selected, non-sensitive)

- `http://ridendine.ca` → `HTTP/1.0 308` → `https://ridendine.ca/`.
- Secret scan over homepage + 15 bundles: 0 matches for `sk_(live|test)_…`, `rk_…`, `service_role`, `AKIA…`, `PRIVATE KEY`.
- Sensitive paths: `.env` `404`, `.env.local` `404`, `.git/config` `404`, `package.json` `404` ; `robots.txt` `200`, `sitemap.xml` `200`, `/api/health` `200`.
- Supabase anon key role claim = `anon`; `/auth/v1/signup` → `422 anonymous_provider_disabled`; anon INSERT on `notifications` → `401 / 42501` RLS violation.
- Anon table reads: `menu_items` (18 rows — intended public), `reviews` (3 rows, exposed `customer_id`/`order_id`); `orders`/`customers`/`drivers`/`carts`/`notifications`/`order_items` returned 0 rows; `profiles`/`users`/`payments` returned 404.

*Prepared 2026-06-17. All testing was passive and authorized by the application owner.*
