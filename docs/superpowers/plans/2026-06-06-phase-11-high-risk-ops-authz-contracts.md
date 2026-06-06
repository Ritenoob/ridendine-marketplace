# Phase 11 High-Risk Ops Authorization Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a permanent audit gate proving high-risk Ops/control-plane APIs still enforce their expected authorization boundaries.

**Architecture:** Keep production route behavior unchanged. Add a CommonJS contract module that statically inspects high-risk route files for expected method exports, actor/context guards, capability gates, processor-token checks, Stripe signature verification, and command-center environment gates. Generate markdown documentation into the wiring mirrors and Obsidian codebase map so the contract is visible in the architecture record.

**Tech Stack:** Node 20 test runner, CommonJS audit scripts, Next.js route source files, PowerShell/Node documentation pipeline, Vercel production smoke verification.

---

### Task 1: Add Failing Contract Tests

**Files:**
- Create: `scripts/audit/high-risk-ops-authz-contracts.test.cjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

Create a Node test file that requires `scripts/audit/high-risk-ops-authz-contracts.cjs` and asserts:

- At least 18 high-risk route-file contracts exist.
- Dispatch routes require `dispatch_read` or `dispatch_write`.
- Finance, refund, and payout routes require finance capabilities.
- Processor and cron routes require `validateEngineProcessorHeaders`.
- Command-center route requires `INTERNAL_COMMAND_CENTER_ENABLED`, `getOpsActorContext`, `guardPlatformApi`, and `team_manage`.
- Ops Stripe webhook route requires `stripe-signature`, `webhooks.constructEvent`, and `webhookSecret`.
- `validateContracts()` returns no failures for the current repository.

Run:

```powershell
. .\scripts\tools\ensure-node-pnpm.ps1
$tool = Use-RidendineNodePnpm -RepoRoot (Get-Location) -Quiet
& $tool.NodeExe --test scripts\audit\high-risk-ops-authz-contracts.test.cjs
```

Expected: fail because `scripts/audit/high-risk-ops-authz-contracts.cjs` does not exist.

- [ ] **Step 2: Add package script**

Add this root script:

```json
"audit:ops-authz": "node scripts/audit/high-risk-ops-authz-contracts.cjs"
```

### Task 2: Implement The Contract Module

**Files:**
- Create: `scripts/audit/high-risk-ops-authz-contracts.cjs`

- [ ] **Step 1: Define contract data**

Create contract rows for these route files:

- `apps/ops-admin/src/app/api/engine/dispatch/route.ts`
- `apps/ops-admin/src/app/api/engine/dispatch/offer-history/route.ts`
- `apps/ops-admin/src/app/api/engine/finance/route.ts`
- `apps/ops-admin/src/app/api/engine/refunds/route.ts`
- `apps/ops-admin/src/app/api/engine/payouts/route.ts`
- `apps/ops-admin/src/app/api/engine/payouts/preview/route.ts`
- `apps/ops-admin/src/app/api/engine/payouts/execute/route.ts`
- `apps/ops-admin/src/app/api/engine/payouts/instant/route.ts`
- `apps/ops-admin/src/app/api/engine/payouts/instant/[id]/route.ts`
- `apps/ops-admin/src/app/api/engine/processors/expired-offers/route.ts`
- `apps/ops-admin/src/app/api/engine/processors/sla/route.ts`
- `apps/ops-admin/src/app/api/cron/expired-offers/route.ts`
- `apps/ops-admin/src/app/api/cron/payouts-chef-preview/route.ts`
- `apps/ops-admin/src/app/api/cron/payouts-driver-preview/route.ts`
- `apps/ops-admin/src/app/api/cron/reconciliation-daily/route.ts`
- `apps/ops-admin/src/app/api/cron/sla-tick/route.ts`
- `apps/ops-admin/src/app/api/internal/command-center/change-requests/route.ts`
- `apps/ops-admin/src/app/api/orders/[id]/refund/route.ts`
- `apps/ops-admin/src/app/api/stripe/webhook/route.ts`

- [ ] **Step 2: Implement validation**

Export:

```js
{
  contracts,
  validateContracts,
  generateMarkdown,
  writeDocs
}
```

Validation must check that each file exists, each expected exported method exists, each contract-level token exists, and each method-level token exists inside that method body.

- [ ] **Step 3: Implement CLI**

When run directly, the script should:

- Validate all contracts.
- Print `High-risk Ops authorization contracts passed: X/X` on success.
- Write generated docs to:
  - `docs/wiring/HIGH_RISK_OPS_AUTHZ.md`
  - `docs/architecture/codebase-map/wiring/HIGH_RISK_OPS_AUTHZ.md`
  - `docs/obsidian/codebase-map/High Risk Ops Authorization.md`
- Exit non-zero with listed failures on failure.

- [ ] **Step 4: Confirm GREEN**

Run:

```powershell
. .\scripts\tools\ensure-node-pnpm.ps1
$tool = Use-RidendineNodePnpm -RepoRoot (Get-Location) -Quiet
& $tool.NodeExe --test scripts\audit\high-risk-ops-authz-contracts.test.cjs
& $tool.PnpmCmd audit:ops-authz
```

Expected: tests pass and generated docs are written.

### Task 3: Wire The Contract Into Existing Gates

**Files:**
- Modify: `scripts/wiring/verify-known-wiring-fixes.cjs`
- Regenerate: `docs/wiring/*`
- Regenerate: `docs/architecture/codebase-map/*`
- Regenerate: `docs/obsidian/codebase-map/*`
- Modify: `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\17 - Complete Program Wiring and Schematic Audit.md`

- [ ] **Step 1: Add known-fix gate**

Add a check that:

- `scripts/audit/high-risk-ops-authz-contracts.cjs` validates with zero failures.
- All three generated high-risk authz docs exist.
- The contract count is at least 18.

- [ ] **Step 2: Run docs**

Run:

```powershell
. .\scripts\tools\ensure-node-pnpm.ps1
$tool = Use-RidendineNodePnpm -RepoRoot (Get-Location) -Quiet
& $tool.PnpmCmd audit:ops-authz
& $tool.PnpmCmd docs:wiring
& $tool.PnpmCmd docs:obsidian-architecture
& $tool.PnpmCmd docs:api-guard-snapshot
```

Expected: docs regenerate cleanly and guard snapshot remains 0 review rows.

- [ ] **Step 3: Update master audit**

Record Phase 11 as the high-risk Ops authorization contract pass and move the previous high-risk negative authorization item into covered/remaining status. The remaining next phases should still include chef authenticated smoke and broad runtime-contract expansion.

### Task 4: Verify, Commit, Push, And Production-Prove

**Files:**
- Commit all Phase 11 repo changes.

- [ ] **Step 1: Run local verification**

Run:

```powershell
. .\scripts\tools\ensure-node-pnpm.ps1
$tool = Use-RidendineNodePnpm -RepoRoot (Get-Location) -Quiet
& $tool.NodeExe --test scripts\audit\high-risk-ops-authz-contracts.test.cjs
& $tool.PnpmCmd audit:ops-authz
& $tool.PnpmCmd test:wiring-fixes
& $tool.PnpmCmd audit:guards
& $tool.PnpmCmd smoke:prod:contracts -- --require-auth
git diff --check
& $tool.PnpmCmd build
```

Expected: all commands exit 0.

- [ ] **Step 2: Commit and push**

Run:

```powershell
git add docs graphify-out package.json scripts
git commit -m "test(ops): add high-risk authz contracts"
git push origin master
```

Expected: `origin/master` equals local `HEAD`.

- [ ] **Step 3: Verify Vercel production**

Confirm all four Vercel projects deploy the new commit and custom domains remain aliased. Then run:

```powershell
$env:RIDENDINE_SMOKE_EMAIL = '<smoke email>'
$env:RIDENDINE_SMOKE_PASSWORD = '<smoke password>'
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts\smoke\production-smoke.ps1 -RequireAuth
& $tool.PnpmCmd smoke:prod:contracts -- --require-auth
```

Expected: both production smoke gates exit 0.

- [ ] **Step 4: Check runtime logs**

Check Vercel runtime logs for error/fatal events on the four Phase 11 deployment IDs after production smoke.

Expected: no error or fatal logs found for the checked window.
