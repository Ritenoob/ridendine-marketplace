#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const {
  collectRuntimeCoverage,
  sourceKey,
} = require('./runtime-coverage-audit.cjs');
const {
  collectSurfaceClassifications,
} = require('./runtime-surface-classification.cjs');

function hasDynamicSegment(routeOrEndpoint) {
  return /\[[^\]]+\]/.test(String(routeOrEndpoint || ''));
}

function recommendedPageProofAction(page) {
  const authIntent = page.classification?.authIntent || '';
  if (authIntent === 'public' || authIntent === 'public-auth-entry') return 'public-page-smoke';
  if (authIntent === 'mixed-auth-dependent') return 'public-shell-and-auth-action-smoke';
  if (authIntent === 'protected' && hasDynamicSegment(page.route)) return 'sampled-login-guard-page-smoke';
  if (authIntent === 'protected' || authIntent === 'protected-redirect') return 'login-guard-page-smoke';
  return 'unresolved-proof-review';
}

function recommendedApiProofAction(api) {
  const classification = api.classification || {};
  const guardIntent = classification.guardIntent || '';
  const mutationClass = classification.mutationClass || '';
  const methods = classification.methods || [];
  const hasGet = methods.includes('GET');

  if (guardIntent === 'public-read') return 'public-json-smoke';
  if (guardIntent === 'public-auth-entry') return 'auth-entry-contract';
  if (guardIntent === 'signature-guarded') return 'signature-contract';
  if (guardIntent === 'token-guarded') return 'token-contract';
  if (guardIntent === 'command-center-guarded') return 'command-center-contract';
  if (guardIntent === 'fixture-only') return 'fixture-contract';
  if (guardIntent === 'internal-docs') return 'internal-docs-contract';

  if (guardIntent === 'protected-session') {
    if (hasGet && mutationClass === 'read-only') {
      return hasDynamicSegment(api.endpoint) ? 'sampled-authenticated-json-smoke' : 'authenticated-json-smoke';
    }
    if (hasGet && mutationClass === 'mixed') return 'authenticated-read-and-negative-write-contract';
    return 'negative-authz-contract';
  }

  return 'unresolved-proof-review';
}

function proofDisposition(proofCovered, recommendedProofAction) {
  return {
    nextProofAction: proofCovered ? 'already-covered' : recommendedProofAction,
    recommendedProofAction,
    unresolved: !proofCovered && recommendedProofAction === 'unresolved-proof-review',
  };
}

function indexClassifications(classification) {
  const pages = new Map();
  const apis = new Map();

  for (const page of classification.pages) pages.set(page.file, page);
  for (const api of classification.apis) apis.set(sourceKey(api.app, api.endpoint), api);

  return { pages, apis };
}

function dispositionTotals(items) {
  const total = items.length;
  const proofCovered = items.filter((item) => item.proofCovered).length;
  const proofGaps = total - proofCovered;
  const unresolved = items.filter((item) => item.proofDisposition.unresolved).length;
  const dispositionedGaps = items.filter(
    (item) => !item.proofCovered && !item.proofDisposition.unresolved
  ).length;
  return {
    total,
    proofCovered,
    proofGaps,
    dispositionedGaps,
    unresolved,
  };
}

function collectProofDisposition(options = {}) {
  const repoRoot = options.root || process.cwd();
  const coverage = options.coverage || collectRuntimeCoverage({ root: repoRoot });
  const classification = options.classification || collectSurfaceClassifications({ root: repoRoot });
  const indexed = indexClassifications(classification);

  const pages = coverage.coverage.pages.map((page) => {
    const classified = indexed.pages.get(page.file);
    const merged = {
      ...page,
      classification: classified?.classification || {},
    };
    const recommendedProofAction = recommendedPageProofAction(merged);
    return {
      ...merged,
      proofDisposition: proofDisposition(page.proofCovered, recommendedProofAction),
    };
  });

  const apis = coverage.coverage.apis.map((api) => {
    const classified = indexed.apis.get(sourceKey(api.app, api.endpoint));
    const merged = {
      ...api,
      classification: classified?.classification || {},
    };
    const recommendedProofAction = recommendedApiProofAction(merged);
    return {
      ...merged,
      proofDisposition: proofDisposition(api.proofCovered, recommendedProofAction),
    };
  });

  const pageTotals = dispositionTotals(pages);
  const apiTotals = dispositionTotals(apis);
  const failures = [
    ...pages
      .filter((page) => page.proofDisposition.unresolved)
      .map((page) => `${page.file}: unresolved page proof disposition`),
    ...apis
      .filter((api) => api.proofDisposition.unresolved)
      .map((api) => `${api.file}: unresolved API proof disposition`),
  ];

  return {
    ok: failures.length === 0,
    generatedAt: new Date().toISOString(),
    pageTotals,
    apiTotals,
    pages,
    apis,
    failures,
  };
}

