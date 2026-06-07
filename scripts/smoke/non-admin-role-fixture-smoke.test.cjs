const assert = require('node:assert/strict');
const test = require('node:test');

function response(body, init = {}) {
  const headers = new Headers(init.headers || {});
  return new Response(body, {
    status: init.status || 200,
    headers,
  });
}

function responseWithUrl(body, init = {}) {
  const res = response(body, init);
  Object.defineProperty(res, 'url', {
    value: init.url || 'https://ops.ridendine.ca/',
  });
  return res;
}

test('declares read-only allow and deny probes for non-admin platform roles', () => {
  const {
    nonAdminRoleFixtures,
    nonAdminRoleProbeContracts,
  } = require('./non-admin-role-fixture-smoke.cjs');

  assert.deepEqual(
    nonAdminRoleFixtures.map((fixture) => fixture.role).sort(),
    ['finance_manager', 'ops_agent', 'support_agent']
  );
  assert.ok(nonAdminRoleProbeContracts.length >= 12);
  assert.equal(nonAdminRoleProbeContracts.every((contract) => contract.method === 'GET'), true);
  assert.equal(nonAdminRoleProbeContracts.every((contract) => contract.liveSafe === true), true);
  assert.equal(nonAdminRoleProbeContracts.some((contract) => contract.expectedStatus === 403), true);
  assert.equal(nonAdminRoleProbeContracts.some((contract) => contract.expectedStatus === 200), true);
});

test('requires at least one configured non-admin role credential', async () => {
  const { runNonAdminRoleFixtureSmoke } = require('./non-admin-role-fixture-smoke.cjs');
  const summary = await runNonAdminRoleFixtureSmoke({
    roleCredentials: {},
    fetchImpl: async () => {
      throw new Error('fetch should not run without role credentials');
    },
  });

  assert.equal(summary.ok, false);
  assert.ok(summary.failures.some((failure) => /non-admin role credentials are required/.test(failure)));
});

test('checks allowed and denied probes with each role session cookie', async () => {
  const { runNonAdminRoleFixtureSmoke } = require('./non-admin-role-fixture-smoke.cjs');
  const calls = [];

  const summary = await runNonAdminRoleFixtureSmoke({
    roleCredentials: {
      support_agent: { email: 'support@example.test', password: 'password123' },
      finance_manager: { email: 'finance@example.test', password: 'password123' },
    },
    contracts: [
      {
        role: 'support_agent',
        path: '/api/support',
        method: 'GET',
        expectedStatus: 200,
        expectation: 'allow',
        capability: 'support_queue',
        liveSafe: true,
      },
      {
        role: 'support_agent',
        path: '/api/engine/finance',
        method: 'GET',
        expectedStatus: 403,
        expectation: 'deny',
        capability: 'finance_engine',
        liveSafe: true,
      },
      {
        role: 'finance_manager',
        path: '/api/engine/finance',
        method: 'GET',
        expectedStatus: 200,
        expectation: 'allow',
        capability: 'finance_engine',
        liveSafe: true,
      },
      {
        role: 'finance_manager',
        path: '/api/orders',
        method: 'GET',
        expectedStatus: 403,
        expectation: 'deny',
        capability: 'ops_orders_read',
        liveSafe: true,
      },
    ],
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });
      if (String(url).endsWith('/api/auth/login')) {
        const body = JSON.parse(options.body || '{}');
        const cookieName = body.email.startsWith('support') ? 'support-session' : 'finance-session';
        return responseWithUrl('{"success":true}', {
          headers: {
            'content-type': 'application/json',
            'set-cookie': `${cookieName}=fake; Path=/; HttpOnly`,
          },
          url: String(url),
        });
      }

      const isSupport = options.headers.Cookie === 'support-session=fake';
      const isFinance = options.headers.Cookie === 'finance-session=fake';
      if (String(url).endsWith('/api/support') && isSupport) {
        return responseWithUrl('{"success":true}', { headers: { 'content-type': 'application/json' }, url: String(url) });
      }
      if (String(url).endsWith('/api/engine/finance') && isFinance) {
        return responseWithUrl('{"success":true}', { headers: { 'content-type': 'application/json' }, url: String(url) });
      }
      return responseWithUrl('{"error":"forbidden"}', {
        status: 403,
        headers: { 'content-type': 'application/json' },
        url: String(url),
      });
    },
  });

  assert.equal(summary.ok, true);
  assert.equal(summary.sessions.length, 2);
  assert.equal(summary.results.length, 4);
  assert.equal(calls.filter((call) => String(call.url).endsWith('/api/auth/login')).length, 2);
  assert.ok(calls.some((call) => call.options.headers.Cookie === 'support-session=fake'));
  assert.ok(calls.some((call) => call.options.headers.Cookie === 'finance-session=fake'));
});

test('writes generated docs only when explicitly requested', () => {
  const { parseArgs } = require('./non-admin-role-fixture-smoke.cjs');
  assert.equal(parseArgs(['--require-auth']).writeDocs, false);
  assert.equal(parseArgs(['--require-auth', '--write-docs']).writeDocs, true);
});
