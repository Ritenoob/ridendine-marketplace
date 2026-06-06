# Phase 13 Live Super Admin Role Fixture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the seeded test account is wired as a full multi-app `super_admin` and can exercise safe live Ops read surfaces without mutating production data.

**Architecture:** Add local contract tests for seed/bootstrap super-admin setup, prove `super_admin` is allowed for every platform capability, and add a read-only production smoke runner for authenticated live role fixtures. Keep live probes to GET requests and existing app-owned login flows.

**Tech Stack:** Next.js app APIs, Supabase Auth cookies, CommonJS smoke/audit scripts, Node test runner, Vitest/Jest package tests, Vercel production deployments.

---

### Task 1: Plan Checkpoint

**Files:**
- Create: `docs/superpowers/plans/2026-06-06-phase-13-live-super-admin-role-fixture.md`

- [x] **Step 1: Save this implementation plan**

Write this file so Phase 13 has a repo-tracked execution plan before implementation.

- [ ] **Step 2: Commit the plan**

Run:

```powershell
git add docs/superpowers/plans/2026-06-06-phase-13-live-super-admin-role-fixture.md
git commit -m "docs(plan): add phase 13 live super-admin fixture plan"
git push
```

Expected: commit created and `origin/master` receives it.

### Task 2: Super Admin Local Capability Proof

**Files:**
- Modify: `apps/ops-admin/src/__tests__/platform-wiring.test.ts`
- Test: `apps/ops-admin/src/__tests__/platform-wiring.test.ts`

- [ ] **Step 1: Write the failing test**

Import `PLATFORM_CAPABILITIES` and add a test that iterates every capability:

```ts
it('allows super_admin for every platform API capability', () => {
  for (const capability of PLATFORM_CAPABILITIES) {
    expect(hasPlatformApiCapability(actor(ActorRole.SUPER_ADMIN), capability)).toBe(true);
  }
});
```

- [ ] **Step 2: Run the focused test**

Run:

```powershell
pnpm --filter @ridendine/ops-admin test -- platform-wiring.test.ts --runInBand
```

Expected red: fail until the import/test is wired correctly, or pass only if current capability matrix already satisfies it.

- [ ] **Step 3: Keep implementation minimal**

If the test fails because a capability excludes `super_admin`, update only the capability matrix in `packages/engine/src/services/platform-api-guards.ts` so the seeded full admin can perform every platform capability. If it already passes, keep production code unchanged.

- [ ] **Step 4: Re-run the focused test**

Run the same command. Expected: test passes.

### Task 3: Seed And Bootstrap Contract Audit

**Files:**
- Create: `scripts/audit/sean-super-admin-fixture.cjs`
- Create: `scripts/audit/sean-super-admin-fixture.test.cjs`
- Modify: `package.json`
- Modify: `scripts/wiring/verify-known-wiring-fixes.cjs`
- Docs: `docs/wiring/SEAN_SUPER_ADMIN_FIXTURE.md`, `docs/architecture/codebase-map/wiring/SEAN_SUPER_ADMIN_FIXTURE.md`, `docs/obsidian/codebase-map/Sean Super Admin Fixture.md`

- [ ] **Step 1: Write the failing Node test**

Create assertions that the audit module exports contract rows proving:

```js
[
  'auth.users is_super_admin true',
  'auth metadata role super_admin',
  'platform_users role super_admin active',
  'customer row exists',
  'chef_profile approved',
  'driver approved',
  'driver vehicle active',
  'bootstrap script upserts platform super_admin',
]
```

Expected red: module missing.

- [ ] **Step 2: Implement the audit**

Parse `supabase/seeds/seed.sql`, `scripts/seed-sean-super-admin.sql`, and `scripts/bootstrap-super-admin.mjs` for deterministic contract tokens. Generate the three markdown outputs and fail on any missing token.

- [ ] **Step 3: Add root script and wiring gate**

Add:

```json
"audit:sean-super-admin": "node scripts/audit/sean-super-admin-fixture.cjs"
```

Add a known wiring fix check that requires the audit to report all contracts passing.

- [ ] **Step 4: Run tests**

Run:

```powershell
node --test scripts/audit/sean-super-admin-fixture.test.cjs
pnpm audit:sean-super-admin
pnpm test:wiring-fixes
```