function escapeCell(value) {
  return String(value ?? '-').replace(/\|/g, '\\|');
}

function dispositionRows(items, kind) {
  const gaps = items.filter((item) => !item.proofCovered);
  if (!gaps.length) return 'None found.';
  return gaps.map((item) => {
    const routeOrEndpoint = kind === 'page' ? item.route : item.endpoint;
    const intent = kind === 'page'
      ? item.classification.authIntent
      : item.classification.guardIntent;
    return `| ${escapeCell(item.appName)} | \`${escapeCell(routeOrEndpoint)}\` | \`${escapeCell(item.file)}\` | ${escapeCell(intent)} | ${escapeCell(item.proofDisposition.nextProofAction)} | ${escapeCell(item.proofDisposition.recommendedProofAction)} |`;
  }).join('\n');
}

function failureRows(failures) {
  if (!failures.length) return 'None found.';
  return failures.map((failure) => `| ${escapeCell(failure)} |`).join('\n');
}

function generateMarkdown(summary = collectProofDisposition()) {
  return `# Runtime Proof Disposition

Generated: ${summary.generatedAt}

This Phase 20/21 proof disposition audit assigns every remaining runtime proof gap to an explicit next proof action. It does not make new production calls or mutate data; it converts the remaining proof gaps into actionable buckets for future safe smoke, negative authorization, sample-data, or contract-only work.

## Summary

| Surface | Total discovered | Proof covered | Proof gaps | Dispositioned proof gaps | Unresolved |
|---|---:|---:|---:|---:|---:|
| Pages | ${summary.pageTotals.total} | ${summary.pageTotals.proofCovered} | ${summary.pageTotals.proofGaps} | ${summary.pageTotals.dispositionedGaps} | ${summary.pageTotals.unresolved} |
| API route handlers | ${summary.apiTotals.total} | ${summary.apiTotals.proofCovered} | ${summary.apiTotals.proofGaps} | ${summary.apiTotals.dispositionedGaps} | ${summary.apiTotals.unresolved} |

## Page Proof Gap Disposition

| App | Route | File | Auth intent | Next proof action | Recommended proof action |
|---|---|---|---|---|---|
${dispositionRows(summary.pages, 'page')}

## API Proof Gap Disposition

| App | Endpoint | File | Guard intent | Next proof action | Recommended proof action |
|---|---|---|---|---|---|
${dispositionRows(summary.apis, 'api')}

## Failures

${failureRows(summary.failures)}
`;
}

function writeFileEnsured(relativePath, content, repoRoot = process.cwd()) {
  const absolutePath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
}

function writeDocs(summary = collectProofDisposition(), options = {}) {
  const repoRoot = options.root || process.cwd();
  const markdown = generateMarkdown(summary);
  const outputs = [
    'docs/wiring/RUNTIME_PROOF_DISPOSITION.md',
    'docs/architecture/codebase-map/wiring/RUNTIME_PROOF_DISPOSITION.md',
    'docs/obsidian/codebase-map/Runtime Proof Disposition.md',
  ];
  for (const output of outputs) writeFileEnsured(output, markdown, repoRoot);
  return outputs;
}

function parseArgs(argv) {
  const parsed = {
    json: false,
    writeDocs: false,
  };

  for (const arg of argv) {
    if (arg === '--json') parsed.json = true;
    else if (arg === '--write-docs') parsed.writeDocs = true;
  }

  return parsed;
}

function printTextSummary(summary) {
  console.log('Runtime proof disposition');
  console.log(`Pages: ${summary.pageTotals.dispositionedGaps}/${summary.pageTotals.proofGaps} proof gaps dispositioned; ${summary.pageTotals.unresolved} unresolved`);
  console.log(`APIs: ${summary.apiTotals.dispositionedGaps}/${summary.apiTotals.proofGaps} proof gaps dispositioned; ${summary.apiTotals.unresolved} unresolved`);
  if (summary.failures.length) {
    console.log('Proof disposition failures');
    for (const failure of summary.failures) console.log(` - ${failure}`);
  }
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const summary = collectProofDisposition();
  if (args.writeDocs) writeDocs(summary);
  if (args.json) console.log(JSON.stringify(summary, null, 2));
  else printTextSummary(summary);
  if (!summary.ok) process.exitCode = 1;
}

module.exports = {
  collectProofDisposition,
  generateMarkdown,
  hasDynamicSegment,
  parseArgs,
  proofDisposition,
  recommendedApiProofAction,
  recommendedPageProofAction,
  writeDocs,
};

