# Codebase Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and maintain a complete RideNDine codebase map covering the customer web app, chef app, driver app, ops admin control plane, APIs, links, data flow, payment flow, and broken or unproven wiring.

**Architecture:** Extend the existing `scripts/wiring/generate-wiring-docs.cjs` scanner as the single source of truth. The scanner reads the current repo and emits Markdown, Mermaid, Obsidian notes, and Graphify JSON/CSV outputs into stable folders that can be regenerated after code changes.

**Tech Stack:** Node.js CommonJS script, Next.js App Router route conventions, Markdown, Mermaid, Obsidian-compatible wikilinks, Graphify-style JSON/CSV exports.

---

### Task 1: Expand The Existing Wiring Generator

**Files:**
- Modify: `scripts/wiring/generate-wiring-docs.cjs`
- Modify: `package.json`

- [x] **Step 1: Add app metadata**

Add domain, local URL, role, color, and purpose metadata for:

```text
apps/web -> ridendine.ca -> Customer Web
apps/chef-admin -> chef.ridendine.ca -> Chef Admin
apps/driver-app -> driver.ridendine.ca -> Driver App
apps/ops-admin -> ops.ridendine.ca -> Ops Admin
```

- [x] **Step 2: Add scanner outputs**

Emit these folders:

```text
docs/wiring
docs/wiring/links
docs/architecture/codebase-map
docs/architecture/codebase-map/wiring
docs/obsidian/codebase-map
graphify-out/ridendine-codebase-map
```

- [x] **Step 3: Add the refresh command**

Add:

```json
"docs:wiring": "node scripts/wiring/generate-wiring-docs.cjs"
```

### Task 2: Generate App, API, Link, And Flow Maps

**Files:**
- Generated: `docs/wiring/**/*.md`
- Generated: `docs/architecture/codebase-map/**/*.md`
- Generated: `docs/obsidian/codebase-map/**/*.md`
- Generated: `graphify-out/ridendine-codebase-map/**/*`

- [x] **Step 1: Run the generator**

Run:

```bash
pnpm docs:wiring
```

Expected: command exits 0 and prints counts for pages, API route files, link/fetch references, table/RPC identifiers, and graph nodes.

- [x] **Step 2: Verify generated docs exist**

Run:

```bash
Test-Path docs/wiring/links/LINK_WIRING_MATRIX.md
Test-Path docs/architecture/codebase-map/README.md
Test-Path docs/obsidian/codebase-map/00\ Index.md
Test-Path graphify-out/ridendine-codebase-map/graph.json
```

Expected: all return `True`.

### Task 3: Review Output For Known Broken Wiring

**Files:**
- Review: `docs/wiring/links/LINK_WIRING_MATRIX.md`
- Review: `docs/wiring/MISSING_WIRING_REPORT.md`
- Review: `docs/architecture/codebase-map/COMPLETE_CODEBASE_REVIEW.md`

- [x] **Step 1: Count scanner findings**

Run targeted searches:

```bash
rg -n "BROKEN|UNKNOWN_DYNAMIC|PARTIAL|MISSING" docs/wiring docs/architecture/codebase-map
```

Expected: findings are visible and documented rather than hidden.

- [x] **Step 2: Leave conservative status language**

Generated docs must say static scans cannot prove runtime auth/RBAC, external domains, or live payment readiness.

### Task 4: Verify The Generator

**Files:**
- Verify: `scripts/wiring/generate-wiring-docs.cjs`
- Verify: generated docs

- [x] **Step 1: Syntax and runtime verification**

Run:

```bash
pnpm docs:wiring
```

Expected: exit 0.

- [x] **Step 2: Git diff review**

Run:

```bash
git status --short
git diff --stat
```

Expected: only mapping/generator/doc/package-script changes plus pre-existing local untracked tooling state.
