#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const {
  apps,
} = require('./runtime-contracts.cjs');

const {
  baseUrlForApp,
  createAppSession,
} = require('./runtime-contract-smoke.cjs');

const USER_AGENT = 'RidenDine-Live-Role-Fixture-Smoke/phase-14';

function liveProbe(app, path, appSurface, capability, note = '') {
  return {
    app,
    path,
    method: 'GET',
    expect: 'json',
    appSurface,
    capability,
    liveSafe: true,
    note,
  };
}

const liveRoleFixtureContracts = [
  liveProbe('customer', '/api/profile', 'Customer marketplace', 'customer_profile'),
  liveProbe('customer', '/api/orders', 'Customer marketplace', 'customer_orders'),
  liveProbe('customer', '/api/loyalty', 'Customer marketplace', 'customer_loyalty'),

  liveProbe('chef', '/api/profile', 'Chef admin', 'chef_profile'),
  liveProbe('chef', '/api/storefront', 'Chef admin', 'chef_storefront'),
  liveProbe('chef', '/api/orders', 'Chef admin', 'chef_orders'),

  liveProbe('driver', '/api/driver', 'Driver app', 'driver_profile'),
  liveProbe('driver', '/api/deliveries', 'Driver app', 'driver_deliveries'),
  liveProbe('driver', '/api/offers', 'Driver app', 'driver_offers'),
  liveProbe('driver', '/api/earnings', 'Driver app', 'driver_earnings'),

  liveProbe('ops', '/api/engine/health', 'Ops admin', 'engine_health'),
  liveProbe('ops', '/api/ops/live-board', 'Ops admin', 'dashboard_read'),
  liveProbe('ops', '/api/orders', 'Ops admin', 'ops_orders_read'),
  liveProbe('ops', '/api/customers', 'Ops admin', 'ops_entity_read'),
  liveProbe('ops', '/api/drivers', 'Ops admin', 'ops_entity_read'),
  liveProbe('ops', '/api/chefs', 'Ops admin', 'ops_entity_read'),
  liveProbe('ops', '/api/deliveries', 'Ops admin', 'deliveries_read'),
  liveProbe('ops', '/api/support', 'Ops admin', 'support_queue'),
  liveProbe('ops', '/api/engine/exceptions', 'Ops admin', 'exceptions_read'),
  liveProbe('ops', '/api/engine/dispatch', 'Ops admin', 'dispatch_read'),
  liveProbe('ops', '/api/engine/dispatch/offer-history', 'Ops admin', 'dispatch_read'),
  liveProbe('ops', '/api/engine/finance', 'Ops admin', 'finance_engine'),
  liveProbe('ops', '/api/engine/reconciliation', 'Ops admin', 'finance_engine'),
  liveProbe('ops', '/api/engine/refunds', 'Ops admin', 'finance_refunds_read'),
  liveProbe('ops', '/api/engine/payouts', 'Ops admin', 'finance_payouts'),
  liveProbe('ops', '/api/engine/payouts/instant', 'Ops admin', 'finance_payouts'),
  liveProbe('ops', '/api/team', 'Ops admin', 'team_list'),
];

function trimBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

