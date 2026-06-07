#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { apps } = require('./runtime-contracts.cjs');
const {
  baseUrlForApp,
  createAppSession,
} = require('./runtime-contract-smoke.cjs');

const USER_AGENT = 'RidenDine-Non-Admin-Role-Fixture-Smoke/phase-15';

const nonAdminRoleFixtures = [
  {
    role: 'support_agent',
    label: 'Support agent',
    emailEnv: ['RIDENDINE_SUPPORT_AGENT_EMAIL', 'RIDENDINE_SMOKE_SUPPORT_AGENT_EMAIL'],
    passwordEnv: ['RIDENDINE_SUPPORT_AGENT_PASSWORD', 'RIDENDINE_SMOKE_SUPPORT_AGENT_PASSWORD'],
  },
  {
    role: 'finance_manager',
    label: 'Finance manager',
    emailEnv: ['RIDENDINE_FINANCE_MANAGER_EMAIL', 'RIDENDINE_SMOKE_FINANCE_MANAGER_EMAIL'],
    passwordEnv: ['RIDENDINE_FINANCE_MANAGER_PASSWORD', 'RIDENDINE_SMOKE_FINANCE_MANAGER_PASSWORD'],
  },
  {
    role: 'ops_agent',
    label: 'Ops agent',
    emailEnv: ['RIDENDINE_OPS_AGENT_EMAIL', 'RIDENDINE_SMOKE_OPS_AGENT_EMAIL'],
    passwordEnv: ['RIDENDINE_OPS_AGENT_PASSWORD', 'RIDENDINE_SMOKE_OPS_AGENT_PASSWORD'],
  },
];

function probe(role, path, expectation, capability, note = '') {
  return {
    role,
    app: 'ops',
    path,
    method: 'GET',
    expectedStatus: expectation === 'allow' ? 200 : 403,
    expectation,
    capability,
    liveSafe: true,
    note,
  };
}

const nonAdminRoleProbeContracts = [
  probe('support_agent', '/api/support', 'allow', 'support_queue', 'Support can work the support queue.'),
  probe('support_agent', '/api/orders', 'allow', 'ops_orders_read', 'Support can read order context.'),
  probe('support_agent', '/api/engine/exceptions', 'allow', 'exceptions_read', 'Support can read exception context.'),
  probe('support_agent', '/api/engine/finance', 'deny', 'finance_engine', 'Support cannot read finance engine surfaces.'),
  probe('support_agent', '/api/team', 'deny', 'team_list', 'Support cannot list/manage platform team users.'),

  probe('finance_manager', '/api/engine/finance', 'allow', 'finance_engine', 'Finance can read finance engine surfaces.'),
  probe('finance_manager', '/api/engine/reconciliation', 'allow', 'finance_engine', 'Finance can read reconciliation surfaces.'),
  probe('finance_manager', '/api/engine/payouts', 'allow', 'finance_payouts', 'Finance can read payout surfaces.'),
  probe('finance_manager', '/api/orders', 'deny', 'ops_orders_read', 'Finance cannot read general ops order queues.'),
  probe('finance_manager', '/api/support', 'deny', 'support_queue', 'Finance cannot read support queue surfaces.'),

  probe('ops_agent', '/api/orders', 'allow', 'ops_orders_read', 'Ops agent can read order queues.'),
  probe('ops_agent', '/api/engine/dispatch', 'allow', 'dispatch_read', 'Ops agent can read dispatch surfaces.'),
  probe('ops_agent', '/api/support', 'allow', 'support_queue', 'Ops agent can read support queues.'),
  probe('ops_agent', '/api/engine/finance', 'deny', 'finance_engine', 'Ops agent cannot read finance engine surfaces.'),
  probe('ops_agent', '/api/team', 'deny', 'team_list', 'Ops agent cannot list/manage platform team users.'),
];

function trimBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

function contractUrl(contract, baseUrl) {
  return `${trimBaseUrl(baseUrl)}${contract.path}`;
}

