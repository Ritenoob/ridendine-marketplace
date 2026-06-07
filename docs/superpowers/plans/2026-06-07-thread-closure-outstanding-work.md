# Thread Closure Outstanding Work Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the current architecture, wiring, smoke, GitHub, and Vercel review thread with a clean record of what is complete and what should move into the next issue threads.

**Architecture:** This is a documentation and release-handoff plan. It separates the original product roadmap phases from the later wiring-hardening phases so future work does not reopen already-completed audit phases by mistake.

**Tech Stack:** RidenDine monorepo, Next.js apps, Supabase, Vercel, GitHub Actions, PowerShell local toolchain, Obsidian architecture vault.

---

## Current Closure State

The current wiring-hardening track is complete through Phase 21 at commit `d4c1e83c768db9d402bb122dceee492d64317358`.

The original product roadmap is a separate track. It records Phase 0 through Phase 7, with Phase 6 split into driver and chef workflow slices and customer workflow still a future product decision.

The wiring-hardening track records Phase 8 through Phase 21:

| Phase range | Result |
|---|---|
| 8-10 | Static wiring contracts, runtime contract smoke, and public-read classification completed. |
| 11-12 | High-risk Ops authz and negative authz contracts completed. |
| 13-15 | Seeded super-admin, live role-fixture, and non-admin role fixture contracts completed. |
| 16-17 | Non-admin readiness preflight and runtime coverage audit completed. |
| 18-19 | Runtime surface classification completed for 90/90 pages and 120/120 route handlers. |
| 20-21 | Runtime proof disposition completed for 73/73 page proof gaps and 74/74 route-handler proof gaps with 0 unresolved. |

Latest verified production evidence before this closure note:

- GitHub `master` and `origin/master` matched commit `d4c1e83c768db9d402bb122dceee492d64317358`.
- GitHub Actions `Lint, Typecheck, Test, Build` and `Playwright Browser Gate` passed for that commit.
- Vercel contexts for `ridendine-web`, `ridendine-chef-admin`, `ridendine-driver-app`, and `ridendine-ops-admin` passed for that commit.
- `pnpm smoke:prod:contracts -- --require-auth` passed with the seeded full-access account.
- `pnpm smoke:prod` passed public pages, static assets, health APIs, and authenticated Customer/Chef/Driver/Ops checks.

## Outstanding Work That Should Move To New Threads

### Task 1: Non-Admin Ops Live Role Proof

**Files:**
- Read: `docs/wiring/NON_ADMIN_ROLE_FIXTURE_SMOKE.md`
- Read: `docs/obsidian/codebase-map/Non Admin Role Fixture Smoke.md`
- Modify only if results change: generated wiring docs and Obsidian mirrors

- [ ] **Step 1: Configure test credentials**

Set support-agent, finance-manager, and ops-agent credentials in the environment without printing passwords:

```powershell
$env:RIDENDINE_SUPPORT_AGENT_EMAIL = '<support agent email>'
$env:RIDENDINE_SUPPORT_AGENT_PASSWORD = '<support agent password>'
$env:RIDENDINE_FINANCE_MANAGER_EMAIL = '<finance manager email>'
$env:RIDENDINE_FINANCE_MANAGER_PASSWORD = '<finance manager password>'
$env:RIDENDINE_OPS_AGENT_EMAIL = '<ops agent email>'
$env:RIDENDINE_OPS_AGENT_PASSWORD = '<ops agent password>'
```

- [ ] **Step 2: Run readiness preflight**

```powershell
. .\scripts\tools\ensure-node-pnpm.ps1
$tool = Use-RidendineNodePnpm -Quiet
& $tool.PnpmCmd smoke:non-admin-role-readiness
```

Expected: exits `0` once all role credential slots are configured.

- [ ] **Step 3: Run live non-admin proof**

```powershell
& $tool.PnpmCmd smoke:non-admin-role-fixture -- --require-auth --require-all-roles --write-docs
```

Expected: support-agent, finance-manager, and ops-agent allow/deny probes pass against deployed Ops APIs.

- [ ] **Step 4: Package and push**

```powershell
git diff --check
git status --short
git add docs/wiring/NON_ADMIN_ROLE_FIXTURE_SMOKE.md docs/architecture/codebase-map/wiring/NON_ADMIN_ROLE_FIXTURE_SMOKE.md "docs/obsidian/codebase-map/Non Admin Role Fixture Smoke.md"
git commit -m "docs: record live non-admin role proof"
git push origin master
```

Expected: only generated non-admin role proof docs change.

