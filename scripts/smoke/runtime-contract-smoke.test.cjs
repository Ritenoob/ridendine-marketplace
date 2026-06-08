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

test('public page contract requires HTML status 200', async () => {
  const { checkPageContract } = require('./runtime-contract-smoke.cjs');
  const contract = { app: 'customer', path: '/chefs', authIntent: 'public', expect: 'html' };
  const result = await checkPageContract(contract, {
    baseUrl: 'https://ridendine.ca',
    fetchImpl: async () =>
      responseWithUrl('<!DOCTYPE html><html><body>Browse chefs</body></html>', {
        headers: { 'content-type': 'text/html; charset=utf-8' },
        url: 'https://ridendine.ca/chefs',
      }),
  });

  assert.equal(result.ok, true);
});

test('protected page contract accepts login redirect or login surface', async () => {
  const { checkPageContract } = require('./runtime-contract-smoke.cjs');
  const contract = { app: 'ops', path: '/dashboard/reports', authIntent: 'protected', expect: 'login-guard' };
  const result = await checkPageContract(contract, {
    baseUrl: 'https://ops.ridendine.ca',
    fetchImpl: async () =>
      responseWithUrl('<!DOCTYPE html><html><body>Sign in password</body></html>', {
        headers: { 'content-type': 'text/html; charset=utf-8' },
        url: 'https://ops.ridendine.ca/auth/login?redirect=%2Fdashboard%2Freports',
      }),
  });

  assert.equal(result.ok, true);
});

test('protected page contract accepts Next auth-login redirect payload', async () => {
  const { checkPageContract } = require('./runtime-contract-smoke.cjs');
  const contract = { app: 'customer', path: '/orders/sample/confirmation', authIntent: 'protected', expect: 'login-guard' };
  const result = await checkPageContract(contract, {
    baseUrl: 'https://ridendine.ca',
    fetchImpl: async () =>
      responseWithUrl(
        '<!DOCTYPE html><meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/auth/login"><template data-dgst="NEXT_REDIRECT;replace;/auth/login;307;"></template>',
        {
          headers: { 'content-type': 'text/html; charset=utf-8' },
          url: 'https://ridendine.ca/orders/sample/confirmation',
        }
      ),
  });

  assert.equal(result.ok, true);
});

test('legacy redirect page contract accepts Next redirect payload', async () => {
  const { checkPageContract } = require('./runtime-contract-smoke.cjs');
  const contract = {
    app: 'customer',
    path: '/order-confirmation/phase-9-smoke-order',
    authIntent: 'public',
    expect: 'redirect',
    redirectedTo: '/orders/phase-9-smoke-order/confirmation',
  };
  const result = await checkPageContract(contract, {
    baseUrl: 'https://ridendine.ca',
    fetchImpl: async () =>
      responseWithUrl(
        '<!DOCTYPE html><template data-dgst="NEXT_REDIRECT;replace;/orders/phase-9-smoke-order/confirmation;307;"></template>',
        {
          headers: { 'content-type': 'text/html; charset=utf-8' },
          url: 'https://ridendine.ca/order-confirmation/phase-9-smoke-order',
        }
      ),
  });

  assert.equal(result.ok, true);
});

test('legacy redirect page contract rejects plain public HTML', async () => {
  const { checkPageContract } = require('./runtime-contract-smoke.cjs');
  const contract = {
    app: 'customer',
    path: '/order-confirmation/phase-9-smoke-order',
    authIntent: 'public',
    expect: 'redirect',
    redirectedTo: '/orders/phase-9-smoke-order/confirmation',
  };
  const result = await checkPageContract(contract, {
    baseUrl: 'https://ridendine.ca',
    fetchImpl: async () =>
      responseWithUrl('<!DOCTYPE html><html><body>Plain public page</body></html>', {
        headers: { 'content-type': 'text/html; charset=utf-8' },
        url: 'https://ridendine.ca/order-confirmation/phase-9-smoke-order',
      }),
  });

  assert.equal(result.ok, false);
});

test('public JSON API contract requires JSON and allowed status', async () => {
  const { checkPublicJsonApi } = require('./runtime-contract-smoke.cjs');
  const contract = { app: 'customer', path: '/api/eta', authIntent: 'public', expect: 'json', allowedStatuses: [200, 400] };
  const result = await checkPublicJsonApi(contract, {
    baseUrl: 'https://ridendine.ca',
    fetchImpl: async () =>
      responseWithUrl('{"error":"missing params"}', {
        status: 400,
        headers: { 'content-type': 'application/json' },
        url: 'https://ridendine.ca/api/eta',
      }),
  });

  assert.equal(result.ok, true);
});

test('protected JSON API contract fails if unauthenticated request returns 200', async () => {
  const { checkProtectedJsonApi } = require('./runtime-contract-smoke.cjs');
  const contract = { app: 'driver', path: '/api/offers', authIntent: 'protected', expect: 'json' };
  const result = await checkProtectedJsonApi(contract, {
    baseUrl: 'https://driver.ridendine.ca',
    fetchImpl: async () =>
      responseWithUrl('{"offers":[]}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
        url: 'https://driver.ridendine.ca/api/offers',
      }),
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /returned 200 without auth/);
});

test('runtime smoke honors require-auth for authenticated contracts', async () => {
  const { runRuntimeContractSmoke } = require('./runtime-contract-smoke.cjs');
  const result = await runRuntimeContractSmoke({
    requireAuth: true,
    credentials: { email: '', password: '' },
    contracts: {
      authIntentPages: [],
      publicJsonApis: [],
      protectedJsonApis: [{ app: 'customer', path: '/api/profile', authIntent: 'protected', expect: 'json', authenticated: true }],
    },
    fetchImpl: async () => {
      throw new Error('fetch should not run when required credentials are absent');
    },
  });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes('credentials are required')));
});

test('chef admin participates in app-owned authenticated runtime contracts', () => {
  const { apps, protectedJsonApis } = require('./runtime-contracts.cjs');
  assert.equal(apps.chef.appOwnedLogin, true);
  assert.equal(apps.chef.loginPath, '/api/auth/login');

  const authenticatedChefApis = protectedJsonApis
    .filter((contract) => contract.app === 'chef' && contract.authenticated)
    .map((contract) => contract.path)
    .sort();

  assert.deepEqual(authenticatedChefApis, [
    '/api/orders',
    '/api/profile',
    '/api/storefront',
  ]);
});

test('driver app participates in app-owned authenticated runtime contracts for operations readiness', () => {
  const { apps, protectedJsonApis } = require('./runtime-contracts.cjs');
  assert.equal(apps.driver.appOwnedLogin, true);
  assert.equal(apps.driver.loginPath, '/api/auth/login');

  const authenticatedDriverApis = protectedJsonApis
    .filter((contract) => contract.app === 'driver' && contract.authenticated)
    .map((contract) => contract.path)
    .sort();

  assert.deepEqual(authenticatedDriverApis, [
    '/api/deliveries',
    '/api/driver',
    '/api/driver/notification-preferences',
    '/api/driver/readiness',
    '/api/driver/shift',
    '/api/earnings',
    '/api/offers',
  ]);
});