Expected: all pass.

### Task 4: Read-Only Live Role Fixture Smoke

**Files:**
- Create: `scripts/smoke/live-role-fixture-smoke.cjs`
- Create: `scripts/smoke/live-role-fixture-smoke.test.cjs`
- Modify: `package.json`
- Docs: `docs/wiring/LIVE_ROLE_FIXTURE_SMOKE.md`, `docs/architecture/codebase-map/wiring/LIVE_ROLE_FIXTURE_SMOKE.md`, `docs/obsidian/codebase-map/Live Role Fixture Smoke.md`

- [ ] **Step 1: Write the failing smoke tests**

Use fake `fetch` responses to prove the runner:

```js
// fails when credentials are required and absent
// logs into customer, driver, and ops app-owned login routes
// uses cookies for authenticated GET checks
// marks only read-only GET probes as live-safe
// fails on 403 for the super_admin Ops probes
```

Expected red: module missing.

- [ ] **Step 2: Implement the live smoke runner**

Reuse app URL and session patterns from `scripts/smoke/runtime-contract-smoke.cjs`. Probe read-only contracts only:

- customer `/api/profile`, `/api/orders`, `/api/loyalty`
- driver `/api/driver`, `/api/deliveries`, `/api/offers`, `/api/earnings`
- ops `/api/engine/health`, `/api/ops/live-board`, `/api/orders`, `/api/drivers`, `/api/chefs`, `/api/engine/dispatch`, `/api/engine/dispatch/offer-history`, `/api/engine/finance`, `/api/engine/refunds`, `/api/engine/payouts`, `/api/engine/payouts/instant`, `/api/team`, `/api/export?type=orders`

All probes must be GET and expect `200` JSON, except explicitly documented safe validation responses if the endpoint requires query params.

- [ ] **Step 3: Add root script**

Add:

```json
"smoke:live-role-fixture": "node scripts/smoke/live-role-fixture-smoke.cjs"
```

- [ ] **Step 4: Run tests**

Run:

```powershell
node --test scripts/smoke/live-role-fixture-smoke.test.cjs
pnpm smoke:live-role-fixture -- --require-auth
```

Expected: local tests pass; production read-only live smoke passes using the seeded credentials supplied via environment variables.

### Task 5: Documentation, Release, And Vercel Verification

**Files:**
- Modify: `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\17 - Complete Program Wiring and Schematic Audit.md`
- Modify generated Phase 13 docs from Tasks 3 and 4

- [ ] **Step 1: Run full verification**

Run:

```powershell
node --test scripts/audit/sean-super-admin-fixture.test.cjs scripts/smoke/live-role-fixture-smoke.test.cjs
pnpm audit:sean-super-admin
pnpm smoke:live-role-fixture -- --require-auth
pnpm test:wiring-fixes
pnpm audit:ops-authz
pnpm audit:ops-negative-authz
pnpm audit:guards
pnpm smoke:prod:contracts -- --require-auth
git diff --check
pnpm build
```

Expected: exit 0.

- [ ] **Step 2: Commit and push implementation**

Run:

```powershell
git add package.json apps/ops-admin/src/__tests__/platform-wiring.test.ts scripts/audit scripts/smoke scripts/wiring/verify-known-wiring-fixes.cjs docs/wiring docs/architecture/codebase-map/wiring docs/obsidian/codebase-map
git commit -m "test(auth): add live super-admin role fixture proof"
git push
```

Expected: `origin/master` matches local `HEAD`.

- [ ] **Step 3: Verify Vercel production deployments**

Confirm all four Vercel projects deploy the implementation commit, are `READY`, and are aliased to:

- `ridendine.ca`
- `chef.ridendine.ca`
- `driver.ridendine.ca`
- `ops.ridendine.ca`

- [ ] **Step 4: Run post-alias production verification**

Run:

```powershell
pnpm smoke:live-role-fixture -- --require-auth
pnpm smoke:prod:contracts -- --require-auth
```

Then check Vercel runtime logs for error/fatal entries on all four deployments.

- [ ] **Step 5: Update Obsidian master note**

Record Phase 13 coverage, commit, deployment IDs, and live verification evidence in the master schematic note.
