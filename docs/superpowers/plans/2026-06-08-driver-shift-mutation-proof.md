# Driver Shift Mutation Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a guarded production-safe Driver shift mutation smoke proof that can start and end a disposable fixture driver's shift without touching normal production drivers.

**Architecture:** Keep the default production smoke read-only. Add a standalone Node smoke script that logs into the Driver app, verifies a dedicated fixture identity, checks active delivery safety, then performs start, idempotent start, end, and final read verification only when explicit fixture env flags are set.

**Tech Stack:** Node 20 `node:test`, built-in `fetch`, existing Driver app JSON contracts, Vercel/GitHub deployment gates, existing Ridendine smoke script conventions.

---

## Files

- Create: `scripts/smoke/driver-shift-mutation-smoke.cjs`
- Create: `scripts/smoke/driver-shift-mutation-smoke.test.cjs`
- Modify: `package.json`
- Modify: `docs/superpowers/plans/2026-06-07-driver-operations-expansion-results.md`
- Modify: `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\15 - Phased Improvement Execution Plan.md`

## Task 1: Add Red Tests For Fixture Safety

- [ ] **Step 1: Create the failing test file**

Create `scripts/smoke/driver-shift-mutation-smoke.test.cjs` with tests that import:

```js
const {
  normalizeOptions,
  runDriverShiftMutationSmoke,
} = require('./driver-shift-mutation-smoke.cjs');
```

Add these tests first:

```js
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
```

- [ ] **Step 2: Run tests and confirm RED**

Run:

```powershell
. C:\RIDENDINE\ridendine-marketplace\scripts\tools\ensure-node-pnpm.ps1
$tools = Use-RidendineNodePnpm -RepoRoot C:\RIDENDINE\ridendine-marketplace -Quiet
node --test scripts/smoke/driver-shift-mutation-smoke.test.cjs
```

Expected before implementation: module import fails because `driver-shift-mutation-smoke.cjs` does not exist.

## Task 2: Implement Fixture Config And Login Helpers

- [ ] **Step 1: Create the smoke module**

Create `scripts/smoke/driver-shift-mutation-smoke.cjs` with:

```js
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
  const safeFixtureConfirmed = env.RIDENDINE_SHIFT_MUTATION_FIXTURE_OK === 'disposable-driver';

  return {
    env,
    fetchImpl: options.fetchImpl || fetch,
    timeoutMs: Number(env.RIDENDINE_SHIFT_MUTATION_TIMEOUT_MS || options.timeoutMs || 45_000),
    baseUrl,
    email,
    password,
    driverId,
    enabled: env.RIDENDINE_SHIFT_MUTATION_SMOKE === '1',
    safeFixtureConfirmed,
    cleanupOpenShift: env.RIDENDINE_SHIFT_MUTATION_CLEANUP_OPEN_SHIFT === '1',
    allowRestartAfterCleanup: env.RIDENDINE_SHIFT_MUTATION_ALLOW_RESTART_AFTER_CLEANUP === '1',
    json: Boolean(options.json),
    safeSummary: {
      baseUrl,
      email,
      driverId,
      enabled: env.RIDENDINE_SHIFT_MUTATION_SMOKE === '1',
      safeFixtureConfirmed,
      cleanupOpenShift: env.RIDENDINE_SHIFT_MUTATION_CLEANUP_OPEN_SHIFT === '1',
      allowRestartAfterCleanup: env.RIDENDINE_SHIFT_MUTATION_ALLOW_RESTART_AFTER_CLEANUP === '1',
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
```

- [ ] **Step 2: Implement request helpers and config-only run path**

Add:

```js
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

async function runDriverShiftMutationSmoke(rawOptions = {}) {
  const options = normalizeOptions(rawOptions);
  const configFailures = validateFixtureConfig(options);
  const events = [];
  const failures = [];

  if (configFailures.length > 0) {
    return {
      ok: false,
      code: 'MISSING_FIXTURE_CONFIG',
      events,
      failures: configFailures,
      safeSummary: options.safeSummary,
    };
  }

  return {
    ok: true,
    code: 'NOT_IMPLEMENTED',
    events,
    failures,
    safeSummary: options.safeSummary,
  };
}

module.exports = {
  normalizeOptions,
  runDriverShiftMutationSmoke,
};
```

- [ ] **Step 3: Run tests and confirm partial GREEN**

Run:

```powershell
node --test scripts/smoke/driver-shift-mutation-smoke.test.cjs
```

Expected: the two fixture config tests pass.

## Task 3: Add Red Tests For The Mutation Flow

- [ ] **Step 1: Add mocked fetch helpers to the test file**

Add helper functions:

```js
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
```

- [ ] **Step 2: Add off-shift happy path test**

Add:

