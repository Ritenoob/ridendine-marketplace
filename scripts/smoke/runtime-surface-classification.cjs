#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const runtimeApps = [
  { app: 'customer', name: 'Customer Web', appDir: 'apps/web' },
  { app: 'chef', name: 'Chef Admin', appDir: 'apps/chef-admin' },
  { app: 'driver', name: 'Driver App', appDir: 'apps/driver-app' },
  { app: 'ops', name: 'Ops Admin', appDir: 'apps/ops-admin' },
];

const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
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

function pageReason(authIntent, route) {
  const reasons = {
    public: 'Public marketing, legal, discovery, or informational page.',
    'public-auth-entry': 'Public authentication entry page that creates or recovers a session.',
    protected: 'Application workspace page that requires an authenticated app user or redirects to login.',
    'protected-redirect': 'Root shim that redirects into a protected workspace.',
    'mixed-auth-dependent': 'Browsable shell where final workflow actions depend on authenticated user context.',
  };
  return reasons[authIntent] || `Classified from route pattern ${route}.`;
}

function classifyPage(page) {
  const route = page.route;
  let authIntent = 'public';
  let liveSmokeBucket = 'public-html';

  if (route.startsWith('/auth/')) {
    authIntent = 'public-auth-entry';
    liveSmokeBucket = 'public-html';
  } else if (['chef', 'ops'].includes(page.app) && route === '/') {
    authIntent = 'protected-redirect';
    liveSmokeBucket = 'redirect-or-login-guard';
  } else if (page.app === 'driver' && route === '/') {
    authIntent = 'protected';
    liveSmokeBucket = 'login-guard';
  } else if (
    route.startsWith('/dashboard') ||
    route.startsWith('/account') ||
    route.startsWith('/delivery') ||
    route.startsWith('/earnings') ||
    route.startsWith('/history') ||
    route.startsWith('/profile') ||
    route.startsWith('/settings') ||
    route.startsWith('/internal') ||
    route.startsWith('/orders/')
  ) {
    authIntent = 'protected';
    liveSmokeBucket = 'login-guard';
  } else if (route === '/checkout') {
    authIntent = 'mixed-auth-dependent';
    liveSmokeBucket = 'public-html-with-auth-actions';
  }

  return {
    kind: 'page',
    authIntent,
    liveSmokeBucket,
    reason: pageReason(authIntent, route),
  };
}

