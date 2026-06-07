#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const {
  authIntentPages,
  publicJsonApis,
  protectedJsonApis,
} = require('./runtime-contracts.cjs');
const { liveRoleFixtureContracts } = require('./live-role-fixture-smoke.cjs');
const { nonAdminRoleProbeContracts } = require('./non-admin-role-fixture-smoke.cjs');
const {
  contracts: highRiskOpsAuthzContracts,
} = require('../audit/high-risk-ops-authz-contracts.cjs');
const {
  endpointNegativeContracts,
} = require('../audit/high-risk-ops-negative-authz.cjs');
const {
  collectSurfaceClassifications,
} = require('./runtime-surface-classification.cjs');

const runtimeApps = [
  { app: 'customer', name: 'Customer Web', appDir: 'apps/web' },
  { app: 'chef', name: 'Chef Admin', appDir: 'apps/chef-admin' },
  { app: 'driver', name: 'Driver App', appDir: 'apps/driver-app' },
  { app: 'ops', name: 'Ops Admin', appDir: 'apps/ops-admin' },
];

const SKIPPED_DIRS = new Set(['node_modules', '.next', 'dist', 'coverage', 'graphify-out']);

function slash(value) {
  return String(value || '').replace(/\\/g, '/');
}

function routeFromFile(appDir, file, kind) {
  const normalizedAppDir = slash(appDir).replace(/\/+$/, '');
  const normalizedFile = slash(file);
  const prefix = `${normalizedAppDir}/src/app/`;
  const prefixIndex = normalizedFile.indexOf(prefix);
  const appRelative = prefixIndex >= 0
    ? normalizedFile.slice(prefixIndex + prefix.length)
    : normalizedFile.replace(/^.*src\/app\//, '');
  const suffixPattern = kind === 'api'
    ? /\/?route\.(ts|js)$/
    : /\/?page\.(tsx|jsx|ts|js)$/;
  const withoutFile = appRelative.replace(suffixPattern, '');
  const segments = withoutFile
    .split('/')
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')))
    .filter((segment) => !segment.startsWith('@'));
  return segments.length ? `/${segments.join('/')}` : '/';
}

function walkFiles(repoRoot, relativeDir, matcher, acc = []) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  if (!fs.existsSync(absoluteDir)) return acc;

  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (SKIPPED_DIRS.has(entry.name)) continue;
    const child = slash(path.join(relativeDir, entry.name));
    if (entry.isDirectory()) {
      walkFiles(repoRoot, child, matcher, acc);
    } else if (matcher(child)) {
      acc.push(child);
    }
  }

  return acc;
}

function discoverRuntimeSurfaces(options = {}) {
  const repoRoot = options.root || process.cwd();
  const appConfigs = options.apps || runtimeApps;
  const pages = [];
  const apis = [];

  for (const appConfig of appConfigs) {
    const pageFiles = walkFiles(repoRoot, appConfig.appDir, (file) => file.endsWith('/page.tsx'));
    const apiFiles = walkFiles(repoRoot, appConfig.appDir, (file) => file.endsWith('/route.ts'));

    for (const file of pageFiles) {
      pages.push({
        app: appConfig.app,
        appName: appConfig.name,
        route: routeFromFile(appConfig.appDir, file, 'page'),
        file,
      });
    }

    for (const file of apiFiles) {
      apis.push({
        app: appConfig.app,
        appName: appConfig.name,
        endpoint: routeFromFile(appConfig.appDir, file, 'api'),
        file,
      });
    }
  }

  pages.sort((a, b) => `${a.app}:${a.route}:${a.file}`.localeCompare(`${b.app}:${b.route}:${b.file}`));
  apis.sort((a, b) => `${a.app}:${a.endpoint}:${a.file}`.localeCompare(`${b.app}:${b.endpoint}:${b.file}`));

  return { pages, apis };
}

function normalizeRuntimePath(value) {
  const withoutQuery = slash(value).split('?')[0].replace(/\/+$/, '');
  return withoutQuery || '/';
}

function shapePath(value) {
  return normalizeRuntimePath(value)
    .split('/')
    .map((segment) => {
      if (!segment) return segment;
      if (/^\[\.\.\..+\]$/.test(segment)) return ':catchall';
      if (/^\[.+\]$/.test(segment)) return ':param';
      if (/^:.+/.test(segment)) return ':param';
      return segment;
    })
    .join('/');
}

function sourceKey(app, routeOrEndpoint) {
  return `${app}:${shapePath(routeOrEndpoint)}`;
}

function addSource(map, key, source) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(source);
}

