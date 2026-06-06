# Phase 9 Runtime Contract Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add production-safe runtime proof for RidenDine route/API wiring so the Phase 9 audit can show the four apps are wired beyond broad smoke samples.

**Architecture:** Add a small CommonJS contract module plus a Node-based smoke runner that uses built-in `fetch`, read-only `GET` requests, and optional app-owned login sessions. Keep PowerShell production smoke as the broad release gate and add a separate `smoke:prod:contracts` script for Phase 9 runtime proof.

**Tech Stack:** Node 20, CommonJS, PowerShell release tooling, Vercel production domains, generated wiring docs, Obsidian audit notes.

---

### Task 1: Runtime Smoke Contract Module

**Files:**
- Create: `scripts/smoke/runtime-contracts.cjs`
- Create: `scripts/smoke/runtime-contracts.test.cjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

Create `scripts/smoke/runtime-contracts.test.cjs` with assertions that the contract exports:
- exactly 17 `authIntentPages` entries matching the medium review list in `docs/wiring/MISSING_WIRING_REPORT.md`
- public JSON API checks for health and marketplace-read endpoints
- protected API checks for the chef storefront endpoint and the app-owned authenticated endpoints already used in broad production smoke

Run: `node --test scripts/smoke/runtime-contracts.test.cjs`
Expected: fail because `scripts/smoke/runtime-contracts.cjs` does not exist.

- [ ] **Step 2: Implement the contract module**

Create `scripts/smoke/runtime-contracts.cjs` with:
- base URL keys for customer, chef, driver, and ops
- `authIntentPages`
- `publicJsonApis`
- `protectedJsonApis`
- helper exports `apps`, `authIntentPages`, `publicJsonApis`, `protectedJsonApis`, and `allRuntimeContracts`

- [ ] **Step 3: Add the package script**

Add `"smoke:prod:contracts": "node scripts/smoke/runtime-contract-smoke.cjs"` to the root `package.json`.

- [ ] **Step 4: Run the test**

Run: `node --test scripts/smoke/runtime-contracts.test.cjs`
Expected: pass.

### Task 2: Runtime Contract Smoke Runner

**Files:**
- Create: `scripts/smoke/runtime-contract-smoke.cjs`
- Create: `scripts/smoke/runtime-contract-smoke.test.cjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/smoke/runtime-contract-smoke.test.cjs` with fake `fetch` responses that prove:
- public pages must return status 200 and HTML
- protected pages must redirect to or render `/auth/login` when unauthenticated
- public JSON APIs must return JSON with allowed status codes
- protected JSON APIs must not return 200 when unauthenticated
- authenticated checks are skipped only when no credentials are present and `--require-auth` is absent

Run: `node --test scripts/smoke/runtime-contract-smoke.test.cjs`
Expected: fail because the runner module does not exist.

- [ ] **Step 2: Implement the runner**

Create `scripts/smoke/runtime-contract-smoke.cjs` with:
- `runRuntimeContractSmoke(options)`
- `createAppSession(app, credentials)`
- `checkPageContract(contract, session)`
- `checkPublicJsonApi(contract)`
- `checkProtectedJsonApi(contract, session)`
- CLI flags `--require-auth`, `--skip-auth`, `--json`, and `--timeout-ms`
- no write requests; only `GET` for contract checks and `POST /api/auth/login` for app-owned smoke sessions

- [ ] **Step 3: Run the test**

Run: `node --test scripts/smoke/runtime-contract-smoke.test.cjs`
Expected: pass.

### Task 3: Documentation And Wiring Gates

**Files:**
- Modify: `scripts/wiring/verify-known-wiring-fixes.cjs`
- Modify: `docs/wiring/*` via `pnpm docs:wiring`
- Modify: `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\17 - Complete Program Wiring and Schematic Audit.md`

- [ ] **Step 1: Add the failing wiring gate**

Add a check that Phase 9 runtime contracts cover every medium auth-intent row from `docs/wiring/MISSING_WIRING_REPORT.md`.

Run: `pnpm test:wiring-fixes`
Expected: pass only after Task 1 contracts are present.

- [ ] **Step 2: Regenerate docs**

Run: `pnpm docs:wiring`
Expected: generated wiring docs remain stable except for deliberate contract/smoke references if added.

- [ ] **Step 3: Update Obsidian audit**

Record the Phase 9 contract-smoke scope, command, result, and remaining hardening items in the master audit note.

### Task 4: Verification, Push, And Production Proof

**Files:**
- Commit all Phase 9 repo changes.

- [ ] **Step 1: Run focused checks**

Run:
- `node --test scripts/smoke/runtime-contracts.test.cjs scripts/smoke/runtime-contract-smoke.test.cjs`
- `pnpm smoke:prod:contracts -- --require-auth`
- `pnpm test:wiring-fixes`
- `pnpm audit:guards`
- `git diff --check`
- `pnpm build`

- [ ] **Step 2: Commit and push**

Commit message: `test(smoke): add phase 9 runtime contracts`

Push: `git push origin master`

- [ ] **Step 3: Verify Vercel production**

Confirm all four Vercel projects deploy the new commit, custom domains are READY and aliased, then run:
- `pnpm smoke:prod`
- `pnpm smoke:prod:contracts -- --require-auth`

- [ ] **Step 4: Runtime logs**

Check Vercel runtime logs for error/fatal events on the four new deployment IDs after the production smoke checks.
