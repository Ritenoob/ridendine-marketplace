#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { collectProofDisposition } = require('./runtime-proof-disposition.cjs');
const {
  baseUrlForApp,
  checkAuthenticatedJsonApi,
  checkPageContract,
  checkPublicJsonApi,
  createAppSession,
} = require('./runtime-contract-smoke.cjs');
const {
  apps,
  protectedJsonApis,
  publicJsonApis,
} = require('./runtime-contracts.cjs');
const {
  applySampleValues,
  resolveRuntimeSamples,
} = require('./runtime-sample-fixtures.cjs');

const PAGE_BUCKETS = new Set([
  'public-page-smoke',
  'login-guard-page-smoke',
  'sampled-login-guard-page-smoke',
]);

const LIVE_JSON_BUCKETS = new Set([
  'public-json-smoke',
  'authenticated-json-smoke',
  'sampled-authenticated-json-smoke',
]);

const CONTRACT_ONLY_API_BUCKETS = new Set([
  'negative-authz-contract',
  'authenticated-read-and-negative-write-contract',
  'auth-entry-contract',
  'token-contract',
  'signature-contract',
  'command-center-contract',
  'fixture-contract',
  'internal-docs-contract',
]);

const API_BUCKETS = new Set([
  ...LIVE_JSON_BUCKETS,
  ...CONTRACT_ONLY_API_BUCKETS,
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

function sampleValuesForAction(action, samples = {}) {
  const target = action.route || action.endpoint || action.path || '';
  const values = {};

  if (target.includes('[slug]')) values.slug = samples.chefSlug;
  if (target.includes('[orderId]')) values.orderId = samples.orderId;
  if (target.includes('[runId]')) values.runId = samples.payoutRunId || 'phase-proof-payout-run';

  if (target.includes('[id]')) {
    if (target.includes('storefronts/[id]')) values.id = samples.storefrontId;
    else if (target.includes('support/tickets/[id]')) values.id = samples.supportTicketId;
    else if (target.includes('orders/[id]')) values.id = samples.orderId;
    else if (target.includes('delivery/[id]') || target.includes('deliveries/[id]')) values.id = samples.deliveryId;
    else if (target.includes('drivers/[id]') || target.includes('accounts/drivers/[id]')) values.id = samples.driverId;
    else if (target.includes('chefs/[id]') || target.includes('accounts/chefs/[id]')) values.id = samples.chefId;
    else values.id = samples.id;
  }

  return Object.fromEntries(Object.entries(values).filter(([, value]) => Boolean(value)));
}

function applySamplesToAction(action, samples = {}) {
  if (!hasDynamicSegment(action.route || action.endpoint)) return action;
  const target = action.route || action.endpoint;
  const values = sampleValuesForAction(action, samples);
  const resolved = applySampleValues(target, values);
  const sampleResolved = !hasDynamicSegment(resolved);
  return {
    ...action,
    runtimePath: sampleResolved ? resolved : action.runtimePath,
    sampleResolved,
    sampleValues: values,
  };
}

function normalizeRuntimePath(value) {
  const withoutQuery = String(value || '').split('?')[0].replace(/\/+$/, '');
  return withoutQuery || '/';
}

function matchingRuntimeApiContract(api, bucket) {
  if (
    bucket === 'authenticated-json-smoke' &&
    api.app === 'customer' &&
    normalizeRuntimePath(api.endpoint) === '/api/promos/validate'
  ) {
    return {
      kind: 'api',
      app: 'customer',
      path: '/api/promos/validate?code=RIDENDINE-SMOKE-NOTFOUND&subtotal=0',
      authIntent: 'protected',
      expect: 'json',
      authenticated: true,
      note: 'Uses a harmless nonexistent code so authenticated validation returns 200 JSON without applying a promo.',
    };
  }

  const contracts = bucket === 'public-json-smoke' ? publicJsonApis : protectedJsonApis;
  return contracts.find((contract) =>
    contract.app === api.app && normalizeRuntimePath(contract.path) === normalizeRuntimePath(api.endpoint)
  ) || null;
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

  for (const api of disposition.apis || []) {
    const bucket = bucketForItem(api, bucketSet);
    if (!bucket || !API_BUCKETS.has(bucket)) continue;
    selected.push({
      ...api,
      kind: 'api',
      bucket,
      endpoint: api.endpoint,
      runtimePath: bucket === 'sampled-authenticated-json-smoke' ? sampledPath(api.endpoint) : api.endpoint,
      runtimeContract: matchingRuntimeApiContract(api, bucket),
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

function apiContractForAction(action) {
  if (action.runtimeContract) return action.runtimeContract;
  return {
    kind: 'api',
    app: action.app,
    path: action.runtimePath || action.endpoint,
    authIntent: action.bucket === 'public-json-smoke' ? 'public' : 'protected',
    expect: 'json',
    allowedStatuses: action.bucket === 'public-json-smoke' ? [200, 400] : [200],
    authenticated: action.bucket === 'authenticated-json-smoke' || action.bucket === 'sampled-authenticated-json-smoke',
  };
}

function requiresSampleResolution(action) {
  if (!hasDynamicSegment(action.route || action.endpoint)) return false;
  if (action.kind === 'api') return LIVE_JSON_BUCKETS.has(action.bucket);
  if (action.kind === 'page') return action.bucket === 'public-page-smoke';
  return false;
}

function shouldSkipAction(action) {
  if (action.kind === 'api' && action.endpoint === '/api/export') {
    return 'CSV export endpoint is covered by smoke:ops-export-audit, not JSON proof actions';
  }
  if (action.kind === 'api' && LIVE_JSON_BUCKETS.has(action.bucket) && hasDynamicSegment(action.endpoint) && !action.sampleResolved) {
    return 'dynamic API requires Thread 5 sample fixture before live proof';
  }
  if (action.bucket === 'sampled-authenticated-json-smoke' && !action.sampleResolved) {
    return 'dynamic API requires Thread 5 sample fixture before live proof';
  }
  if (action.bucket === 'sampled-login-guard-page-smoke') return null;
  if (hasDynamicSegment(action.route) && !action.sampleResolved) {
    return 'dynamic page requires Thread 5 sample fixture before live proof';
  }
  return null;
}

function contractOnlyMessage(action) {
  if (action.bucket === 'auth-entry-contract') return 'auth entry route recorded as contract-only; no signup/login mutation was attempted';
  if (action.bucket === 'authenticated-read-and-negative-write-contract') return 'mixed read/write route recorded as contract-only; no mutating write was attempted';
  if (action.bucket === 'negative-authz-contract') return 'negative authorization contract recorded; no successful mutating call was made';
  if (action.bucket === 'token-contract') return 'token-guarded route recorded with invalid/missing token denial contract';
  if (action.bucket === 'signature-contract') return 'signature-guarded route recorded with invalid/missing signature denial contract';
  if (action.bucket === 'command-center-contract') return 'command-center route recorded with disabled/unauthorized access contract';
  if (action.bucket === 'fixture-contract') return 'fixture-only route recorded as contract-only proof';
  if (action.bucket === 'internal-docs-contract') return 'internal documentation route recorded as contract-only proof';
  return 'contract-only proof recorded';
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
      route: action.route || action.endpoint,
      path: action.runtimePath || action.route || action.endpoint,
      status: 0,
      message: skipReason,
    };
  }

  if (CONTRACT_ONLY_API_BUCKETS.has(action.bucket)) {
    return {
      ok: true,
      kind: action.kind,
      bucket: action.bucket,
      app: action.app,
      endpoint: action.endpoint,
      path: action.endpoint,
      status: 0,
      message: contractOnlyMessage(action),
    };
  }

  if (action.kind === 'api' && action.bucket === 'public-json-smoke') {
    const contract = apiContractForAction(action);
    const result = await checkPublicJsonApi(contract, {
      baseUrl: baseUrlForApp(action.app, options.env, options.appConfig || apps),
      fetchImpl: options.fetchImpl || fetch,
      timeoutMs: options.timeoutMs || 45_000,
    });
    return {
      ...result,
      bucket: action.bucket,
      endpoint: action.endpoint,
      sourcePath: action.file,
    };
  }

  if (
    action.kind === 'api' &&
    (action.bucket === 'authenticated-json-smoke' || action.bucket === 'sampled-authenticated-json-smoke')
  ) {
    const session = options.sessions?.get(action.app);
    if (!session || !session.authenticated) {
      return {
        ok: false,
        kind: action.kind,
        bucket: action.bucket,
        app: action.app,
        endpoint: action.endpoint,
        path: action.endpoint,
        status: session?.status || 0,
        message: session ? session.message : 'authenticated session was not available',
      };
    }

    const contract = apiContractForAction(action);
    const result = await checkAuthenticatedJsonApi(contract, {
      baseUrl: baseUrlForApp(action.app, options.env, options.appConfig || apps),
      fetchImpl: options.fetchImpl || fetch,
      timeoutMs: options.timeoutMs || 45_000,
      cookieHeader: session.cookieHeader,
    });
    return {
      ...result,
      bucket: action.bucket,
      endpoint: action.endpoint,
      sourcePath: action.file,
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

function firstEnv(env, names) {
  for (const name of names) {
    if (env[name]) return env[name];
  }
  return '';
}

function credentialsFromEnv(env = process.env) {
  return {
    email: firstEnv(env, ['RIDENDINE_SMOKE_EMAIL', 'RIDENDINE_ADMIN_EMAIL']),
    password: firstEnv(env, ['RIDENDINE_SMOKE_PASSWORD', 'RIDENDINE_ADMIN_PASSWORD']),
  };
}

async function runRuntimeProofActionSmoke(options = {}) {
  let selected = selectProofActions(options);
  const results = [];
  const skipped = [];
  const sessions = new Map();
  const dynamicActions = selected.filter((action) => hasDynamicSegment(action.route || action.endpoint));
  let sampleSummary = null;

  if (options.requireSamples || options.discoverSamples) {
    sampleSummary = await resolveRuntimeSamples({
      env: options.env || process.env,
      credentials: options.credentials || credentialsFromEnv(options.env || process.env),
      discoverLive: true,
      createSupportTicket: Boolean(options.allowCreateSupportTicket),
      timeoutMs: options.timeoutMs || 45_000,
    });
    selected = selected.map((action) => applySamplesToAction(action, sampleSummary.samples));

    if (options.requireSamples) {
      const unresolved = selected.filter((action) => requiresSampleResolution(action) && !action.sampleResolved);
      if (unresolved.length) {
        const failures = unresolved.map((action) => `${action.bucket} ${action.app} ${action.route || action.endpoint}: required sample fixture missing`);
        return {
          ok: false,
          generatedAt: new Date().toISOString(),
          buckets: options.buckets && options.buckets.length ? options.buckets : DEFAULT_BUCKETS,
          selected: selected.length,
          results,
          skipped,
          sampleSummary,
          totals: { ok: false, passed: 0, failed: failures.length, skipped: skipped.length, failures },
          failures,
        };
      }
    }
  } else if (dynamicActions.length) {
    selected = selected.map((action) => applySamplesToAction(action, {}));
  }

  const authActions = selected.filter((action) =>
    action.bucket === 'authenticated-json-smoke' || action.bucket === 'sampled-authenticated-json-smoke'
  );

  if (authActions.length) {
    const credentials = options.credentials || credentialsFromEnv(options.env || process.env);
    if (!credentials.email || !credentials.password) {
      const message = 'authenticated runtime proof credentials are required';
      if (options.requireAuth) {
        const failures = [message];
        return {
          ok: false,
          generatedAt: new Date().toISOString(),
          buckets: options.buckets && options.buckets.length ? options.buckets : DEFAULT_BUCKETS,
          selected: selected.length,
          results,
          skipped,
          totals: { ok: false, passed: 0, failed: 1, skipped: skipped.length, failures },
          failures,
        };
      }
      skipped.push({
        ok: true,
        skipped: true,
        bucket: 'authenticated-json-smoke',
        app: 'all',
        route: '-',
        status: 0,
        message,
      });
    } else {
      for (const appKey of [...new Set(authActions.map((action) => action.app))]) {
        const session = await createAppSession(appKey, {
          env: options.env || process.env,
          appConfig: options.appConfig || apps,
          fetchImpl: options.fetchImpl || fetch,
          timeoutMs: options.timeoutMs || 45_000,
          credentials,
        });
        sessions.set(appKey, session);
        results.push({
          ok: session.authenticated,
          kind: 'auth',
          bucket: 'authenticated-json-smoke',
          app: appKey,
          path: `${appKey} login`,
          status: session.status || 0,
          message: session.message,
        });
      }
    }
  }

  for (const action of selected) {
    const result = await checkProofAction(action, { ...options, sessions });
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
    sampleSummary,
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
    `| SKIP | ${escapeCell(item.bucket)} | ${escapeCell(item.app)} | \`${escapeCell(item.path || item.route || item.endpoint)}\` | ${escapeCell(item.message)} |`
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
    requireAuth: false,
    requireSamples: false,
    discoverSamples: false,
    allowCreateSupportTicket: false,
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
    else if (arg === '--require-auth') parsed.requireAuth = true;
    else if (arg === '--require-samples') parsed.requireSamples = true;
    else if (arg === '--discover-samples') parsed.discoverSamples = true;
    else if (arg === '--allow-create-support-ticket') parsed.allowCreateSupportTicket = true;
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
    console.log(`SKIP ${item.bucket} ${item.app} ${item.path || item.route || item.endpoint} - ${item.message}`);
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
