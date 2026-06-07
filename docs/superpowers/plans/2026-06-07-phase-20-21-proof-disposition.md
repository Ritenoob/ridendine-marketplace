# Phase 20-21 Proof Disposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the remaining page and API proof gaps into explicit, testable next-proof dispositions so no runtime surface remains in an unknown verification state.

**Architecture:** Add a focused proof-disposition script that consumes the existing runtime coverage audit and runtime surface classification outputs. It will not add new live calls or mutate production; it will assign each proof gap to a safe proof bucket such as public page smoke, login-guard smoke, authenticated GET smoke, negative authorization, token/signature contract, fixture-only, or sample-data-required.

**Tech Stack:** Node.js CommonJS scripts, Node test runner, generated Markdown wiring docs, Obsidian mirror docs, existing `runtime-coverage-audit.cjs` and `runtime-surface-classification.cjs`.

---

### Task 1: Phase 20 Page Proof Disposition

**Files:**
- Create: `scripts/smoke/runtime-proof-disposition.cjs`
- Create: `scripts/smoke/runtime-proof-disposition.test.cjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing page disposition tests**

Add tests that call `collectProofDisposition({ root })` and assert every page proof gap gets a next proof action:

```js
assert.equal(summary.pageTotals.total, 90);
assert.equal(summary.pageTotals.proofCovered, 17);
assert.equal(summary.pageTotals.dispositionedGaps, 73);
assert.equal(summary.pageTotals.unresolved, 0);
assert.equal(summary.pages.find((page) => page.app === 'chef' && page.route === '/auth/login').proofDisposition.nextProofAction, 'public-page-smoke');
assert.equal(summary.pages.find((page) => page.app === 'ops' && page.route === '/dashboard').proofDisposition.nextProofAction, 'login-guard-page-smoke');
```

- [ ] **Step 2: Run the page test to verify red**

Run: `node --test scripts/smoke/runtime-proof-disposition.test.cjs`

Expected: fail because `runtime-proof-disposition.cjs` does not exist yet.

- [ ] **Step 3: Implement page proof disposition**

Implement page proof actions:

```text
public, public-auth-entry -> public-page-smoke
protected, protected-redirect -> login-guard-page-smoke
mixed-auth-dependent -> public-shell-and-auth-action-smoke
dynamic protected page with [param] -> sampled-login-guard-page-smoke
already proof-covered -> already-covered
```

- [ ] **Step 4: Run page tests to verify green**

Run: `node --test scripts/smoke/runtime-proof-disposition.test.cjs`

Expected: page disposition assertions pass.

### Task 2: Phase 21 API Proof Disposition

**Files:**
- Modify: `scripts/smoke/runtime-proof-disposition.cjs`
- Modify: `scripts/smoke/runtime-proof-disposition.test.cjs`

- [ ] **Step 1: Write the failing API disposition tests**

Add tests that assert every API proof gap gets a next proof action:

```js
assert.equal(summary.apiTotals.total, 120);
assert.equal(summary.apiTotals.proofCovered, 46);
assert.equal(summary.apiTotals.dispositionedGaps, 74);
assert.equal(summary.apiTotals.unresolved, 0);
assert.equal(summary.apis.find((api) => api.app === 'customer' && api.endpoint === '/api/auth/login').proofDisposition.nextProofAction, 'auth-entry-contract');
assert.equal(summary.apis.find((api) => api.app === 'ops' && api.endpoint === '/api/stripe/webhook').proofDisposition.nextProofAction, 'signature-contract');
assert.equal(summary.apis.find((api) => api.app === 'web' && api.endpoint === '/api/checkout').proofDisposition.nextProofAction, undefined);
```

Use `customer`, not `web`, for the customer app assertion in the actual test.

- [ ] **Step 2: Run the API test to verify red**

Run: `node --test scripts/smoke/runtime-proof-disposition.test.cjs`

Expected: fail until API disposition is implemented.

- [ ] **Step 3: Implement API proof disposition**

Implement API proof actions:

```text
already proof-covered -> already-covered
public-read -> public-json-smoke
public-auth-entry -> auth-entry-contract
protected-session + GET + no dynamic params -> authenticated-json-smoke
protected-session + GET + dynamic params -> sampled-authenticated-json-smoke
protected-session + mutating/mixed -> negative-authz-contract
signature-guarded -> signature-contract
token-guarded -> token-contract
command-center-guarded -> command-center-contract
fixture-only -> fixture-contract
internal-docs -> internal-docs-contract
```

- [ ] **Step 4: Run API tests to verify green**

Run: `node --test scripts/smoke/runtime-proof-disposition.test.cjs`

Expected: all disposition tests pass.

### Task 3: Integrate With Coverage Docs And Gates

**Files:**
- Modify: `scripts/smoke/runtime-coverage-audit.cjs`
- Modify: `scripts/smoke/runtime-coverage-audit.test.cjs`
- Modify: `scripts/wiring/verify-known-wiring-fixes.cjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing integration assertions**

Update coverage tests to assert proof gaps are linked to proof dispositions:

```js
assert.equal(summary.proofDisposition.pages.unresolved, 0);
assert.equal(summary.proofDisposition.apis.unresolved, 0);
assert.ok(markdown.includes('Proof Disposition Summary'));
```

- [ ] **Step 2: Run coverage tests to verify red**

Run: `node --test scripts/smoke/runtime-coverage-audit.test.cjs`

Expected: fail until coverage consumes proof disposition.

- [ ] **Step 3: Implement integration**

Add `smoke:proof-disposition`, generate `RUNTIME_PROOF_DISPOSITION.md` in all mirrors, include disposition summaries in coverage docs, and add the test to `test:wiring-fixes`.

- [ ] **Step 4: Verify generated docs and gates**

Run:

```powershell
pnpm smoke:proof-disposition -- --write-docs
pnpm smoke:runtime-coverage -- --write-docs
pnpm docs:wiring
pnpm test:wiring-fixes
```

Expected: proof disposition reports 73/73 page proof gaps and 74/74 API proof gaps dispositioned with 0 unresolved.

### Task 4: Final Push And Verification

**Files:**
- Modify vault notes under `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture`

- [ ] **Step 1: Update vault evidence**

Record Phase 20/21 as the final two wiring-hardening phases, including local verification, GitHub/Vercel status, post-deploy smoke, and the remaining credential-only blocker for live non-admin role execution.

- [ ] **Step 2: Commit and push**

Run:

```powershell
git diff --check
git status --short
git add <phase files>
git commit -m "Add runtime proof disposition audit"
git push origin master
```

- [ ] **Step 3: Verify remote and production**

Run GitHub/Vercel status checks for the pushed commit and post-deploy smoke:

```powershell
pnpm smoke:prod:contracts -- --require-auth
pnpm smoke:prod
```

Expected: GitHub checks, Vercel contexts, and live smoke all pass.