function contractApp(contract) {
  return contract.app || 'ops';
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

function firstEnv(env, names) {
  for (const name of names) {
    if (env[name]) return env[name];
  }
  return '';
}

function credentialsFromEnv(env = process.env) {
  const credentials = {};
  for (const fixture of nonAdminRoleFixtures) {
    const email = firstEnv(env, fixture.emailEnv);
    const password = firstEnv(env, fixture.passwordEnv);
    if (email && password) credentials[fixture.role] = { email, password };
  }
  return credentials;
}

function result(ok, contract, status, url, message) {
  return {
    ok,
    role: contract.role,
    app: contractApp(contract),
    path: contract.path,
    method: contract.method,
    capability: contract.capability,
    expectation: contract.expectation,
    expectedStatus: contract.expectedStatus,
    status,
    url,
    message,
  };
}

async function checkRoleProbe(contract, options) {
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
  const json = isJson(response, body);
  const ok = response.status === contract.expectedStatus && json;
  const message = ok
    ? `${contract.role} ${contract.expectation} probe matched ${contract.expectedStatus} JSON`
    : `${contract.role} ${contract.expectation} probe expected ${contract.expectedStatus} JSON but got ${response.status}${json ? ' JSON' : ''}`;
  return result(ok, contract, response.status, response.url || url, message);
}

function validateContracts(contracts = nonAdminRoleProbeContracts, options = {}) {
  const failures = [];
  const roles = new Set(nonAdminRoleFixtures.map((fixture) => fixture.role));
  const seen = new Set();

  for (const contract of contracts) {
    const key = `${contract.role}:${contract.method}:${contract.path}:${contract.expectation}`;
    if (seen.has(key)) failures.push(`duplicate contract ${key}`);
    seen.add(key);
    if (!roles.has(contract.role)) failures.push(`${key}: unknown role`);
    if (contractApp(contract) !== 'ops') failures.push(`${key}: non-admin role probes must target ops app`);
    if (contract.method !== 'GET' || contract.liveSafe !== true) {
      failures.push(`${key}: live role fixture probes must be read-only GET contracts`);
    }
    if (!['allow', 'deny'].includes(contract.expectation)) {
      failures.push(`${key}: expectation must be allow or deny`);
    }
    if (contract.expectedStatus !== 200 && contract.expectedStatus !== 403) {
      failures.push(`${key}: expected status must be 200 or 403`);
    }
  }

  const requiredRoles = options.requireAllFixtureRoles === false
    ? [...new Set(contracts.map((contract) => contract.role))]
    : [...roles];

  for (const role of requiredRoles) {
    const roleContracts = contracts.filter((contract) => contract.role === role);
    if (!roleContracts.some((contract) => contract.expectation === 'allow')) {
      failures.push(`${role}: missing allow contract`);
    }
    if (!roleContracts.some((contract) => contract.expectation === 'deny')) {
      failures.push(`${role}: missing deny contract`);
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    contracts,
  };
}

function normalizeOptions(options = {}) {
  return {
    env: options.env || process.env,
    appConfig: options.appConfig || apps,
    contracts: options.contracts || nonAdminRoleProbeContracts,
    fetchImpl: options.fetchImpl || fetch,
    timeoutMs: options.timeoutMs || 45_000,
    requireAuth: Boolean(options.requireAuth),
    requireAllRoles: Boolean(options.requireAllRoles),
    roleCredentials: options.roleCredentials || credentialsFromEnv(options.env || process.env),
  };
}

async function runNonAdminRoleFixtureSmoke(options = {}) {
  const normalized = normalizeOptions(options);
  const results = [];
  const failures = [];
  const skipped = [];
  const sessions = [];

  const validation = validateContracts(normalized.contracts, {
    requireAllFixtureRoles: normalized.contracts === nonAdminRoleProbeContracts,
  });
  if (!validation.ok) {
    return {
      ok: false,
      roles: [],
      sessions,
      results,
      failures: validation.failures,
      skipped,
    };
  }

  const allRoles = nonAdminRoleFixtures.map((fixture) => fixture.role);
  const configuredRoles = allRoles.filter((role) => {
    const credential = normalized.roleCredentials[role];
    return Boolean(credential?.email && credential?.password);
  });

  if (configuredRoles.length === 0) {
    return {
      ok: false,
      roles: [],
      sessions,
      results,
      failures: ['non-admin role credentials are required'],
      skipped,
    };
  }

  if (normalized.requireAllRoles) {
    const missing = allRoles.filter((role) => !configuredRoles.includes(role));
    for (const role of missing) failures.push(`${role} credentials are required`);
  }

  const sessionMap = new Map();
  for (const role of configuredRoles) {
    const session = await createAppSession('ops', {
      ...normalized,
      credentials: normalized.roleCredentials[role],
    });
    const roleSession = { ...session, role };
    sessions.push(roleSession);
    sessionMap.set(role, roleSession);
    if (!session.authenticated) {
      failures.push(`${role} ops login: ${session.message} (${session.status || 'skipped'})`);
    }
  }

  for (const contract of normalized.contracts) {
    if (!configuredRoles.includes(contract.role)) {
      skipped.push(`${contract.role} ${contract.path}: credentials not configured`);
      continue;
    }

    const session = sessionMap.get(contract.role);
    if (!session || !session.authenticated) continue;

    const check = await checkRoleProbe(contract, {
      baseUrl: baseUrlForApp(contractApp(contract), normalized.env, normalized.appConfig),
      fetchImpl: normalized.fetchImpl,
      timeoutMs: normalized.timeoutMs,
      cookieHeader: session.cookieHeader,
    });
    results.push(check);
    if (!check.ok) {
      failures.push(`${check.role} ${check.path}: ${check.message}`);
    }
  }

  return {
    ok: failures.length === 0,
    roles: configuredRoles,
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
  const contractCount = nonAdminRoleProbeContracts.length;
  const passed = summary ? summary.results.filter((item) => item.ok).length : 0;
  const failed = summary ? summary.failures.length : 0;
  const rows = nonAdminRoleProbeContracts.map((contract) => {
    const check = summary?.results.find(
      (item) => item.role === contract.role && item.path === contract.path && item.expectation === contract.expectation
    );
    const skipped = summary?.skipped.find((item) => item.startsWith(`${contract.role} ${contract.path}:`));
    const status = check ? (check.ok ? 'PASS' : 'FAIL') : (skipped ? 'SKIP' : 'CONTRACT');
    const code = check ? check.status : contract.expectedStatus;
    return `| ${status} | ${escapeCell(contract.role)} | \`${escapeCell(contract.method)}\` | \`${escapeCell(contract.path)}\` | ${escapeCell(contract.expectation)} | ${escapeCell(contract.capability)} | ${code} | ${escapeCell(contract.note || 'Read-only non-admin role probe')} |`;
  });

  const failureRows = summary && summary.failures.length
    ? summary.failures.map((failure) => `| ${escapeCell(failure)} |`).join('\n')
    : 'None found.';

  return `# Non-Admin Role Fixture Smoke

Generated: ${generatedAt}

This generated smoke matrix verifies read-only live Ops access boundaries for seeded non-admin platform roles when their credentials are supplied. It uses app-owned Ops login, then runs GET probes that should either return 200 JSON for allowed capabilities or 403 JSON for denied capabilities.

## Summary

| Metric | Count |
|---|---:|
| Non-admin roles | ${nonAdminRoleFixtures.length} |
| Live-safe GET contracts | ${contractCount} |
| Passed live probes | ${passed} |
| Failed checks | ${failed} |

## Probe Matrix

| Status | Role | Method | Route | Expectation | Capability | Last status | Notes |
|---|---|---|---|---|---|---:|---|
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
    'docs/wiring/NON_ADMIN_ROLE_FIXTURE_SMOKE.md',
    'docs/architecture/codebase-map/wiring/NON_ADMIN_ROLE_FIXTURE_SMOKE.md',
    'docs/obsidian/codebase-map/Non Admin Role Fixture Smoke.md',
  ];
  for (const output of outputs) writeFileEnsured(output, markdown, repoRoot);
  return outputs;
}

function parseArgs(argv) {
  const parsed = {
    requireAuth: false,
    requireAllRoles: false,
    json: false,
    writeDocs: false,
    contractsOnly: false,
    timeoutMs: 45_000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--require-auth') parsed.requireAuth = true;
    else if (arg === '--require-all-roles') parsed.requireAllRoles = true;
    else if (arg === '--json') parsed.json = true;
    else if (arg === '--write-docs') parsed.writeDocs = true;
    else if (arg === '--contracts-only') parsed.contractsOnly = true;
    else if (arg === '--timeout-ms') {
      parsed.timeoutMs = Number(argv[i + 1]);
      i += 1;
    }
  }

  return parsed;
}

function printTextSummary(summary) {
  console.log('Non-admin role fixture smoke checks');
  for (const session of summary.sessions) {
    const marker = session.authenticated ? 'PASS' : 'FAIL';
    console.log(`${marker} ${session.role} ops login - ${session.message}${session.status ? ` (${session.status})` : ''}`);
  }
  for (const item of summary.results) {
    const marker = item.ok ? 'PASS' : 'FAIL';
    console.log(`${marker} ${item.role} ${item.path} ${item.status} - ${item.message}`);
  }
  for (const item of summary.skipped) {
    console.log(`SKIP ${item}`);
  }
  if (summary.failures.length) {
    console.log('Non-admin role fixture smoke failures');
    for (const failure of summary.failures) console.log(` - ${failure}`);
  }
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const run = args.contractsOnly
    ? Promise.resolve({
        ok: true,
        roles: [],
        sessions: [],
        results: [],
        failures: [],
        skipped: [],
      })
    : runNonAdminRoleFixtureSmoke(args);

  run
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
  checkRoleProbe,
  credentialsFromEnv,
  generateMarkdown,
  nonAdminRoleFixtures,
  nonAdminRoleProbeContracts,
  parseArgs,
  runNonAdminRoleFixtureSmoke,
  validateContracts,
  writeDocs,
};
