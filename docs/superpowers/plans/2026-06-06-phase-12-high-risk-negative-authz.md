# Phase 12 High-Risk Negative Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add endpoint-level negative authorization proof for every Phase 11 high-risk Ops/control-plane API method.

**Architecture:** Keep route behavior unchanged. Add a generated audit matrix that maps each high-risk route/method to its denial model, then add Jest/Node tests that validate the matrix against the real platform guard and processor-token helpers. Regenerate wiring and Obsidian docs so the denial matrix is part of the permanent schematic.

**Tech Stack:** Next.js App Router, Jest for ops-admin route-adjacent tests, Node `--test` for audit modules, existing `@ridendine/engine` platform guard, existing `@ridendine/utils` processor auth helper, Vercel production verification.

---

### Task 1: Add Negative Authorization Audit Module

**Files:**
- Create: `scripts/audit/high-risk-ops-negative-authz.cjs`
- Create: `scripts/audit/high-risk-ops-negative-authz.test.cjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing Node test**

Create `scripts/audit/high-risk-ops-negative-authz.test.cjs` with assertions that:

```js
const test = require('node:test');
const assert = require('node:assert/strict');

test('declares negative authorization contracts for every high-risk Phase 11 method', () => {
  const {
    endpointNegativeContracts,
    validateNegativeContracts,
  } = require('./high-risk-ops-negative-authz.cjs');
  const result = validateNegativeContracts();
  assert.equal(result.failures.length, 0);
  assert.ok(endpointNegativeContracts.length >= 30);
});
```

- [ ] **Step 2: Run the red test**

Run:

```powershell
. .\scripts\tools\ensure-node-pnpm.ps1
$tool = Use-RidendineNodePnpm -RepoRoot (Get-Location) -Quiet
& $tool.NodeExe --test scripts\audit\high-risk-ops-negative-authz.test.cjs
```

Expected: fail because `high-risk-ops-negative-authz.cjs` does not exist.

- [ ] **Step 3: Implement the audit module**

Create `scripts/audit/high-risk-ops-negative-authz.cjs` exporting:

- `endpointNegativeContracts`
- `validateNegativeContracts`
- `generateMarkdown`
- `writeDocs`

The module must cross-check route/method coverage against `scripts/audit/high-risk-ops-authz-contracts.cjs`, require duplicate-free coverage, require platform denied-role fixtures, require processor denied-header fixtures, require command-center env-gate coverage, and require Stripe signature denial coverage.

- [ ] **Step 4: Add script entry**

Add this package script:

```json
"audit:ops-negative-authz": "node scripts/audit/high-risk-ops-negative-authz.cjs"
```

- [ ] **Step 5: Run green Node audit**

Run:

```powershell
& $tool.NodeExe --test scripts\audit\high-risk-ops-negative-authz.test.cjs
& $tool.PnpmCmd audit:ops-negative-authz
```

Expected: tests pass and generated docs report every endpoint denial contract passing.

### Task 2: Add Ops Endpoint Denied-Response Jest Tests

**Files:**
- Create: `apps/ops-admin/src/__tests__/high-risk-ops-negative-authz.test.ts`

- [ ] **Step 1: Write the failing Jest test**

Create a Jest test that imports the Phase 12 matrix and verifies:

- platform contracts return 401 for `null` actor through `guardPlatformApi`
- platform denied-role fixtures return 403 through `guardPlatformApi`
- processor denied header fixtures fail `validateEngineProcessorHeaders`
- command-center contracts include disabled-env 403 and `team_manage`
- Stripe contracts include missing/invalid signature 400

- [ ] **Step 2: Run the red Jest test**

Run:

```powershell
& $tool.PnpmCmd --filter @ridendine/ops-admin test -- high-risk-ops-negative-authz.test.ts --runInBand
```

Expected: fail until the matrix module exists and includes all required data.

- [ ] **Step 3: Run the green Jest test**

Run the same command. Expected: pass.

### Task 3: Wire Into Known Checks And Docs

**Files:**
- Modify: `scripts/wiring/verify-known-wiring-fixes.cjs`
- Generated: `docs/wiring/HIGH_RISK_OPS_NEGATIVE_AUTHZ.md`
- Generated: `docs/architecture/codebase-map/wiring/HIGH_RISK_OPS_NEGATIVE_AUTHZ.md`
- Generated: `docs/obsidian/codebase-map/High Risk Ops Negative Authorization.md`
- Modify: `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\17 - Complete Program Wiring and Schematic Audit.md`

- [ ] **Step 1: Add known-fix gate**

Import the Phase 12 audit module, require zero failures, require at least 30 endpoint-method contracts, and require all three generated docs to exist.

- [ ] **Step 2: Regenerate docs**

Run:

```powershell
& $tool.PnpmCmd audit:ops-negative-authz
& $tool.PnpmCmd docs:wiring
& $tool.PnpmCmd docs:obsidian-architecture
& $tool.PnpmCmd docs:api-guard-snapshot
```

- [ ] **Step 3: Update the Obsidian master schematic**

Record Phase 12 coverage, verification evidence, and latest commit/deployment placeholders. Replace the remaining hardening item about high-risk negative authorization with the next deeper item: full live role-fixture exercising with seeded non-admin accounts.

### Task 4: Verify, Commit, Push, Deploy

**Files:** all changed files from Tasks 1-3.

- [ ] **Step 1: Run local verification**

Run:

```powershell
& $tool.NodeExe --test scripts\audit\high-risk-ops-negative-authz.test.cjs
& $tool.PnpmCmd audit:ops-negative-authz
& $tool.PnpmCmd --filter @ridendine/ops-admin test -- high-risk-ops-negative-authz.test.ts --runInBand
& $tool.PnpmCmd test:wiring-fixes
& $tool.PnpmCmd audit:ops-authz
& $tool.PnpmCmd audit:guards
& $tool.PnpmCmd smoke:prod:contracts -- --require-auth
git diff --check
& $tool.PnpmCmd build
```

- [ ] **Step 2: Commit and push**

Commit message:

```bash
test(ops): add high-risk negative authz matrix
```

- [ ] **Step 3: Verify Vercel**

Confirm the four production deployments for the new commit are READY, aliased to the four custom domains, pass production smoke, pass runtime contract smoke, and have no error/fatal runtime logs in the checked window.

