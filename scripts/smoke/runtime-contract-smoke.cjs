#!/usr/bin/env node

const {
  apps,
  authIntentPages,
  publicJsonApis,
  protectedJsonApis,
} = require('./runtime-contracts.cjs');

const USER_AGENT = 'RidenDine-Runtime-Contract-Smoke/phase-9';

function trimBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

function baseUrlForApp(appKey, env = process.env, appConfig = apps) {
  const app = appConfig[appKey];
  if (!app) throw new Error(`Unknown app key: ${appKey}`);
  return trimBaseUrl(env[app.baseUrlEnv] || app.defaultBaseUrl);
}

function contractUrl(contract, baseUrl) {
  return `${trimBaseUrl(baseUrl)}${contract.path}`;
}

function responseHeader(response, name) {
  if (!response.headers || typeof response.headers.get !== 'function') return '';
  return response.headers.get(name) || '';
}

async function readText(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function isHtml(response, body) {
  const contentType = responseHeader(response, 'content-type');
  const sample = body.trimStart().slice(0, 80).toLowerCase();
  return contentType.includes('text/html') || sample.startsWith('<!doctype html') || sample.startsWith('<html');
}

function isJson(response, body) {
  const contentType = responseHeader(response, 'content-type');
  const sample = body.trimStart();
  return contentType.includes('application/json') || sample.startsWith('{') || sample.startsWith('[');
}

function looksLikeLogin(response, body) {
  const finalUrl = response.url || '';
  if (/\/auth\/login/i.test(finalUrl)) return true;
  if (!isHtml(response, body)) return false;
  return /sign in|log in|password|\/auth\/login|\/api\/auth\/login/i.test(body);
}

function matchesRedirectTarget(response, body, target) {
  if (!target) return false;
  const location = responseHeader(response, 'location');
  if (location.includes(target)) return true;
  if (!body.includes(target)) return false;
  return /NEXT_REDIRECT|http-equiv="refresh"|http-equiv='refresh'|url=/.test(body);
}

function result(ok, contract, status, url, message) {
  return {
    ok,
    kind: contract.kind,
    app: contract.app,
    path: contract.path,
    status,
    url,
    message,
  };
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

async function checkPageContract(contract, options) {
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || 45_000;
  const url = contractUrl(contract, options.baseUrl);
  const response = await fetchWithTimeout(
    fetchImpl,
    url,
    {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT },
    },
    timeoutMs
  );
  const body = await readText(response);

  if (contract.expect === 'redirect') {
    const ok = response.status < 400 && matchesRedirectTarget(response, body, contract.redirectedTo);
    return result(ok, contract, response.status, response.url || url, ok ? 'legacy redirect target detected' : 'legacy redirect target was not detected');
  }

  if (contract.authIntent === 'public') {
    const ok = response.status === 200 && isHtml(response, body);
    return result(ok, contract, response.status, response.url || url, ok ? 'public HTML page loaded' : 'public page did not return 200 HTML');
  }

  if (response.status >= 500) {
    return result(false, contract, response.status, response.url || url, 'protected page returned a server error');
  }

  const guarded = looksLikeLogin(response, body) || response.status === 401 || response.status === 403;
  return result(
    guarded,
    contract,
    response.status,
    response.url || url,
    guarded ? 'protected page resolved to login guard' : 'protected page did not resolve to login guard'
  );
}

async function checkPublicJsonApi(contract, options) {
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || 45_000;
  const url = contractUrl(contract, options.baseUrl);
  const response = await fetchWithTimeout(
    fetchImpl,
    url,
    {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT },
    },
    timeoutMs
  );
  const body = await readText(response);
  const allowedStatuses = contract.allowedStatuses || [200];
  const ok = allowedStatuses.includes(response.status) && isJson(response, body);

  return result(ok, contract, response.status, response.url || url, ok ? 'public JSON API returned expected response' : 'public JSON API response contract failed');
}