function contractUrl(contract, baseUrl) {
  return `${trimBaseUrl(baseUrl)}${contract.path}`;
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readText(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function responseHeader(response, name) {
  if (!response.headers || typeof response.headers.get !== 'function') return '';
  return response.headers.get(name) || '';
}

function isJson(response, body) {
  const contentType = responseHeader(response, 'content-type');
  const sample = body.trimStart();
  return contentType.includes('application/json') || sample.startsWith('{') || sample.startsWith('[');
}

function result(ok, contract, status, url, message) {
  return {
    ok,
    app: contract.app,
    appSurface: contract.appSurface,
    path: contract.path,
    method: contract.method,
    capability: contract.capability,
    status,
    url,
    message,
  };
}

async function checkLiveJsonProbe(contract, options) {
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || 45_000;
  const url = contractUrl(contract, options.baseUrl);
  const response = await fetchWithTimeout(
    fetchImpl,
    url,
    {
      method: contract.method,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Cookie: options.cookieHeader,
      },
    },
    timeoutMs
  );
  const body = await readText(response);
  const ok = response.status === 200 && isJson(response, body);
  const message = ok
    ? 'seeded super-admin read probe returned 200 JSON'
    : `seeded super-admin read probe failed ${response.status}${isJson(response, body) ? ' JSON' : ''}`;
  return result(ok, contract, response.status, response.url || url, message);
}

function normalizeOptions(options = {}) {
  return {
    env: options.env || process.env,
    appConfig: options.appConfig || apps,
    contracts: options.contracts || liveRoleFixtureContracts,
    fetchImpl: options.fetchImpl || fetch,
    timeoutMs: options.timeoutMs || 45_000,
    requireAuth: Boolean(options.requireAuth),
    credentials: options.credentials || {
      email: process.env.RIDENDINE_SMOKE_EMAIL || '',
      password: process.env.RIDENDINE_SMOKE_PASSWORD || '',
    },
  };
}

async function runLiveRoleFixtureSmoke(options = {}) {
  const normalized = normalizeOptions(options);
  const results = [];
  const failures = [];
  const skipped = [];
  const sessions = [];
  const hasCredentials = Boolean(normalized.credentials.email && normalized.credentials.password);

  if (normalized.requireAuth && !hasCredentials) {
    return {
      ok: false,
      account: normalized.credentials.email || '',
      sessions,
      results,
      failures: ['live role fixture credentials are required'],
      skipped,
    };
  }

  if (!hasCredentials) {
    return {
      ok: false,
      account: '',
      sessions,
      results,
      failures: ['live role fixture credentials are required'],
      skipped,
    };
  }

  const contracts = normalized.contracts;
  for (const contract of contracts) {
    if (contract.method !== 'GET' || contract.liveSafe !== true) {
      failures.push(`${contract.app} ${contract.path}: live role fixture probes must be read-only GET contracts`);
    }
  }
  if (failures.length) {
    return {
      ok: false,
      account: normalized.credentials.email,
      sessions,
      results,
      failures,
      skipped,
    };
  }

  const appKeys = [...new Set(contracts.map((contract) => contract.app))];
  const sessionMap = new Map();

  for (const appKey of appKeys) {
    const session = await createAppSession(appKey, normalized);
    sessions.push(session);
    sessionMap.set(appKey, session);
    if (!session.authenticated) {
      failures.push(`${appKey} login: ${session.message} (${session.status || 'skipped'})`);
    }
  }

  for (const contract of contracts) {
    const session = sessionMap.get(contract.app);
    if (!session || !session.authenticated) continue;

    const check = await checkLiveJsonProbe(contract, {
      baseUrl: baseUrlForApp(contract.app, normalized.env, normalized.appConfig),
      fetchImpl: normalized.fetchImpl,
      timeoutMs: normalized.timeoutMs,
      cookieHeader: session.cookieHeader,
    });
    results.push(check);
    if (!check.ok) {
      failures.push(`${check.app} ${check.path}: ${check.message} (${check.status})`);
    }
  }

  return {
    ok: failures.length === 0,
    account: normalized.credentials.email,
    sessions,
    results,
    failures,
    skipped,
  };
}

function escapeCell(value) {
  return String(value ?? '-').replace(/\|/g, '\\|');
}

function generateMarkdown(summary) {
  const generatedAt = new Date().toISOString();
  const passed = summary ? summary.results.filter((item) => item.ok).length : 0;
  const failed = summary ? summary.failures.length : 0;
  const rows = liveRoleFixtureContracts.map((contract) => {
    const check = summary?.results.find((item) => item.app === contract.app && item.path === contract.path);
    const status = check ? (check.ok ? 'PASS' : 'FAIL') : 'CONTRACT';
    const code = check ? check.status : '-';
    return `| ${status} | ${escapeCell(contract.appSurface)} | \`${escapeCell(contract.method)}\` | \`${escapeCell(contract.path)}\` | ${escapeCell(contract.capability)} | ${code} | ${escapeCell(contract.note || 'Read-only live fixture probe')} |`;
  });

  const failureRows = summary && summary.failures.length
    ? summary.failures.map((failure) => `| ${escapeCell(failure)} |`).join('\n')
    : 'None found.';

  return `# Live Role Fixture Smoke

Generated: ${generatedAt}

This generated smoke matrix proves the seeded full-access test account can log into app-owned Customer, Chef, Driver, and Ops auth flows and exercise read-only live JSON probes. All probes after login are live-safe GET requests.

## Summary

| Metric | Count |
|---|---:|
| Live-safe GET contracts | ${liveRoleFixtureContracts.length} |
| Passed live probes | ${passed} |
| Failed checks | ${failed} |

## Probe Matrix

| Status | App surface | Method | Route | Capability / surface | Last status | Notes |
|---|---|---|---|---|---:|---|
${rows.join('\n')}

## Failures

${failureRows}
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
    'docs/wiring/LIVE_ROLE_FIXTURE_SMOKE.md',
    'docs/architecture/codebase-map/wiring/LIVE_ROLE_FIXTURE_SMOKE.md',
    'docs/obsidian/codebase-map/Live Role Fixture Smoke.md',
  ];
  for (const output of outputs) writeFileEnsured(output, markdown, repoRoot);
  return outputs;
}

function parseArgs(argv) {
  const parsed = {
    requireAuth: false,
    json: false,
    writeDocs: false,
    timeoutMs: 45_000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--require-auth') parsed.requireAuth = true;
    else if (arg === '--json') parsed.json = true;
    else if (arg === '--write-docs') parsed.writeDocs = true;
    else if (arg === '--timeout-ms') {
      parsed.timeoutMs = Number(argv[i + 1]);
      i += 1;
    }
  }

  return parsed;
}

function printTextSummary(summary) {
  console.log('Live role fixture smoke checks');
  for (const session of summary.sessions) {
    const marker = session.authenticated ? 'PASS' : 'FAIL';
    console.log(`${marker} ${session.app} login - ${session.message}${session.status ? ` (${session.status})` : ''}`);
  }
  for (const item of summary.results) {
    const marker = item.ok ? 'PASS' : 'FAIL';
    console.log(`${marker} ${item.app} ${item.path} ${item.status} - ${item.message}`);
  }
  for (const item of summary.skipped) {
    console.log(`SKIP ${item}`);
  }
  if (summary.failures.length) {
    console.log('Live role fixture smoke failures');
    for (const failure of summary.failures) console.log(` - ${failure}`);
  }
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  runLiveRoleFixtureSmoke(args)
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
  checkLiveJsonProbe,
  generateMarkdown,
  liveRoleFixtureContracts,
  parseArgs,
  runLiveRoleFixtureSmoke,
  writeDocs,
};