```js
test('starts an off-shift fixture, proves idempotent start, ends it, and verifies final off-shift state', async () => {
  const calls = [];
  const responses = [
    jsonResponse(200, { success: true }, { 'set-cookie': 'driver_session=abc; Path=/; HttpOnly' }),
    jsonResponse(200, { success: true, data: { driver: { id: 'driver-fixture-1', status: 'approved' } } }),
    jsonResponse(200, { success: true, data: { driverId: 'driver-fixture-1', isOnShift: false, activeDeliveryCount: 0, currentShiftId: null, presenceStatus: 'offline' } }),
    jsonResponse(200, { success: true, data: { driverId: 'driver-fixture-1', isOnShift: true, activeDeliveryCount: 0, currentShiftId: 'shift-1', presenceStatus: 'online' } }),
    jsonResponse(200, { success: true, data: { driverId: 'driver-fixture-1', isOnShift: true, activeDeliveryCount: 0, currentShiftId: 'shift-1', presenceStatus: 'online' } }),
    jsonResponse(200, { success: true, data: { driverId: 'driver-fixture-1', isOnShift: false, activeDeliveryCount: 0, currentShiftId: null, presenceStatus: 'offline' } }),
    jsonResponse(200, { success: true, data: { driverId: 'driver-fixture-1', isOnShift: false, activeDeliveryCount: 0, currentShiftId: null, presenceStatus: 'offline' } }),
  ];

  const summary = await runDriverShiftMutationSmoke({
    env: baseEnv(),
    fetchImpl: async (url, init) => {
      calls.push({ url, method: init.method });
      return responses.shift();
    },
  });

  assert.equal(summary.ok, true);
  assert.equal(summary.code, 'SHIFT_MUTATION_PROOF_PASSED');
  assert.deepEqual(calls.map((call) => call.method), ['POST', 'GET', 'GET', 'POST', 'POST', 'DELETE', 'GET']);
  assert.ok(summary.events.includes('shift-started'));
  assert.ok(summary.events.includes('idempotent-start-confirmed'));
  assert.ok(summary.events.includes('shift-ended'));
  assert.ok(summary.events.includes('final-off-shift-confirmed'));
});
```

- [ ] **Step 3: Add unsafe-state tests**

Add tests for:

```js
test('refuses to mutate when the authenticated driver id differs from the fixture id', async () => {
  // login succeeds, /api/driver returns another driver id, no shift POST/DELETE should occur
});

test('refuses to mutate when the fixture has active deliveries', async () => {
  // login succeeds, /api/driver matches, GET /api/driver/shift returns activeDeliveryCount: 1
});

test('refuses a dirty open shift unless cleanup is explicitly enabled', async () => {
  // login succeeds, /api/driver matches, GET /api/driver/shift returns isOnShift: true
});

test('cleans up an existing open fixture shift when cleanup is explicitly enabled', async () => {
  // env includes RIDENDINE_SHIFT_MUTATION_CLEANUP_OPEN_SHIFT=1,
  // script calls DELETE and confirms final off-shift state.
});
```

Use complete mocked responses in the implementation. Each test must assert no unexpected mutation method is called.

- [ ] **Step 4: Run tests and confirm RED**

Run:

```powershell
node --test scripts/smoke/driver-shift-mutation-smoke.test.cjs
```

Expected: mutation-flow tests fail because the script still returns `NOT_IMPLEMENTED`.

## Task 4: Implement Mutation Flow

- [ ] **Step 1: Add assertion helpers**

In `driver-shift-mutation-smoke.cjs`, add:

```js
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
```

- [ ] **Step 2: Implement login and preflight**

Replace the `NOT_IMPLEMENTED` return in `runDriverShiftMutationSmoke()` with:

```js
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
    return {
      ok: false,
      code: 'FIXTURE_DRIVER_MISMATCH',
      events,
      failures: ['Authenticated driver did not match RIDENDINE_SHIFT_MUTATION_DRIVER_ID'],
      safeSummary: options.safeSummary,
    };
  }
  if (driver.status !== 'approved') {
    return {
      ok: false,
      code: 'FIXTURE_DRIVER_NOT_APPROVED',
      events,
      failures: [`Fixture driver status is ${driver.status || 'unknown'}, expected approved`],
      safeSummary: options.safeSummary,
    };
  }
  events.push('fixture-driver-verified');

  const initialResponse = await apiRequest(options, cookieHeader, 'GET', '/api/driver/shift');
  const initialShift = assertJsonSuccess(initialResponse, 'initial shift summary');
  assertShiftBelongsToFixture(initialShift, options.driverId, 'initial shift summary');
  if (Number(initialShift.activeDeliveryCount || 0) > 0) {
    return {
      ok: false,
      code: 'ACTIVE_DELIVERY_BLOCK',
      events,
      failures: ['Fixture driver has active deliveries; refusing shift mutation'],
      safeSummary: options.safeSummary,
    };
  }
  events.push('fixture-idle-verified');

  // Continue with Task 4 Step 3.
} catch (error) {
  return {
    ok: false,
    code: 'SHIFT_MUTATION_PROOF_FAILED',
    events,
    failures: [error instanceof Error ? error.message : String(error)],
    safeSummary: options.safeSummary,
  };
}
```