### Task 2: Ops CSV Export And Audit Verification

**Files:**
- Read: `apps/ops-admin/src/app/api/export/route.ts`
- Read: `docs/wiring/RUNTIME_PROOF_DISPOSITION.md`
- Create or modify: a focused CSV export/audit smoke script and generated proof doc if this becomes executable

- [ ] **Step 1: Inspect current export behavior**

```powershell
rg "audit|export" apps/ops-admin/src/app/api/export packages -n
```

Expected: identify the exact audit-log write path used by successful CSV export.

- [ ] **Step 2: Design a controlled verification path**

The verification must prove both the CSV response and the audit-log row without creating uncontrolled production data. Use a test fixture, local Supabase fixture, or explicitly approved production-safe audit record.

- [ ] **Step 3: Add the focused proof gate**

Create a narrowly scoped smoke or contract command that proves:

- authenticated access is required;
- CSV content type and response shape are valid;
- one expected audit row is written for a successful export;
- non-authorized roles cannot export restricted data.

- [ ] **Step 4: Verify and document**

```powershell
& $tool.PnpmCmd test:wiring-fixes
git diff --check
```

Expected: the new proof passes locally and the generated docs explain that CSV export is intentionally outside read-only live smoke.

### Task 3: Execute Proof-Disposition Buckets

**Files:**
- Read: `docs/wiring/RUNTIME_PROOF_DISPOSITION.md`
- Read: `docs/wiring/RUNTIME_COVERAGE_AUDIT.md`
- Modify: smoke scripts and generated proof docs by bucket

- [ ] **Step 1: Start with public and login-guard pages**

Implement the safest page buckets first:

```powershell
& $tool.PnpmCmd smoke:proof-disposition -- --write-docs
```

Use the generated rows for `public-page-smoke`, `login-guard-page-smoke`, `sampled-login-guard-page-smoke`, and `public-shell-and-auth-action-smoke`.

- [ ] **Step 2: Add authenticated read-only JSON probes**

Use the generated rows for `public-json-smoke`, `authenticated-json-smoke`, and `sampled-authenticated-json-smoke`.

- [ ] **Step 3: Add negative and special-route contracts**

Use the generated rows for `negative-authz-contract`, `auth-entry-contract`, `token-contract`, `signature-contract`, `command-center-contract`, `fixture-contract`, and `internal-docs-contract`.

- [ ] **Step 4: Recompute coverage**

```powershell
& $tool.PnpmCmd smoke:runtime-coverage -- --write-docs
& $tool.PnpmCmd smoke:proof-disposition -- --write-docs
& $tool.PnpmCmd test:wiring-fixes
```

Expected: runtime proof coverage increases from the current 17/90 page and 46/120 route-handler proof baseline.

### Task 4: Dynamic Sample-Data Fixtures

**Files:**
- Read: `docs/wiring/RUNTIME_PROOF_DISPOSITION.md`
- Read: `apps/*/src/app/**/[[]*[]]*/page.tsx`
- Modify: fixture setup scripts or smoke sampling configuration

- [ ] **Step 1: List dynamic sampled routes**

```powershell
Select-String -Path docs/wiring/RUNTIME_PROOF_DISPOSITION.md -Pattern "sampled-" -Context 0,0
```

Expected: all dynamic page and route-handler proof rows are visible.

- [ ] **Step 2: Define stable sample IDs**

Choose fixture-backed IDs for orders, chefs, drivers, payout runs, deliveries, and support tickets. Keep them explicit and documented.

- [ ] **Step 3: Add sample fixture checks before live probes**

Every sampled smoke must verify that its fixture exists before hitting the live endpoint.

### Task 5: Product Roadmap Continuation

**Files:**
- Read: `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\15 - Phased Improvement Execution Plan.md`
- Read: customer workflow pages and APIs under `apps/web/src/app`

- [ ] **Step 1: Decide the next product slice**

Recommended order:

1. Customer order/account workflow clarity.
2. Customer checkout and support visibility.
3. Release-readiness polish after the customer slice.

- [ ] **Step 2: Keep the roadmap separate from the wiring-hardening track**

Do not reopen Phase 8 through Phase 21 unless a new wiring risk is discovered. Treat product roadmap work as a fresh phase or a new named thread.

## Closure Decision

This thread is complete for the deep codebase review, wiring schematic, seeded super-admin proof, GitHub/Vercel verification, production smoke validation, Graphify-backed repo mapping, and runtime coverage/disposition audit.

The items above are the next issue threads, not missing numbered phases from this thread.
