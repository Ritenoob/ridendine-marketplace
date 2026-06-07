#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { collectProofDisposition } = require('./runtime-proof-disposition.cjs');
const {
  baseUrlForApp,
  checkPageContract,
} = require('./runtime-contract-smoke.cjs');
const { apps } = require('./runtime-contracts.cjs');

const PAGE_BUCKETS = new Set([
  'public-page-smoke',
  'login-guard-page-smoke',
  'sampled-login-guard-page-smoke',
]);

const DEFAULT_BUCKETS = [
  'public-page-smoke',
  'login-guard-page-smoke',
];

function hasDynamicSegment(routeOrEndpoint) {
  return /\[[^\]]+\]/.test(String(routeOrEndpoint || ''));
}

function sampledPath(route) {
  return String(route || '/').replace(/\[[^\]]+\]/g, (segment) => {
    const name = segment.slice(1, -1).replace(/^\.\.\./, '') || 'id';
    return `phase-proof-${name.toLowerCase()}`;
  });
}

function bucketForItem(item, bucketSet) {
  const disposition = item.proofDisposition || {};
  const candidates = [
    disposition.nextProofAction,
    disposition.recommendedProofAction,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate !== 'already-covered' && bucketSet.has(candidate)) return candidate;
  }
  return null;
}

function selectProofActions(options = {}) {
  const disposition = options.disposition || collectProofDisposition(options);
  const buckets = options.buckets && options.buckets.length ? options.buckets : DEFAULT_BUCKETS;
  const bucketSet = new Set(buckets);
  const selected = [];

  for (const page of disposition.pages || []) {
    const bucket = bucketForItem(page, bucketSet);
    if (!bucket || !PAGE_BUCKETS.has(bucket)) continue;
    selected.push({
      ...page,
      kind: 'page',
      bucket,
      route: page.route,
      runtimePath: bucket === 'sampled-login-guard-page-smoke' ? sampledPath(page.route) : page.route,
    });
  }

  return selected;
}

function summarizeProofActionResults(results, skipped = []) {
  const failures = (results || [])
    .filter((item) => !item.ok)
    .map((item) => `${item.bucket || item.key || 'proof-action'} ${item.app || ''} ${item.route || item.path || ''}: ${item.message || 'failed'}`.trim());

  return {
    ok: failures.length === 0,
    passed: (results || []).filter((item) => item.ok).length,
    failed: failures.length,
    skipped: skipped.length,
    failures,
  };
}

function pageContractForAction(action) {
  const publicLike = action.bucket === 'public-page-smoke';
  return {
    kind: 'page',
    app: action.app,
    path: action.runtimePath || action.route,
    sourcePath: action.file,
    authIntent: publicLike ? 'public' : 'protected',
    expect: publicLike ? 'html' : 'login-guard',
    note: action.note || '',
  };
}

function shouldSkipAction(action) {
  if (action.bucket === 'sampled-login-guard-page-smoke') return null;
  if (hasDynamicSegment(action.route)) {
    return 'dynamic page requires Thread 5 sample fixture before live proof';
  }
  return null;
}

async function checkProofAction(action, options = {}) {
  const skipReason = shouldSkipAction(action);
  if (skipReason) {
    return {
      ok: true,
      skipped: true,
      kind: action.kind,
      bucket: action.bucket,
      app: action.app,
      route: action.route,
      path: action.runtimePath || action.route,
      status: 0,
      message: skipReason,
    };
  }

  if (action.kind !== 'page') {
    return {
      ok: false,
      kind: action.kind,
      bucket: action.bucket,
      app: action.app,
      route: action.route,
      status: 0,
      message: 'unsupported proof action kind',
    };
  }

  const contract = pageContractForAction(action);
  const result = await checkPageContract(contract, {
    baseUrl: baseUrlForApp(action.app, options.env, options.appConfig || apps),
    fetchImpl: options.fetchImpl || fetch,
    timeoutMs: options.timeoutMs || 45_000,
  });

  return {
    ...result,
    bucket: action.bucket,
    route: action.route,
    sourcePath: action.file,
  };
}

async function runRuntimeProofActionSmoke(options = {}) {
  const selected = selectProofActions(options);
  const results = [];
  const skipped = [];

  for (const action of selected) {
    const result = await checkProofAction(action, options);
    if (result.skipped) skipped.push(result);
    else results.push(result);
  }

  const totals = summarizeProofActionResults(results, skipped);
  return {
    ok: totals.ok,
    generatedAt: new Date().toISOString(),
    buckets: options.buckets && options.buckets.length ? options.buckets : DEFAULT_BUCKETS,
    selected: selected.length,
    results,
    skipped,
    totals,
    failures: totals.failures,
  };
}