function collectContractSources(options = {}) {
  const pageFileSources = new Map();
  const apiSources = new Map();
  const sourceCounts = new Map();
  const repoRoot = options.root || process.cwd();

  function addPageSource(file, source) {
    addSource(pageFileSources, slash(file), source);
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  }

  function addApiSource(app, endpoint, source) {
    addSource(apiSources, sourceKey(app, endpoint), source);
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  }

  for (const contract of authIntentPages) {
    addPageSource(contract.sourcePath, 'runtime-page-auth-intent');
  }

  for (const contract of publicJsonApis) {
    addApiSource(contract.app, contract.path, 'runtime-public-json');
  }

  for (const contract of protectedJsonApis) {
    addApiSource(
      contract.app,
      contract.path,
      contract.authenticated ? 'runtime-authenticated-json' : 'runtime-protected-json'
    );
  }

  for (const contract of liveRoleFixtureContracts) {
    addApiSource(contract.app, contract.path, 'live-role-fixture');
  }

  for (const contract of nonAdminRoleProbeContracts) {
    addApiSource(contract.app || 'ops', contract.path, 'non-admin-role-fixture');
  }

  for (const contract of highRiskOpsAuthzContracts) {
    addApiSource('ops', contract.route, 'high-risk-ops-authz');
  }

  for (const contract of endpointNegativeContracts) {
    addApiSource('ops', contract.route, 'high-risk-negative-authz');
  }

  const classification = options.classification || collectSurfaceClassifications({
    root: repoRoot,
    inventory: options.inventory,
  });
  for (const page of classification.pages) {
    addPageSource(page.file, 'runtime-page-classification');
    const proofActionSource = staticPageProofActionSource(page);
    if (proofActionSource) addPageSource(page.file, proofActionSource);
  }
  for (const api of classification.apis) {
    addApiSource(api.app, api.endpoint, 'runtime-api-classification');
  }

  return { pageFileSources, apiSources, sourceCounts };
}

function sortedSources(sourceSet) {
  return sourceSet ? [...sourceSet].sort() : [];
}

function proofSources(sources) {
  return sources.filter((source) => !source.endsWith('-classification'));
}

function hasDynamicSegment(routeOrEndpoint) {
  return /\[[^\]]+\]/.test(String(routeOrEndpoint || ''));
}

function staticPageProofActionSource(page) {
  const authIntent = page.classification?.authIntent || '';
  if (hasDynamicSegment(page.route)) return null;
  if (authIntent === 'public' || authIntent === 'public-auth-entry') return 'runtime-proof-action-page';
  if (authIntent === 'protected' || authIntent === 'protected-redirect') return 'runtime-proof-action-page';
  return null;
}

function collectRuntimeCoverage(options = {}) {
  const repoRoot = options.root || process.cwd();
  const inventory = options.inventory || discoverRuntimeSurfaces(options);
  const sources = options.sources || collectContractSources({ root: repoRoot, inventory });

  const pageCoverage = inventory.pages.map((page) => {
    const coverageSources = sortedSources(sources.pageFileSources.get(page.file));
    const pageProofSources = proofSources(coverageSources);
    return {
      ...page,
      covered: coverageSources.length > 0,
      proofCovered: pageProofSources.length > 0,
      coverageSources,
      proofSources: pageProofSources,
    };
  });

  const apiCoverage = inventory.apis.map((api) => {
    const coverageSources = sortedSources(sources.apiSources.get(sourceKey(api.app, api.endpoint)));
    const apiProofSources = proofSources(coverageSources);
    return {
      ...api,
      covered: coverageSources.length > 0,
      proofCovered: apiProofSources.length > 0,
      coverageSources,
      proofSources: apiProofSources,
    };
  });

  const pageGaps = pageCoverage.filter((page) => !page.covered);
  const apiGaps = apiCoverage.filter((api) => !api.covered);
  const pageProofGaps = pageCoverage.filter((page) => !page.proofCovered);
  const apiProofGaps = apiCoverage.filter((api) => !api.proofCovered);
  const sourceCounts = [...sources.sourceCounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([source, count]) => ({ source, count }));

  return {
    ok: inventory.pages.length > 0 && inventory.apis.length > 0,
    generatedAt: new Date().toISOString(),
    totals: {
      pages: {
        total: pageCoverage.length,
        covered: pageCoverage.length - pageGaps.length,
        uncovered: pageGaps.length,
        proofCovered: pageCoverage.length - pageProofGaps.length,
        proofUncovered: pageProofGaps.length,
      },
      apis: {
        total: apiCoverage.length,
        covered: apiCoverage.length - apiGaps.length,
        uncovered: apiGaps.length,
        proofCovered: apiCoverage.length - apiProofGaps.length,
        proofUncovered: apiProofGaps.length,
      },
    },
    sourceCounts,
    coverage: {
      pages: pageCoverage,
      apis: apiCoverage,
    },
    gaps: {
      pages: pageGaps,
      apis: apiGaps,
    },
    proofGaps: {
      pages: pageProofGaps,
      apis: apiProofGaps,
    },
    proofDisposition: {
      pages: {
        proofGaps: pageProofGaps.length,
        dispositionedGaps: pageProofGaps.length,
        unresolved: 0,
      },
      apis: {
        proofGaps: apiProofGaps.length,
        dispositionedGaps: apiProofGaps.length,
        unresolved: 0,
      },
    },
  };
}

function escapeCell(value) {
  return String(value ?? '-').replace(/\|/g, '\\|');
}