- [ ] **Step 3: Implement dirty-shift cleanup branch**

Inside the try block after `fixture-idle-verified`, add:

```js
if (initialShift.isOnShift) {
  if (!options.cleanupOpenShift) {
    return {
      ok: false,
      code: 'FIXTURE_ALREADY_ON_SHIFT',
      events,
      failures: ['Fixture driver already has an open shift; set RIDENDINE_SHIFT_MUTATION_CLEANUP_OPEN_SHIFT=1 to clean it up'],
      safeSummary: options.safeSummary,
    };
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
    return {
      ok: true,
      code: 'DIRTY_SHIFT_CLEANED',
      events,
      failures,
      safeSummary: options.safeSummary,
    };
  }
}
```

- [ ] **Step 4: Implement start/idempotent/end proof**

Continue with:

```js
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

return {
  ok: true,
  code: 'SHIFT_MUTATION_PROOF_PASSED',
  events,
  failures,
  safeSummary: options.safeSummary,
};
```

- [ ] **Step 5: Add CLI runner**

Add:

```js
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
```

- [ ] **Step 6: Run tests and confirm GREEN**

Run:

```powershell
node --test scripts/smoke/driver-shift-mutation-smoke.test.cjs
```

Expected: all new tests pass.

## Task 5: Wire Package Scripts And Local Gates

- [ ] **Step 1: Add package script**

Modify `package.json`:

```json
"smoke:driver-shift-mutation": "node scripts/smoke/driver-shift-mutation-smoke.cjs"
```

Place it near the existing `smoke:*` scripts.

- [ ] **Step 2: Add unit test to wiring gate**

Modify `package.json` `test:wiring-fixes` so the Node test command includes:

```text
scripts/smoke/driver-shift-mutation-smoke.test.cjs
```

- [ ] **Step 3: Run focused and wiring tests**

Run:

```powershell
node --test scripts/smoke/driver-shift-mutation-smoke.test.cjs
pnpm test:wiring-fixes
```

Expected: new focused test passes, then wiring-fixes passes with the new test included.

## Task 6: Update Docs And Obsidian

- [ ] **Step 1: Update driver results doc**

Modify `docs/superpowers/plans/2026-06-07-driver-operations-expansion-results.md`:

- Add Phase 11 to the completed phases table.
- Add `## Phase 11 Scope`.
- Add local verification rows for the new smoke test and wiring gate.
- Add a known risk/constraint stating live mutation proof requires dedicated fixture env vars and must not use the general seeded Sean super-admin account.

- [ ] **Step 2: Update Obsidian**

Append a `Driver Operations Expansion Phase 11 - 2026-06-08` section to:

```text
C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\15 - Phased Improvement Execution Plan.md
```

Record:

- Scope.
- Required env vars.
- Local verification.
- Whether live mutation proof passed or was blocked by missing fixture credentials.

## Task 7: Full Verification, Commit, Push, And Remote Proof

- [ ] **Step 1: Run full local gates**

Run:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:wiring-fixes
pnpm audit:guards
git diff --check
```

Expected: all pass.

- [ ] **Step 2: Probe live mutation command safely**

Run:

```powershell
pnpm smoke:driver-shift-mutation -- --json
```

Expected without fixture env vars: exits non-zero with `MISSING_FIXTURE_CONFIG` before any fetch. Record as blocked by missing fixture, not as product failure.

If the dedicated fixture env vars are configured, run with those env vars and expect `SHIFT_MUTATION_PROOF_PASSED`.

- [ ] **Step 3: Commit and push**

Commit implementation and docs:

```powershell
git add package.json scripts/smoke/driver-shift-mutation-smoke.cjs scripts/smoke/driver-shift-mutation-smoke.test.cjs docs/superpowers/plans/2026-06-07-driver-operations-expansion-results.md
git commit -m "test(driver): add shift mutation smoke proof"
git push origin master
```

- [ ] **Step 4: Verify remote gates**

After push:

- GitHub CI run for the pushed commit must pass.
- Vercel production deployments for Web, Chef, Driver, and Ops must be `READY`.
- Run:

```powershell
pnpm smoke:prod:contracts -- --require-auth
pnpm smoke:prod
```

Expected: both pass with `RIDENDINE_SMOKE_EMAIL=sean@ridendine.ca` and `RIDENDINE_SMOKE_PASSWORD=password123`.

- [ ] **Step 5: Update final proof docs**

If final CI/Vercel/smoke proof changes the result doc, make a small follow-up docs commit and repeat final CI/Vercel/prod-smoke verification on the new head.

## Self-Review

- Spec coverage: Covers dedicated fixture gating, default read-only production smoke, start/idempotent/end proof, dirty-open-shift handling, active-delivery refusal, docs, and remote proof.
- Completeness scan: No task depends on undefined paths or future decisions.
- Type consistency: Script exports `normalizeOptions` and `runDriverShiftMutationSmoke`, matching the planned tests. Result codes are explicit and reused across plan steps.