function escapeCell(value) {
  return String(value ?? '-').replace(/\|/g, '\\|');
}

function resultRows(results) {
  if (!results.length) return 'None found.';
  return results.map((item) => {
    const marker = item.ok ? 'PASS' : 'FAIL';
    return `| ${marker} | ${escapeCell(item.bucket)} | ${escapeCell(item.app)} | \`${escapeCell(item.path || item.route)}\` | ${item.status} | ${escapeCell(item.message)} |`;
  }).join('\n');
}

function skippedRows(skipped) {
  if (!skipped.length) return 'None found.';
  return skipped.map((item) => (
    `| SKIP | ${escapeCell(item.bucket)} | ${escapeCell(item.app)} | \`${escapeCell(item.route)}\` | ${escapeCell(item.message)} |`
  )).join('\n');
}

function failureRows(failures) {
  if (!failures.length) return 'None found.';
  return failures.map((failure) => `| ${escapeCell(failure)} |`).join('\n');
}

function generateMarkdown(summary) {
  return `# Runtime Proof Action Smoke

Generated: ${summary.generatedAt}

This smoke proof executes selected proof-disposition buckets against production runtime surfaces. Thread 3 covers public page loads and unauthenticated protected-page login guards only; authenticated APIs, negative authorization, and dynamic sample fixtures remain separate threads.

## Summary

| Metric | Count |
|---|---:|
| Selected actions | ${summary.selected} |
| Executed checks | ${summary.results.length} |
| Passed checks | ${summary.totals.passed} |
| Failed checks | ${summary.totals.failed} |
| Skipped checks | ${summary.totals.skipped} |

## Buckets

${summary.buckets.map((bucket) => `- \`${bucket}\``).join('\n')}

## Executed Checks

| Status | Bucket | App | Path | Last status | Notes |
|---|---|---|---|---:|---|
${resultRows(summary.results)}

## Skipped Checks

| Status | Bucket | App | Route | Reason |
|---|---|---|---|---|
${skippedRows(summary.skipped)}

## Failures

${failureRows(summary.failures)}
`;
}

function writeFileEnsured(relativePath, content, repoRoot = process.cwd()) {
  const absolutePath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
}

function writeDocs(summary, options = {}) {
  const repoRoot = options.root || process.cwd();
  const markdown = generateMarkdown(summary);
  const outputs = [
    'docs/wiring/RUNTIME_PROOF_ACTION_SMOKE.md',
    'docs/architecture/codebase-map/wiring/RUNTIME_PROOF_ACTION_SMOKE.md',
    'docs/obsidian/codebase-map/Runtime Proof Action Smoke.md',
  ];
  for (const output of outputs) writeFileEnsured(output, markdown, repoRoot);
  return outputs;
}

function parseArgs(argv) {
  const parsed = {
    buckets: [],
    json: false,
    writeDocs: false,
    timeoutMs: 45_000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--') continue;
    if (arg === '--bucket') {
      parsed.buckets.push(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--bucket=')) parsed.buckets.push(arg.slice('--bucket='.length));
    else if (arg === '--json') parsed.json = true;
    else if (arg === '--write-docs') parsed.writeDocs = true;
    else if (arg === '--timeout-ms') {
      parsed.timeoutMs = Number(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--timeout-ms=')) parsed.timeoutMs = Number(arg.slice('--timeout-ms='.length));
  }

  if (!parsed.buckets.length) parsed.buckets = DEFAULT_BUCKETS;
  return parsed;
}

function printTextSummary(summary) {
  console.log('Runtime proof action smoke checks');
  for (const item of summary.results) {
    const marker = item.ok ? 'PASS' : 'FAIL';
    console.log(`${marker} ${item.bucket} ${item.app} ${item.path || item.route} ${item.status} - ${item.message}`);
  }
  for (const item of summary.skipped) {
    console.log(`SKIP ${item.bucket} ${item.app} ${item.route} - ${item.message}`);
  }
  if (summary.failures.length) {
    console.log('Runtime proof action smoke failures');
    for (const failure of summary.failures) console.log(` - ${failure}`);
  }
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  runRuntimeProofActionSmoke(args)
    .then((summary) => {
      if (args.writeDocs) writeDocs(summary);
      if (args.json) console.log(JSON.stringify(summary, null, 2));
      else printTextSummary(summary);
      if (!summary.ok) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error && error.stack ? error.stack : String(error));
      process.exitCode = 1;
    });
}

module.exports = {
  checkProofAction,
  generateMarkdown,
  hasDynamicSegment,
  parseArgs,
  runRuntimeProofActionSmoke,
  selectProofActions,
  summarizeProofActionResults,
  writeDocs,
};
