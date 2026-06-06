# Phase 10 Public Read Guard Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining API guard review gap by classifying the four customer marketplace read APIs as intentional public routes and proving that classification with a regression gate.

**Architecture:** Keep runtime API behavior unchanged. Update the generated API guard snapshot classifier so known public marketplace-read routes are not reported as review read-only, and add a wiring-fix regression check that fails if those routes drift back into review status.

**Tech Stack:** PowerShell guard snapshot generator, Node CommonJS wiring verification, generated Obsidian architecture notes, Vercel production deployments.

---

### Task 1: Add A Failing Guard Classification Gate

**Files:**
- Modify: `scripts/wiring/verify-known-wiring-fixes.cjs`

- [ ] **Step 1: Write the failing check**

Add a check named `phase 10 public read APIs are guard-classified as intentional public` that reads the generated API guard snapshot in the attached Obsidian vault and verifies:

- `review read-only: 0` appears in the generator output or snapshot summary.
- `/api/eta`, `/api/storefronts`, `/api/storefronts/[id]`, and `/api/storefronts/[id]/menu` are all present in the full matrix as `Intentional public`.
- The read-only review table no longer contains those four routes.

- [ ] **Step 2: Run the gate and confirm RED**

Run:

```powershell
. .\scripts\tools\ensure-node-pnpm.ps1
$tool = Use-RidendineNodePnpm -RepoRoot (Get-Location) -Quiet
& $tool.PnpmCmd test:wiring-fixes
```

Expected: fail with `phase 10 public read APIs are guard-classified as intentional public`.

### Task 2: Update The Guard Snapshot Classifier

**Files:**
- Modify: `scripts/docs/generate-api-guard-snapshot.ps1`

- [ ] **Step 1: Add marketplace public-read allowlist**

Add these routes to the generator's intentional public classification:

```powershell
$intentionalPublicReadRoutes = @(
  '/api/eta',
  '/api/storefronts',
  '/api/storefronts/[id]',
  '/api/storefronts/[id]/menu'
)
```

Update `Get-Status` so both the existing auth/health public routes and the public-read routes return `Intentional public`.

- [ ] **Step 2: Regenerate the guard snapshot**

Run:

```powershell
. .\scripts\tools\ensure-node-pnpm.ps1
$tool = Use-RidendineNodePnpm -RepoRoot (Get-Location) -Quiet
& $tool.PnpmCmd docs:api-guard-snapshot
```

Expected: generated snapshot reports 15 intentional public routes, 0 review state-changing routes, and 0 review read-only routes.

- [ ] **Step 3: Confirm GREEN**

Run:

```powershell
. .\scripts\tools\ensure-node-pnpm.ps1
$tool = Use-RidendineNodePnpm -RepoRoot (Get-Location) -Quiet
& $tool.PnpmCmd test:wiring-fixes
```

Expected: pass with one additional known wiring fix check.

### Task 3: Refresh Wiring And Audit Records

**Files:**
- Regenerate: `docs/wiring/*`
- Regenerate: `docs/architecture/codebase-map/*`
- Regenerate: `docs/obsidian/codebase-map/*`
- Regenerate: `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\14 - Generated Live Inventory Snapshot.md`
- Regenerate: `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\16 - Generated API Guard Snapshot.md`
- Modify: `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\17 - Complete Program Wiring and Schematic Audit.md`

- [ ] **Step 1: Regenerate generated docs**

Run:

```powershell
. .\scripts\tools\ensure-node-pnpm.ps1
$tool = Use-RidendineNodePnpm -RepoRoot (Get-Location) -Quiet
& $tool.PnpmCmd docs:wiring
& $tool.PnpmCmd docs:obsidian-architecture
& $tool.PnpmCmd docs:api-guard-snapshot
```

Expected: wiring docs remain at 90 pages and 118 API route files; API guard snapshot review-read-only count is 0.

- [ ] **Step 2: Update master audit**

Record Phase 10 as the public-read guard classification pass, replacing the previous remaining gap for the four customer discovery/ETA APIs with evidence that they are now intentional public routes in the guard snapshot.

### Task 4: Verify, Commit, Push, And Production-Prove

**Files:**
- Commit all Phase 10 repo changes.

- [ ] **Step 1: Run local verification**

Run:

```powershell
. .\scripts\tools\ensure-node-pnpm.ps1
$tool = Use-RidendineNodePnpm -RepoRoot (Get-Location) -Quiet
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
git add docs scripts
git commit -m "chore(audit): classify public read APIs"
git push origin master
```

Expected: `origin/master` equals local `HEAD`.

- [ ] **Step 3: Verify Vercel production**

Confirm all four Vercel projects deploy the new commit and their custom domains remain aliased:

- `ridendine.ca`
- `chef.ridendine.ca`
- `driver.ridendine.ca`
- `ops.ridendine.ca`

Then run:

```powershell
$env:RIDENDINE_SMOKE_EMAIL = '<smoke email>'
$env:RIDENDINE_SMOKE_PASSWORD = '<smoke password>'
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts\smoke\production-smoke.ps1 -RequireAuth
& $tool.PnpmCmd smoke:prod:contracts -- --require-auth
```

Expected: both production smoke gates exit 0.

- [ ] **Step 4: Check runtime logs**

Check Vercel runtime logs for error/fatal events on the four Phase 10 deployment IDs after the production smoke checks.

Expected: no error or fatal logs found for the checked window.
