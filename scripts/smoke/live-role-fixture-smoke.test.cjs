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
    value: init.url || 'https://ridendine.ca/',
  });
  return res;
}

test('requires credentials when auth is required', async () => {
  const { runLiveRoleFixtureSmoke } = require('./live-role-fixture-smoke.cjs');
  const summary = await runLiveRoleFixtureSmoke({
    requireAuth: true,
    credentials: { email: '', password: '' },
    contracts: [],
    fetchImpl: async () => {
      throw new Error('fetch should not run without required credentials');
    },
  });

  assert.equal(summary.ok, false);
  assert.ok(summary.failures.some((failure) => /credentials are required/.test(failure)));
});

test('logs into app-owned apps and sends cookies to read-only probes', async () => {
  const { runLiveRoleFixtureSmoke } = require('./live-role-fixture-smoke.cjs');
  const calls = [];

  const summary = await runLiveRoleFixtureSmoke({
    requireAuth: true,
    credentials: { email: 'sean@example.test', password: 'secret-password' },
    contracts: [
      { app: 'customer', path: '/api/profile', method: 'GET', expect: 'json', appSurface: 'Customer marketplace', liveSafe: true },
      { app: 'chef', path: '/api/storefront', method: 'GET', expect: 'json', appSurface: 'Chef admin', liveSafe: true },
      { app: 'driver', path: '/api/driver', method: 'GET', expect: 'json', appSurface: 'Driver app', liveSafe: true },
      { app: 'ops', path: '/api/engine/finance', method: 'GET', expect: 'json', appSurface: 'Ops admin', liveSafe: true },
    ],
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });
      if (String(url).endsWith('/api/auth/login')) {
        return responseWithUrl('{"success":true}', {
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'sb-session=fake-session; Path=/; HttpOnly',
          },
          url: String(url),
        });
      }
      return responseWithUrl('{"success":true,"data":{}}', {
        headers: { 'content-type': 'application/json' },
        url: String(url),
      });
    },
  });

  assert.equal(summary.ok, true);
  assert.equal(summary.sessions.length, 4);
  assert.equal(summary.results.length, 4);
  assert.ok(calls.filter((call) => String(call.url).endsWith('/api/auth/login')).length === 4);
  assert.ok(
    calls
      .filter((call) => !String(call.url).endsWith('/api/auth/login'))
      .every((call) => call.options.headers.Cookie === 'sb-session=fake-session')
  );
});

test('fails when a super-admin read probe is forbidden', async () => {
  const { runLiveRoleFixtureSmoke } = require('./live-role-fixture-smoke.cjs');
  const summary = await runLiveRoleFixtureSmoke({
    requireAuth: true,
    credentials: { email: 'sean@example.test', password: 'secret-password' },
    contracts: [
      { app: 'ops', path: '/api/team', method: 'GET', expect: 'json', appSurface: 'Ops admin', liveSafe: true },
    ],
    fetchImpl: async (url) => {
      if (String(url).endsWith('/api/auth/login')) {
        return responseWithUrl('{"success":true}', {
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'sb-session=fake-session; Path=/; HttpOnly',
          },
          url: String(url),
        });
      }
      return responseWithUrl('{"error":"forbidden"}', {
        status: 403,
        headers: { 'content-type': 'application/json' },
        url: String(url),
      });
    },
  });

  assert.equal(summary.ok, false);
  assert.ok(summary.failures.some((failure) => failure.includes('/api/team')));
  assert.ok(summary.failures.some((failure) => failure.includes('403')));
});

test('declares only live-safe GET probes', () => {
  const { liveRoleFixtureContracts } = require('./live-role-fixture-smoke.cjs');
  assert.ok(liveRoleFixtureContracts.length >= 15);
  assert.equal(liveRoleFixtureContracts.every((contract) => contract.method === 'GET'), true);
  assert.equal(liveRoleFixtureContracts.every((contract) => contract.liveSafe === true), true);
});

test('includes chef admin read-only probes now that chef uses app-owned auth', () => {
  const { liveRoleFixtureContracts } = require('./live-role-fixture-smoke.cjs');
  const chefPaths = liveRoleFixtureContracts
    .filter((contract) => contract.app === 'chef')
    .map((contract) => contract.path)
    .sort();

  assert.deepEqual(chefPaths, [
    '/api/orders',
    '/api/profile',
    '/api/storefront',
  ]);
});

test('writes generated docs only when explicitly requested', () => {
  const { parseArgs } = require('./live-role-fixture-smoke.cjs');
  assert.equal(parseArgs(['--require-auth']).writeDocs, false);
  assert.equal(parseArgs(['--require-auth', '--write-docs']).writeDocs, true);
});
