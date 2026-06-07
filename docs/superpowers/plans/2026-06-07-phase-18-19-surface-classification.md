# Phase 18-19 Surface Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Classify every discovered page and API route-handler surface so the wiring audit can distinguish full structural classification from live runtime proof.

**Architecture:** Add one focused classification script that reuses the Phase 17 runtime discovery inventory, then teach the coverage audit to include classification sources while preserving separate live/static proof gaps. This avoids product behavior changes and keeps unsafe mutating routes out of live smoke buckets.

**Tech Stack:** Node.js CommonJS scripts, Node test runner, existing Next.js App Router route inventory, generated Markdown wiring docs, Obsidian mirror docs.

---

### Task 1: Phase 18 Page Surface Classification

**Files:**
- Create: `scripts/smoke/runtime-surface-classification.cjs`
- Create: `scripts/smoke/runtime-surface-classification.test.cjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing page classification tests**

Add tests that call `collectSurfaceClassifications({ root })` and assert:

```js
assert.equal(summary.pages.length, 90);
assert.equal(summary.pages.every((page) => page.classification.kind === 'page'), true);
assert.equal(summary.pages.find((page) => page.app === 'customer' && page.route === '/account').classification.authIntent, 'protected');
assert.equal(summary.pages.find((page) => page.app === 'chef' && page.route === '/auth/login').classification.authIntent, 'public-auth-entry');
assert.equal(summary.pages.find((page) => page.app === 'ops' && page.route === '/dashboard').classification.authIntent, 'protected');
```

- [ ] **Step 2: Run the test to verify red**

Run: `node --test scripts/smoke/runtime-surface-classification.test.cjs`

Expected: fail because `runtime-surface-classification.cjs` does not exist yet.

- [ ] **Step 3: Implement page classification**

Create a script that imports `discoverRuntimeSurfaces` from `runtime-coverage-audit.cjs`, classifies every page, validates no page is missing intent, and writes docs to:

```text
docs/wiring/RUNTIME_SURFACE_CLASSIFICATION.md
docs/architecture/codebase-map/wiring/RUNTIME_SURFACE_CLASSIFICATION.md
docs/obsidian/codebase-map/Runtime Surface Classification.md
```

- [ ] **Step 4: Run the page tests to verify green**

Run: `node --test scripts/smoke/runtime-surface-classification.test.cjs`

Expected: all tests pass.

### Task 2: Phase 19 API Route-Handler Classification

**Files:**
- Modify: `scripts/smoke/runtime-surface-classification.cjs`
- Modify: `scripts/smoke/runtime-surface-classification.test.cjs`

- [ ] **Step 1: Write the failing API classification tests**

Add tests that assert every route handler has methods, guard intent, mutation class, and live-smoke bucket:

```js
assert.equal(summary.apis.length, 120);
assert.equal(summary.apis.every((api) => api.classification.kind === 'api'), true);
assert.deepEqual(summary.apis.find((api) => api.app === 'customer' && api.endpoint === '/api/health').classification.methods, ['GET']);
assert.equal(summary.apis.find((api) => api.app === 'ops' && api.endpoint === '/api/stripe/webhook').classification.guardIntent, 'signature-guarded');
assert.equal(summary.apis.find((api) => api.app === 'ops' && api.endpoint === '/api/engine/finance').classification.liveSmokeBucket, 'authenticated-read');
```

- [ ] **Step 2: Run the test to verify red**

Run: `node --test scripts/smoke/runtime-surface-classification.test.cjs`

Expected: fail until API classification is implemented.

- [ ] **Step 3: Implement API classification**

Classify methods by reading exported `GET`, `POST`, `PATCH`, `PUT`, `DELETE`, `HEAD`, and `OPTIONS` functions. Then classify guard intent as public read, public auth entry, protected session, token guarded, signature guarded, command-center guarded, internal docs, or fixture-only. Mark mutation class as read-only, mutating, mixed, or unknown.

- [ ] **Step 4: Run the API tests to verify green**

Run: `node --test scripts/smoke/runtime-surface-classification.test.cjs`

Expected: all classification tests pass.

### Task 3: Integrate Classification Into Runtime Coverage

**Files:**
- Modify: `scripts/smoke/runtime-coverage-audit.cjs`
- Modify: `scripts/smoke/runtime-coverage-audit.test.cjs`
- Modify: `scripts/wiring/verify-known-wiring-fixes.cjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing coverage integration tests**

Update coverage tests so structural coverage reaches every page/API, while proof gaps remain explicit:

```js
assert.equal(summary.totals.pages.covered, 90);
assert.equal(summary.totals.apis.covered, 120);
assert.ok(summary.proofGaps.pages.length > 0);
assert.ok(summary.proofGaps.apis.length > 0);
```

- [ ] **Step 2: Run coverage tests to verify red**

Run: `node --test scripts/smoke/runtime-coverage-audit.test.cjs`

Expected: fail until coverage consumes classification sources and emits proof gaps separately.

- [ ] **Step 3: Implement coverage integration**

Add `runtime-page-classification` and `runtime-api-classification` coverage sources, keep existing runtime/live/authz sources as proof sources, and generate Markdown sections for proof gaps.

- [ ] **Step 4: Run integrated tests and docs**

Run:

```powershell
pnpm smoke:surface-classification -- --write-docs
pnpm smoke:runtime-coverage -- --write-docs
pnpm test:wiring-fixes
pnpm docs:wiring
```

Expected: commands exit 0 and generated docs reflect 90/90 page classification, 120/120 API classification, and remaining proof gaps.

### Task 4: Push And Verify

**Files:**
- Modify vault notes under `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture`

- [ ] **Step 1: Update vault evidence**

Record Phase 18/19 scope, local verification, GitHub/Vercel status, post-deploy smoke, and remaining blocked items.

- [ ] **Step 2: Commit and push**

Run:

```powershell
git diff --check
git status --short
git add <phase files>
git commit -m "Add runtime surface classification"
git push origin master
```

- [ ] **Step 3: Verify remote and production**

Run GitHub/Vercel status checks for the pushed commit and post-deploy smoke:

```powershell
pnpm smoke:prod:contracts -- --require-auth
pnpm smoke:prod
```

Expected: GitHub checks, Vercel contexts, and live smoke all pass.