async function checkProtectedJsonApi(contract, options) {
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || 45_000;
  const url = contractUrl(contract, options.baseUrl);
  const response = await fetchWithTimeout(
    fetchImpl,
    url,
    {
      method: 'GET',
      redirect: 'manual',
      headers: { 'User-Agent': USER_AGENT },
    },
    timeoutMs
  );
  const body = await readText(response);

  if (response.status === 200) {
    return result(false, contract, response.status, response.url || url, 'protected JSON API returned 200 without auth');
  }
  if (response.status >= 500) {
    return result(false, contract, response.status, response.url || url, 'protected JSON API returned a server error without auth');
  }

  const expectedRejection = looksLikeLogin(response, body) || response.status >= 300 || response.status === 401 || response.status === 403 || response.status === 404;
  return result(
    expectedRejection,
    contract,
    response.status,
    response.url || url,
    expectedRejection ? 'protected JSON API rejected unauthenticated access' : 'protected JSON API rejection was not detectable'
  );
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

async function createAppSession(appKey, options) {
  const app = options.appConfig[appKey];
  if (!app || !app.appOwnedLogin || !app.loginPath) {
    return { app: appKey, authenticated: false, cookieHeader: '', skipped: true, message: 'app has no app-owned login route' };
  }

  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || 45_000;
  const baseUrl = baseUrlForApp(appKey, options.env, options.appConfig);
  const loginUrl = `${baseUrl}${app.loginPath}`;
  const response = await fetchWithTimeout(
    fetchImpl,
    loginUrl,
    {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify({
        email: options.credentials.email,
        password: options.credentials.password,
      }),
    },
    timeoutMs
  );
  const body = await readText(response);
  const cookieHeader = cookieHeaderFromResponse(response);
  let loginSucceeded = response.status >= 200 && response.status < 300 && cookieHeader.length > 0;

  try {
    const json = JSON.parse(body);
    if (Object.prototype.hasOwnProperty.call(json, 'success')) {
      loginSucceeded = loginSucceeded && Boolean(json.success);
    }
  } catch {
    loginSucceeded = false;
  }

  return {
    app: appKey,
    authenticated: loginSucceeded,
    cookieHeader,
    status: response.status,
    message: loginSucceeded ? 'login succeeded' : 'login failed',
  };
}

async function checkAuthenticatedJsonApi(contract, options) {
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || 45_000;
  const url = contractUrl(contract, options.baseUrl);
  const response = await fetchWithTimeout(
    fetchImpl,
    url,
    {
      method: 'GET',
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

  return result(ok, contract, response.status, response.url || url, ok ? 'authenticated JSON API returned 200 JSON' : 'authenticated JSON API did not return 200 JSON');
}

function normalizeOptions(options = {}) {
  return {
    env: options.env || process.env,
    appConfig: options.appConfig || apps,
    contracts: options.contracts || { authIntentPages, publicJsonApis, protectedJsonApis },
    fetchImpl: options.fetchImpl || fetch,
    timeoutMs: options.timeoutMs || 45_000,
    requireAuth: Boolean(options.requireAuth),
    skipAuth: Boolean(options.skipAuth),
    credentials: options.credentials || {
      email: process.env.RIDENDINE_SMOKE_EMAIL || '',
      password: process.env.RIDENDINE_SMOKE_PASSWORD || '',
    },
  };
}

async function runRuntimeContractSmoke(options = {}) {
  const normalized = normalizeOptions(options);
  const results = [];
  const failures = [];
  const skipped = [];
  const contracts = normalized.contracts;
  const authenticatedContracts = (contracts.protectedJsonApis || []).filter((contract) => contract.authenticated);
  const hasCredentials = Boolean(normalized.credentials.email && normalized.credentials.password);

  if (normalized.requireAuth && authenticatedContracts.length && !hasCredentials) {
    return {
      ok: false,
      results,
      failures: ['authenticated runtime contract credentials are required'],
      skipped,
    };
  }

  for (const contract of contracts.authIntentPages || []) {
    const check = await checkPageContract(contract, {
      baseUrl: baseUrlForApp(contract.app, normalized.env, normalized.appConfig),
      fetchImpl: normalized.fetchImpl,
      timeoutMs: normalized.timeoutMs,
    });
    results.push(check);
    if (!check.ok) failures.push(`${check.app} ${check.path}: ${check.message} (${check.status})`);
  }

  for (const contract of contracts.publicJsonApis || []) {
    const check = await checkPublicJsonApi(contract, {
      baseUrl: baseUrlForApp(contract.app, normalized.env, normalized.appConfig),
      fetchImpl: normalized.fetchImpl,
      timeoutMs: normalized.timeoutMs,
    });
    results.push(check);
    if (!check.ok) failures.push(`${check.app} ${check.path}: ${check.message} (${check.status})`);
  }

  for (const contract of contracts.protectedJsonApis || []) {
    const check = await checkProtectedJsonApi(contract, {
      baseUrl: baseUrlForApp(contract.app, normalized.env, normalized.appConfig),
      fetchImpl: normalized.fetchImpl,
      timeoutMs: normalized.timeoutMs,
    });
    results.push(check);
    if (!check.ok) failures.push(`${check.app} ${check.path}: ${check.message} (${check.status})`);
  }

  if (normalized.skipAuth) {
    skipped.push('authenticated JSON checks skipped by --skip-auth');
  } else if (!hasCredentials) {
    const message = 'authenticated runtime contract credentials are required';
    if (normalized.requireAuth && authenticatedContracts.length) failures.push(message);
    else skipped.push(message);
  } else {
    const sessions = new Map();
    for (const appKey of [...new Set(authenticatedContracts.map((contract) => contract.app))]) {
      const session = await createAppSession(appKey, normalized);
      sessions.set(appKey, session);
      if (!session.authenticated) {
        failures.push(`${appKey} login: ${session.message} (${session.status || 'skipped'})`);
      }
    }

    for (const contract of authenticatedContracts) {
      const session = sessions.get(contract.app);
      if (!session || !session.authenticated) continue;

      const check = await checkAuthenticatedJsonApi(contract, {
        baseUrl: baseUrlForApp(contract.app, normalized.env, normalized.appConfig),
        fetchImpl: normalized.fetchImpl,
        timeoutMs: normalized.timeoutMs,
        cookieHeader: session.cookieHeader,
      });
      results.push({ ...check, authenticated: true });
      if (!check.ok) failures.push(`${check.app} ${check.path}: ${check.message} (${check.status})`);
    }
  }

  return {
    ok: failures.length === 0,
    results,
    failures,
    skipped,
  };
}

function parseArgs(argv) {
  const parsed = {
    requireAuth: false,
    skipAuth: false,
    json: false,
    timeoutMs: 45_000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--require-auth') parsed.requireAuth = true;
    else if (arg === '--skip-auth') parsed.skipAuth = true;
    else if (arg === '--json') parsed.json = true;
    else if (arg === '--timeout-ms') {
      parsed.timeoutMs = Number(argv[i + 1]);
      i += 1;
    }
  }

  return parsed;
}

function printTextSummary(summary) {
  console.log('Runtime contract smoke checks');
  for (const item of summary.results) {
    const marker = item.ok ? 'PASS' : 'FAIL';
    const auth = item.authenticated ? ' authenticated' : '';
    console.log(`${marker} ${item.app}${auth} ${item.path} ${item.status} - ${item.message}`);
  }

  for (const item of summary.skipped) {
    console.log(`SKIP ${item}`);
  }

  if (summary.failures.length) {
    console.log('Runtime contract smoke failures');
    for (const failure of summary.failures) console.log(` - ${failure}`);
  }
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  runRuntimeContractSmoke(args)
    .then((summary) => {
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
  baseUrlForApp,
  checkAuthenticatedJsonApi,
  checkPageContract,
  checkProtectedJsonApi,
  checkPublicJsonApi,
  createAppSession,
  runRuntimeContractSmoke,
};