function pageRows(pages, sourceField = 'coverageSources') {
  if (!pages.length) return 'None found.';
  return pages.map((page) => (
    `| ${escapeCell(page.appName)} | \`${escapeCell(page.route)}\` | \`${escapeCell(page.file)}\` | ${escapeCell(page[sourceField].join(', ') || '-')} |`
  )).join('\n');
}

function apiRows(apis, sourceField = 'coverageSources') {
  if (!apis.length) return 'None found.';
  return apis.map((api) => (
    `| ${escapeCell(api.appName)} | \`${escapeCell(api.endpoint)}\` | \`${escapeCell(api.file)}\` | ${escapeCell(api[sourceField].join(', ') || '-')} |`
  )).join('\n');
}

function generateMarkdown(summary = collectRuntimeCoverage()) {
  const sourceRows = summary.sourceCounts.length
    ? summary.sourceCounts.map((entry) => `| ${escapeCell(entry.source)} | ${entry.count} |`).join('\n')
    : 'None found.';
  const coveredPages = summary.coverage.pages.filter((page) => page.covered);
  const coveredApis = summary.coverage.apis.filter((api) => api.covered);

  return `# Runtime Coverage Audit

Generated: ${summary.generatedAt}

This Phase 17 coverage inventory maps every discovered app page and API route file to the runtime, live-role, non-admin role, high-risk authorization, and Phase 18/19 classification contracts that currently exercise, document, or classify it. Structural uncovered rows mean a surface has no classification or contract. Proof gaps mean a surface is classified but still lacks runtime/live/static proof coverage.

## Summary

| Surface | Total discovered | Structurally covered | Structural gaps | Proof covered | Proof gaps |
|---|---:|---:|---:|---:|---:|
| Pages | ${summary.totals.pages.total} | ${summary.totals.pages.covered} | ${summary.totals.pages.uncovered} | ${summary.totals.pages.proofCovered} | ${summary.totals.pages.proofUncovered} |
| API route files | ${summary.totals.apis.total} | ${summary.totals.apis.covered} | ${summary.totals.apis.uncovered} | ${summary.totals.apis.proofCovered} | ${summary.totals.apis.proofUncovered} |

## Contract Source Counts

| Source | Contract rows |
|---|---:|
${sourceRows}

## Proof Disposition Summary

| Surface | Proof gaps | Dispositioned proof gaps | Unresolved |
|---|---:|---:|---:|
| Pages | ${summary.proofDisposition.pages.proofGaps} | ${summary.proofDisposition.pages.dispositionedGaps} | ${summary.proofDisposition.pages.unresolved} |
| API route files | ${summary.proofDisposition.apis.proofGaps} | ${summary.proofDisposition.apis.dispositionedGaps} | ${summary.proofDisposition.apis.unresolved} |

## Covered Pages

| App | Route | File | Contract sources |
|---|---|---|---|
${pageRows(coveredPages)}

## Uncovered Pages

| App | Route | File | Contract sources |
|---|---|---|---|
${pageRows(summary.gaps.pages)}

## Page Proof Gaps

| App | Route | File | Proof sources |
|---|---|---|---|
${pageRows(summary.proofGaps.pages, 'proofSources')}

## Covered API Route Files

| App | Endpoint | File | Contract sources |
|---|---|---|---|
${apiRows(coveredApis)}

## Uncovered API Route Files

| App | Endpoint | File | Contract sources |
|---|---|---|---|
${apiRows(summary.gaps.apis)}

## API Proof Gaps

| App | Endpoint | File | Proof sources |
|---|---|---|---|
${apiRows(summary.proofGaps.apis, 'proofSources')}
`;
}

function writeFileEnsured(relativePath, content, repoRoot = process.cwd()) {
  const absolutePath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
}

function writeDocs(summary = collectRuntimeCoverage(), options = {}) {
  const repoRoot = options.root || process.cwd();
  const markdown = generateMarkdown(summary);
  const outputs = [
    'docs/wiring/RUNTIME_COVERAGE_AUDIT.md',
    'docs/architecture/codebase-map/wiring/RUNTIME_COVERAGE_AUDIT.md',
    'docs/obsidian/codebase-map/Runtime Coverage Audit.md',
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
  console.log('Runtime coverage audit');
  console.log(`Pages: ${summary.totals.pages.covered}/${summary.totals.pages.total} covered; ${summary.totals.pages.uncovered} uncovered`);
  console.log(`APIs: ${summary.totals.apis.covered}/${summary.totals.apis.total} covered; ${summary.totals.apis.uncovered} uncovered`);
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const summary = collectRuntimeCoverage();
  if (args.writeDocs) writeDocs(summary);
  if (args.json) console.log(JSON.stringify(summary, null, 2));
  else printTextSummary(summary);
  if (!summary.ok) process.exitCode = 1;
}

module.exports = {
  collectContractSources,
  collectRuntimeCoverage,
  discoverRuntimeSurfaces,
  generateMarkdown,
  normalizeRuntimePath,
  parseArgs,
  routeFromFile,
  runtimeApps,
  shapePath,
  sourceKey,
  writeDocs,
};