function readSource(repoRoot, relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function exportedMethods(source) {
  const methods = new Set();
  const functionPattern = /\bexport\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;
  const constPattern = /\bexport\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;

  for (const match of source.matchAll(functionPattern)) methods.add(match[1]);
  for (const match of source.matchAll(constPattern)) methods.add(match[1]);

  return HTTP_METHODS.filter((method) => methods.has(method));
}

function methodMutationClass(methods) {
  if (!methods.length) return 'unknown';
  const readOnly = methods.every((method) => READ_ONLY_METHODS.has(method));
  const hasRead = methods.some((method) => READ_ONLY_METHODS.has(method));
  const hasMutation = methods.some((method) => !READ_ONLY_METHODS.has(method));
  if (readOnly) return 'read-only';
  if (hasRead && hasMutation) return 'mixed';
  return 'mutating';
}

function apiGuardIntent(api) {
  const endpoint = api.endpoint;

  if (!endpoint.startsWith('/api/')) return 'internal-docs';
  if (endpoint === '/api/health') return 'public-read';
  if (endpoint.startsWith('/api/auth/')) return 'public-auth-entry';
  if (
    api.app === 'customer' &&
    (
      endpoint === '/api/eta' ||
      endpoint === '/api/storefronts' ||
      endpoint.startsWith('/api/storefronts/')
    )
  ) return 'public-read';
  if (endpoint.includes('/webhook')) return 'signature-guarded';
  if (endpoint.startsWith('/api/cron/') || endpoint.startsWith('/api/engine/processors/')) return 'token-guarded';
  if (endpoint.startsWith('/api/internal/command-center')) return 'command-center-guarded';
  if (endpoint.startsWith('/api/fixtures/')) return 'fixture-only';

  return 'protected-session';
}

function apiSmokeBucket(guardIntent, methods, mutationClass) {
  const hasGet = methods.includes('GET');

  if (guardIntent === 'public-read' && hasGet) return 'public-json';
  if (guardIntent === 'public-auth-entry') return 'auth-entry-contract';
  if (guardIntent === 'signature-guarded') return 'signature-contract-only';
  if (guardIntent === 'token-guarded') return 'token-contract-only';
  if (guardIntent === 'command-center-guarded') return 'command-center-contract-only';
  if (guardIntent === 'fixture-only') return 'fixture-contract-only';
  if (guardIntent === 'internal-docs') return 'internal-docs-contract';
  if (guardIntent === 'protected-session' && hasGet) return 'authenticated-read';
  if (guardIntent === 'protected-session' && mutationClass === 'mutating') return 'negative-authz-contract-only';
  return 'contract-review';
}

function apiRisk(api, guardIntent, mutationClass) {
  const endpoint = api.endpoint;
  if (
    api.app === 'ops' &&
    (
      endpoint.includes('/finance') ||
      endpoint.includes('/payout') ||
      endpoint.includes('/refund') ||
      endpoint.includes('/stripe') ||
      endpoint.includes('/cron') ||
      endpoint.includes('/processors') ||
      endpoint.includes('/team') ||
      endpoint.includes('/internal') ||
      endpoint.includes('/fixtures')
    )
  ) return 'high';
  if (['signature-guarded', 'token-guarded', 'command-center-guarded', 'fixture-only'].includes(guardIntent)) return 'high';
  if (mutationClass !== 'read-only') return 'medium';
  return 'low';
}

function guardReason(guardIntent, mutationClass) {
  const reasons = {
    'public-read': 'Intentional public read or health surface.',
    'public-auth-entry': 'Public auth endpoint for login, signup, logout, or recovery flow.',
    'protected-session': 'Requires an app session or actor context before returning application data.',
    'signature-guarded': 'External webhook route that is guarded by request signature verification.',
    'token-guarded': 'Processor or cron route that is guarded by a server token.',
    'command-center-guarded': 'Internal command-center route guarded by environment and platform access controls.',
    'fixture-only': 'Fixture/reset route reserved for controlled test or admin workflows.',
    'internal-docs': 'Route handler outside the public API namespace for internal documentation delivery.',
  };
  return `${reasons[guardIntent] || 'Route requires contract review.'} Method class: ${mutationClass}.`;
}

function classifyApi(api, options = {}) {
  const source = options.source || readSource(options.root || process.cwd(), api.file);
  const methods = exportedMethods(source);
  const mutationClass = methodMutationClass(methods);
  const guardIntent = apiGuardIntent(api);
  return {
    kind: 'api',
    methods,
    guardIntent,
    mutationClass,
    risk: apiRisk(api, guardIntent, mutationClass),
    liveSmokeBucket: apiSmokeBucket(guardIntent, methods, mutationClass),
    reason: guardReason(guardIntent, mutationClass),
  };
}

function collectSurfaceClassifications(options = {}) {
  const repoRoot = options.root || process.cwd();
  const inventory = options.inventory || discoverRuntimeSurfaces({ root: repoRoot, apps: options.apps });
  const pages = inventory.pages.map((page) => ({
    ...page,
    classification: classifyPage(page),
  }));
  const apis = inventory.apis.map((api) => ({
    ...api,
    classification: classifyApi(api, { root: repoRoot }),
  }));
  const failures = validateSurfaceClassifications({ pages, apis });

  return {
    ok: failures.length === 0,
    generatedAt: new Date().toISOString(),
    pageTotals: {
      total: pages.length,
      classified: pages.filter((page) => page.classification.authIntent).length,
      unclassified: pages.filter((page) => !page.classification.authIntent).length,
    },
    apiTotals: {
      total: apis.length,
      classified: apis.filter((api) => api.classification.guardIntent && api.classification.methods.length).length,
      unclassified: apis.filter((api) => !api.classification.guardIntent || !api.classification.methods.length).length,
    },
    pages,
    apis,
    failures,
  };
}

function validateSurfaceClassifications(summary) {
  const failures = [];
  for (const page of summary.pages) {
    if (!page.classification?.authIntent) failures.push(`${page.file}: missing page auth intent`);
    if (!page.classification?.liveSmokeBucket) failures.push(`${page.file}: missing page live smoke bucket`);
  }
  for (const api of summary.apis) {
    if (!api.classification?.methods?.length) failures.push(`${api.file}: missing exported HTTP method`);
    if (!api.classification?.guardIntent) failures.push(`${api.file}: missing API guard intent`);
    if (!api.classification?.mutationClass || api.classification.mutationClass === 'unknown') {
      failures.push(`${api.file}: missing API mutation class`);
    }
    if (!api.classification?.liveSmokeBucket) failures.push(`${api.file}: missing API live smoke bucket`);
  }
  return failures;
}

function escapeCell(value) {
  return String(value ?? '-').replace(/\|/g, '\\|');
}

function pageRows(pages) {
  return pages.map((page) => (
    `| ${escapeCell(page.appName)} | \`${escapeCell(page.route)}\` | \`${escapeCell(page.file)}\` | ${escapeCell(page.classification.authIntent)} | ${escapeCell(page.classification.liveSmokeBucket)} | ${escapeCell(page.classification.reason)} |`
  )).join('\n');
}

function apiRows(apis) {
  return apis.map((api) => (
    `| ${escapeCell(api.appName)} | \`${escapeCell(api.endpoint)}\` | \`${escapeCell(api.file)}\` | ${escapeCell(api.classification.methods.join(', '))} | ${escapeCell(api.classification.guardIntent)} | ${escapeCell(api.classification.mutationClass)} | ${escapeCell(api.classification.risk)} | ${escapeCell(api.classification.liveSmokeBucket)} |`
  )).join('\n');
}

function failureRows(failures) {
  if (!failures.length) return 'None found.';
  return failures.map((failure) => `| ${escapeCell(failure)} |`).join('\n');
}

function generateMarkdown(summary = collectSurfaceClassifications()) {
  return `# Runtime Surface Classification

Generated: ${summary.generatedAt}

This Phase 18/19 classification inventory records the intended auth, guard, method, mutation-risk, and smoke-bucket treatment for every discovered app page and route handler. It is structural coverage, not a claim that every dynamic or mutating route is safe to exercise against production.

## Summary

| Surface | Total discovered | Classified | Unclassified |
|---|---:|---:|---:|
| Pages | ${summary.pageTotals.total} | ${summary.pageTotals.classified} | ${summary.pageTotals.unclassified} |
| API route handlers | ${summary.apiTotals.total} | ${summary.apiTotals.classified} | ${summary.apiTotals.unclassified} |

## Page Surface Classification

| App | Route | File | Auth intent | Smoke bucket | Reason |
|---|---|---|---|---|---|
${pageRows(summary.pages)}

## API Route Handler Classification

| App | Endpoint | File | Methods | Guard intent | Mutation class | Risk | Smoke bucket |
|---|---|---|---|---|---|---|---|
${apiRows(summary.apis)}

## Failures

${failureRows(summary.failures)}
`;
}

function writeFileEnsured(relativePath, content, repoRoot = process.cwd()) {
  const absolutePath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
}

function writeDocs(summary = collectSurfaceClassifications(), options = {}) {
  const repoRoot = options.root || process.cwd();
  const markdown = generateMarkdown(summary);
  const outputs = [
    'docs/wiring/RUNTIME_SURFACE_CLASSIFICATION.md',
    'docs/architecture/codebase-map/wiring/RUNTIME_SURFACE_CLASSIFICATION.md',
    'docs/obsidian/codebase-map/Runtime Surface Classification.md',
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
  console.log('Runtime surface classification');
  console.log(`Pages: ${summary.pageTotals.classified}/${summary.pageTotals.total} classified; ${summary.pageTotals.unclassified} unclassified`);
  console.log(`APIs: ${summary.apiTotals.classified}/${summary.apiTotals.total} classified; ${summary.apiTotals.unclassified} unclassified`);
  if (summary.failures.length) {
    console.log('Classification failures');
    for (const failure of summary.failures) console.log(` - ${failure}`);
  }
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const summary = collectSurfaceClassifications();
  if (args.writeDocs) writeDocs(summary);
  if (args.json) console.log(JSON.stringify(summary, null, 2));
  else printTextSummary(summary);
  if (!summary.ok) process.exitCode = 1;
}

module.exports = {
  classifyApi,
  classifyPage,
  collectSurfaceClassifications,
  discoverRuntimeSurfaces,
  exportedMethods,
  generateMarkdown,
  parseArgs,
  routeFromFile,
  runtimeApps,
  validateSurfaceClassifications,
  writeDocs,
};

