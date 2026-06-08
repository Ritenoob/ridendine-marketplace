#!/usr/bin/env node

const USER_AGENT = 'RidenDine-Driver-Shift-Mutation-Smoke/phase-11';

function trimBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

function splitSetCookie(value) {
  if (!value) return [];
  return value.split(/,(?=\s*[^=;]+=[^;]+)/g).map((part) => part.trim()).filter(Boolean);
}

function cookieHeaderFromResponse(response) {
  const headers = response.headers;
  if (!headers) return '';

  const setCookies = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : splitSetCookie(typeof headers.get === 'function' ? headers.get('set-cookie') : '');

  return setCookies
    .map((cookie) => cookie.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function normalizeOptions(options = {}) {
  const env = options.env || process.env;
  const baseUrl = trimBaseUrl(env.RIDENDINE_DRIVER_URL || 'https://driver.ridendine.ca');
  const email = env.RIDENDINE_SHIFT_MUTATION_EMAIL || '';
  const password = env.RIDENDINE_SHIFT_MUTATION_PASSWORD || '';
  const driverId = env.RIDENDINE_SHIFT_MUTATION_DRIVER_ID || '';
  const enabled = env.RIDENDINE_SHIFT_MUTATION_SMOKE === '1';
  const safeFixtureConfirmed = env.RIDENDINE_SHIFT_MUTATION_FIXTURE_OK === 'disposable-driver';
  const cleanupOpenShift = env.RIDENDINE_SHIFT_MUTATION_CLEANUP_OPEN_SHIFT === '1';
  const allowRestartAfterCleanup = env.RIDENDINE_SHIFT_MUTATION_ALLOW_RESTART_AFTER_CLEANUP === '1';

  return {
    env,
    fetchImpl: options.fetchImpl || fetch,
    timeoutMs: Number(env.RIDENDINE_SHIFT_MUTATION_TIMEOUT_MS || options.timeoutMs || 45_000),
    baseUrl,
    email,
    password,
    driverId,
    enabled,
    safeFixtureConfirmed,
    cleanupOpenShift,
    allowRestartAfterCleanup,
    json: Boolean(options.json),
    safeSummary: {
      baseUrl,
      email,
      driverId,
      enabled,
      safeFixtureConfirmed,
      cleanupOpenShift,
      allowRestartAfterCleanup,
    },
  };
}

function validateFixtureConfig(options) {
  const failures = [];
  if (!options.enabled) failures.push('RIDENDINE_SHIFT_MUTATION_SMOKE=1 is required');
  if (!options.email) failures.push('RIDENDINE_SHIFT_MUTATION_EMAIL is required');
  if (!options.password) failures.push('RIDENDINE_SHIFT_MUTATION_PASSWORD is required');
  if (!options.driverId) failures.push('RIDENDINE_SHIFT_MUTATION_DRIVER_ID is required');
  if (!options.safeFixtureConfirmed) {
    failures.push('RIDENDINE_SHIFT_MUTATION_FIXTURE_OK=disposable-driver is required');
  }
  return failures;
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

async function apiRequest(options, cookieHeader, method, path, body) {
  const headers = {
    'User-Agent': USER_AGENT,
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetchWithTimeout(
    options.fetchImpl,
    `${options.baseUrl}${path}`,
    {
      method,
      redirect: 'manual',
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
    options.timeoutMs
  );

  return {
    status: response.status,
    cookieHeader: cookieHeaderFromResponse(response),
    json: await readJson(response),
  };
}

function getPayload(json) {
  return json && typeof json === 'object' && json.data ? json.data : json;
}

function assertJsonSuccess(response, label) {
  if (response.status < 200 || response.status >= 300 || !response.json) {
    throw new Error(`${label} returned ${response.status}`);
  }
  if (Object.prototype.hasOwnProperty.call(response.json, 'success') && !response.json.success) {
    throw new Error(`${label} returned success=false`);
  }
  return getPayload(response.json);
}

function assertShiftBelongsToFixture(summary, driverId, label) {
  if (!summary || summary.driverId !== driverId) {
    throw new Error(`${label} did not return the configured fixture driver`);
  }
}

function result(ok, code, events, failures, safeSummary) {
  return {
    ok,
    code,
    events,
    failures,
    safeSummary,
  };
}

async function runDriverShiftMutationSmoke(rawOptions = {}) {
  const options = normalizeOptions(rawOptions);
  const configFailures = validateFixtureConfig(options);
  const events = [];
  const failures = [];

  if (configFailures.length > 0) {
    return result(false, 'MISSING_FIXTURE_CONFIG', events, configFailures, options.safeSummary);
  }

  try {
    const login = await apiRequest(options, '', 'POST', '/api/auth/login', {
      email: options.email,
      password: options.password,
    });
    const cookieHeader = login.cookieHeader;
    assertJsonSuccess(login, 'driver login');
    if (!cookieHeader) throw new Error('driver login did not return a session cookie');
    events.push('login-ok');

    const driverResponse = await apiRequest(options, cookieHeader, 'GET', '/api/driver');
    const driverPayload = assertJsonSuccess(driverResponse, 'driver profile');
    const driver = driverPayload.driver || driverPayload;
    if (!driver || driver.id !== options.driverId) {
      return result(
        false,
        'FIXTURE_DRIVER_MISMATCH',
        events,
        ['Authenticated driver did not match RIDENDINE_SHIFT_MUTATION_DRIVER_ID'],
        options.safeSummary
      );
    }
    if (driver.status !== 'approved') {
      return result(
        false,
        'FIXTURE_DRIVER_NOT_APPROVED',
        events,
        [`Fixture driver status is ${driver.status || 'unknown'}, expected approved`],
        options.safeSummary
      );
    }
    events.push('fixture-driver-verified');

    const initialResponse = await apiRequest(options, cookieHeader, 'GET', '/api/driver/shift');
    const initialShift = assertJsonSuccess(initialResponse, 'initial shift summary');
    assertShiftBelongsToFixture(initialShift, options.driverId, 'initial shift summary');
    if (Number(initialShift.activeDeliveryCount || 0) > 0) {
      return result(
        false,
        'ACTIVE_DELIVERY_BLOCK',
        events,
        ['Fixture driver has active deliveries; refusing shift mutation'],
        options.safeSummary
      );
    }
    events.push('fixture-idle-verified');

    if (initialShift.isOnShift) {
      if (!options.cleanupOpenShift) {
        return result(
          false,
          'FIXTURE_ALREADY_ON_SHIFT',
          events,
          ['Fixture driver already has an open shift; set RIDENDINE_SHIFT_MUTATION_CLEANUP_OPEN_SHIFT=1 to clean it up'],
          options.safeSummary
        );
      }

      const cleanupResponse = await apiRequest(options, cookieHeader, 'DELETE', '/api/driver/shift');
      const cleanupShift = assertJsonSuccess(cleanupResponse, 'cleanup end shift');
      assertShiftBelongsToFixture(cleanupShift, options.driverId, 'cleanup end shift');
      if (cleanupShift.isOnShift || cleanupShift.currentShiftId) {
        throw new Error('cleanup did not leave fixture off shift');
      }
      events.push('dirty-shift-cleaned');

      const finalCleanupResponse = await apiRequest(options, cookieHeader, 'GET', '/api/driver/shift');
      const finalCleanupShift = assertJsonSuccess(finalCleanupResponse, 'cleanup final shift summary');
      assertShiftBelongsToFixture(finalCleanupShift, options.driverId, 'cleanup final shift summary');
      if (finalCleanupShift.isOnShift || finalCleanupShift.currentShiftId) {
        throw new Error('cleanup final summary still reports an open shift');
      }
      events.push('final-off-shift-confirmed');

      if (!options.allowRestartAfterCleanup) {
        return result(true, 'DIRTY_SHIFT_CLEANED', events, failures, options.safeSummary);
      }
    }

    const startResponse = await apiRequest(options, cookieHeader, 'POST', '/api/driver/shift');
    const startedShift = assertJsonSuccess(startResponse, 'start shift');
    assertShiftBelongsToFixture(startedShift, options.driverId, 'start shift');
    if (!startedShift.isOnShift || startedShift.presenceStatus !== 'online' || !startedShift.currentShiftId) {
      throw new Error('start shift did not return an online open shift');
    }
    events.push('shift-started');

    const idempotentResponse = await apiRequest(options, cookieHeader, 'POST', '/api/driver/shift');
    const idempotentShift = assertJsonSuccess(idempotentResponse, 'idempotent start shift');
    assertShiftBelongsToFixture(idempotentShift, options.driverId, 'idempotent start shift');
    if (idempotentShift.currentShiftId !== startedShift.currentShiftId) {
      throw new Error('idempotent start returned a different currentShiftId');
    }
    events.push('idempotent-start-confirmed');

    const endResponse = await apiRequest(options, cookieHeader, 'DELETE', '/api/driver/shift');
    const endedShift = assertJsonSuccess(endResponse, 'end shift');
    assertShiftBelongsToFixture(endedShift, options.driverId, 'end shift');
    if (endedShift.isOnShift || endedShift.currentShiftId || endedShift.presenceStatus !== 'offline') {
      throw new Error('end shift did not return an offline closed shift');
    }
    events.push('shift-ended');

    const finalResponse = await apiRequest(options, cookieHeader, 'GET', '/api/driver/shift');
    const finalShift = assertJsonSuccess(finalResponse, 'final shift summary');
    assertShiftBelongsToFixture(finalShift, options.driverId, 'final shift summary');
    if (finalShift.isOnShift || finalShift.currentShiftId) {
      throw new Error('final shift summary still reports an open shift');
    }
    events.push('final-off-shift-confirmed');

    return result(true, 'SHIFT_MUTATION_PROOF_PASSED', events, failures, options.safeSummary);
  } catch (error) {
    return result(
      false,
      'SHIFT_MUTATION_PROOF_FAILED',
      events,
      [error instanceof Error ? error.message : String(error)],
      options.safeSummary
    );
  }
}

function parseArgs(argv) {
  return {
    json: argv.includes('--json'),
  };
}

function printSummary(summary) {
  console.log('Driver shift mutation smoke');
  console.log(`Status: ${summary.ok ? 'PASS' : 'FAIL'} ${summary.code}`);
  for (const event of summary.events) console.log(`EVENT ${event}`);
  for (const failure of summary.failures) console.log(`FAIL ${failure}`);
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  runDriverShiftMutationSmoke({ json: args.json })
    .then((summary) => {
      if (args.json) console.log(JSON.stringify(summary, null, 2));
      else printSummary(summary);
      if (!summary.ok) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error && error.stack ? error.stack : String(error));
      process.exitCode = 1;
    });
}

module.exports = {
  normalizeOptions,
  runDriverShiftMutationSmoke,
};
