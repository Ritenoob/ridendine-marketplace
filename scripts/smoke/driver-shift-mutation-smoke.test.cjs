const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizeOptions,
  runDriverShiftMutationSmoke,
} = require('./driver-shift-mutation-smoke.cjs');

function jsonResponse(status, body, headers = {}) {
  return {
    status,
    url: 'https://driver.ridendine.ca/mock',
    headers: {
      get(name) {
        return headers[name.toLowerCase()] || headers[name] || '';
      },
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

function baseEnv(extra = {}) {
  return {
    RIDENDINE_SHIFT_MUTATION_SMOKE: '1',
    RIDENDINE_SHIFT_MUTATION_EMAIL: 'shift-fixture@ridendine.ca',
    RIDENDINE_SHIFT_MUTATION_PASSWORD: 'password123',
    RIDENDINE_SHIFT_MUTATION_DRIVER_ID: 'driver-fixture-1',
    RIDENDINE_SHIFT_MUTATION_FIXTURE_OK: 'disposable-driver',
    ...extra,
  };
}

function shiftSummary(overrides = {}) {
  return {
    driverId: 'driver-fixture-1',
    isOnShift: false,
    activeDeliveryCount: 0,
    currentShiftId: null,
    presenceStatus: 'offline',
    ...overrides,
  };
}

function makeFetch(responses, calls = []) {
  return async (url, init) => {
    calls.push({ url, method: init.method });
    const response = responses.shift();
    if (!response) throw new Error(`Unexpected request: ${init.method} ${url}`);
    return response;
  };
}

test('requires explicit disposable fixture configuration before mutation', async () => {
  const summary = await runDriverShiftMutationSmoke({
    env: {},
    fetchImpl: async () => {
      throw new Error('fetch should not be called without fixture config');
    },
  });

  assert.equal(summary.ok, false);
  assert.equal(summary.code, 'MISSING_FIXTURE_CONFIG');
  assert.ok(summary.failures.some((failure) => failure.includes('RIDENDINE_SHIFT_MUTATION_SMOKE=1')));
  assert.deepEqual(summary.events, []);
});

test('normalizes fixture config without exposing the password', () => {
  const options = normalizeOptions({
    env: {
      RIDENDINE_SHIFT_MUTATION_SMOKE: '1',
      RIDENDINE_SHIFT_MUTATION_EMAIL: 'shift-fixture@ridendine.ca',
      RIDENDINE_SHIFT_MUTATION_PASSWORD: 'secret-password',
      RIDENDINE_SHIFT_MUTATION_DRIVER_ID: 'driver-fixture-1',
      RIDENDINE_SHIFT_MUTATION_FIXTURE_OK: 'disposable-driver',
    },
  });

  assert.equal(options.baseUrl, 'https://driver.ridendine.ca');
  assert.equal(options.email, 'shift-fixture@ridendine.ca');
  assert.equal(options.password, 'secret-password');
  assert.equal(options.driverId, 'driver-fixture-1');
  assert.equal(options.safeFixtureConfirmed, true);
  assert.equal(JSON.stringify(options.safeSummary).includes('secret-password'), false);
});

test('starts an off-shift fixture, proves idempotent start, ends it, and verifies final off-shift state', async () => {
  const calls = [];
  const responses = [
    jsonResponse(200, { success: true }, { 'set-cookie': 'driver_session=abc; Path=/; HttpOnly' }),
    jsonResponse(200, { success: true, data: { driver: { id: 'driver-fixture-1', status: 'approved' } } }),
    jsonResponse(200, { success: true, data: shiftSummary() }),
    jsonResponse(200, {
      success: true,
      data: shiftSummary({ isOnShift: true, currentShiftId: 'shift-1', presenceStatus: 'online' }),
    }),
    jsonResponse(200, {
      success: true,
      data: shiftSummary({ isOnShift: true, currentShiftId: 'shift-1', presenceStatus: 'online' }),
    }),
    jsonResponse(200, { success: true, data: shiftSummary() }),
    jsonResponse(200, { success: true, data: shiftSummary() }),
  ];

  const summary = await runDriverShiftMutationSmoke({
    env: baseEnv(),
    fetchImpl: makeFetch(responses, calls),
  });

  assert.equal(summary.ok, true);
  assert.equal(summary.code, 'SHIFT_MUTATION_PROOF_PASSED');
  assert.deepEqual(calls.map((call) => call.method), ['POST', 'GET', 'GET', 'POST', 'POST', 'DELETE', 'GET']);
  assert.ok(summary.events.includes('shift-started'));
  assert.ok(summary.events.includes('idempotent-start-confirmed'));
  assert.ok(summary.events.includes('shift-ended'));
  assert.ok(summary.events.includes('final-off-shift-confirmed'));
});

test('refuses to mutate when the authenticated driver id differs from the fixture id', async () => {
  const calls = [];
  const responses = [
    jsonResponse(200, { success: true }, { 'set-cookie': 'driver_session=abc; Path=/; HttpOnly' }),
    jsonResponse(200, { success: true, data: { driver: { id: 'another-driver', status: 'approved' } } }),
  ];

  const summary = await runDriverShiftMutationSmoke({
    env: baseEnv(),
    fetchImpl: makeFetch(responses, calls),
  });

  assert.equal(summary.ok, false);
  assert.equal(summary.code, 'FIXTURE_DRIVER_MISMATCH');
  assert.deepEqual(calls.map((call) => call.method), ['POST', 'GET']);
  assert.equal(calls.some((call) => call.url.endsWith('/api/driver/shift')), false);
});

test('refuses to mutate when the fixture has active deliveries', async () => {
  const calls = [];
  const responses = [
    jsonResponse(200, { success: true }, { 'set-cookie': 'driver_session=abc; Path=/; HttpOnly' }),
    jsonResponse(200, { success: true, data: { driver: { id: 'driver-fixture-1', status: 'approved' } } }),
    jsonResponse(200, { success: true, data: shiftSummary({ activeDeliveryCount: 1 }) }),
  ];

  const summary = await runDriverShiftMutationSmoke({
    env: baseEnv(),
    fetchImpl: makeFetch(responses, calls),
  });

  assert.equal(summary.ok, false);
  assert.equal(summary.code, 'ACTIVE_DELIVERY_BLOCK');
  assert.deepEqual(calls.map((call) => call.method), ['POST', 'GET', 'GET']);
  assert.equal(calls.filter((call) => call.url.endsWith('/api/driver/shift') && call.method !== 'GET').length, 0);
});

test('refuses a dirty open shift unless cleanup is explicitly enabled', async () => {
  const calls = [];
  const responses = [
    jsonResponse(200, { success: true }, { 'set-cookie': 'driver_session=abc; Path=/; HttpOnly' }),
    jsonResponse(200, { success: true, data: { driver: { id: 'driver-fixture-1', status: 'approved' } } }),
    jsonResponse(200, {
      success: true,
      data: shiftSummary({ isOnShift: true, currentShiftId: 'shift-dirty', presenceStatus: 'online' }),
    }),
  ];

  const summary = await runDriverShiftMutationSmoke({
    env: baseEnv(),
    fetchImpl: makeFetch(responses, calls),
  });

  assert.equal(summary.ok, false);
  assert.equal(summary.code, 'FIXTURE_ALREADY_ON_SHIFT');
  assert.deepEqual(calls.map((call) => call.method), ['POST', 'GET', 'GET']);
  assert.equal(calls.some((call) => call.method === 'DELETE'), false);
});

test('cleans up an existing open fixture shift when cleanup is explicitly enabled', async () => {
  const calls = [];
  const responses = [
    jsonResponse(200, { success: true }, { 'set-cookie': 'driver_session=abc; Path=/; HttpOnly' }),
    jsonResponse(200, { success: true, data: { driver: { id: 'driver-fixture-1', status: 'approved' } } }),
    jsonResponse(200, {
      success: true,
      data: shiftSummary({ isOnShift: true, currentShiftId: 'shift-dirty', presenceStatus: 'online' }),
    }),
    jsonResponse(200, { success: true, data: shiftSummary() }),
    jsonResponse(200, { success: true, data: shiftSummary() }),
  ];

  const summary = await runDriverShiftMutationSmoke({
    env: baseEnv({ RIDENDINE_SHIFT_MUTATION_CLEANUP_OPEN_SHIFT: '1' }),
    fetchImpl: makeFetch(responses, calls),
  });

  assert.equal(summary.ok, true);
  assert.equal(summary.code, 'DIRTY_SHIFT_CLEANED');
  assert.deepEqual(calls.map((call) => call.method), ['POST', 'GET', 'GET', 'DELETE', 'GET']);
  assert.ok(summary.events.includes('dirty-shift-cleaned'));
  assert.ok(summary.events.includes('final-off-shift-confirmed'));
});
