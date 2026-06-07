#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { apps } = require('./runtime-contracts.cjs');
const {
  baseUrlForApp,
  createAppSession,
} = require('./runtime-contract-smoke.cjs');

const USER_AGENT = 'RidenDine-Ops-Export-Audit-Smoke/thread-2';
const DEFAULT_TYPE = 'orders';
const DEFAULT_AUDIT_LIMIT = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

function trimBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

function buildExportUrl(baseUrl, options = {}) {
  const url = new URL('/api/export', `${trimBaseUrl(baseUrl)}/`);
  url.searchParams.set('type', options.type || DEFAULT_TYPE);
  if (options.start) url.searchParams.set('start', options.start);
  if (options.end) url.searchParams.set('end', options.end);
  return url.toString();
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

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function isCsvResponse(responseLike) {
  const contentType = String(responseLike.contentType || '').toLowerCase();
  const body = String(responseLike.body || '');
  const header = body.split(/\r?\n/, 1)[0] || '';
  return contentType.includes('text/csv') && header.trim().length > 0 && header.includes(',');
}

function findExportAuditEntry(items, options = {}) {
  const excludeIds = options.excludeIds || new Set();
  const afterMs = options.afterCreatedAt ? Date.parse(options.afterCreatedAt) : null;

  return (items || []).find((item) => {
    const id = String(item.id || '');
    const action = String(item.action || '').toLowerCase();
    const entityType = String(item.entity_type || item.entityType || '').toLowerCase();
    const createdAt = item.created_at || item.createdAt || '';
    if (id && excludeIds.has(id)) return false;
    if (action !== 'export' || entityType !== 'export') return false;
    if (afterMs !== null) {
      const createdMs = Date.parse(createdAt);
      if (!Number.isFinite(createdMs) || createdMs < afterMs) return false;
    }
    return true;
  }) || null;
}

function firstEnv(env, names) {
  for (const name of names) {
    if (env[name]) return env[name];
  }
  return '';
}

function credentialsFromEnv(env = process.env) {
  return {
    email: firstEnv(env, ['RIDENDINE_SMOKE_EMAIL', 'RIDENDINE_OPS_ADMIN_EMAIL', 'RIDENDINE_ADMIN_EMAIL']),
    password: firstEnv(env, ['RIDENDINE_SMOKE_PASSWORD', 'RIDENDINE_OPS_ADMIN_PASSWORD', 'RIDENDINE_ADMIN_PASSWORD']),
  };
}

function defaultDateWindow(now = Date.now()) {
  return {
    start: new Date(now - DAY_MS).toISOString(),
    end: new Date(now).toISOString(),
  };
}

function parseArgs(argv) {
  const parsed = {
    type: DEFAULT_TYPE,
    requireAuth: false,
    writeDocs: false,
    json: false,
    timeoutMs: 45_000,
    auditTimeoutMs: 10_000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--') continue;
    if (arg === '--require-auth') parsed.requireAuth = true;
    else if (arg === '--write-docs') parsed.writeDocs = true;
    else if (arg === '--json') parsed.json = true;
    else if (arg === '--type') {
      parsed.type = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--type=')) parsed.type = arg.slice('--type='.length);
    else if (arg === '--start') {
      parsed.start = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--start=')) parsed.start = arg.slice('--start='.length);
    else if (arg === '--end') {
      parsed.end = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--end=')) parsed.end = arg.slice('--end='.length);
    else if (arg === '--timeout-ms') {
      parsed.timeoutMs = Number(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--timeout-ms=')) parsed.timeoutMs = Number(arg.slice('--timeout-ms='.length));
    else if (arg === '--audit-timeout-ms') {
      parsed.auditTimeoutMs = Number(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--audit-timeout-ms=')) parsed.auditTimeoutMs = Number(arg.slice('--audit-timeout-ms='.length));
  }

  return parsed;
}

async function fetchAuditRecent(options) {
  const auditUrl = new URL('/api/audit/recent', `${trimBaseUrl(options.baseUrl)}/`);
  auditUrl.searchParams.set('limit', String(options.limit || DEFAULT_AUDIT_LIMIT));
  const response = await fetchWithTimeout(
    options.fetchImpl,
    auditUrl.toString(),
    {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Cookie: options.cookieHeader,
      },
    },
    options.timeoutMs
  );
  const body = await readText(response);
  let json = null;
  try {
    json = JSON.parse(body);
  } catch {
    return {
      ok: false,
      status: response.status,
      url: response.url || auditUrl.toString(),
      items: [],
      message: 'audit recent did not return JSON',
    };
  }

  const items = Array.isArray(json?.data?.items) ? json.data.items : [];
  const ok = response.status === 200 && Array.isArray(items);
  return {
    ok,
    status: response.status,
    url: response.url || auditUrl.toString(),
    items,
    message: ok ? `audit recent returned ${items.length} items` : 'audit recent response contract failed',
  };
}

async function pollForExportAuditEntry(options) {
  const deadline = Date.now() + options.auditTimeoutMs;
  const attempts = [];

  while (Date.now() <= deadline) {
    const audit = await fetchAuditRecent(options);
    attempts.push({ ok: audit.ok, status: audit.status, count: audit.items.length, message: audit.message });
    if (!audit.ok) return { ok: false, item: null, attempts, message: audit.message };

    const item = findExportAuditEntry(audit.items, {
      excludeIds: options.excludeIds,
      afterCreatedAt: options.afterCreatedAt,
    });
    if (item) return { ok: true, item, attempts, message: 'new export audit entry found' };

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  return { ok: false, item: null, attempts, message: 'new export audit entry was not found before timeout' };
}

function result(ok, key, status, message, extra = {}) {
  return {
    ok,
    key,
    status,
    message,
    ...extra,
  };
}

async function runOpsExportAuditSmoke(options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || fetch;
  const appConfig = options.appConfig || apps;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 45_000;
  const auditTimeoutMs = Number.isFinite(options.auditTimeoutMs) ? options.auditTimeoutMs : 10_000;
  const window = defaultDateWindow(options.now || Date.now());
  const start = options.start || window.start;
  const end = options.end || window.end;
  const type = options.type || DEFAULT_TYPE;
  const baseUrl = options.baseUrl || baseUrlForApp('ops', env, appConfig);
  const credentials = options.credentials || credentialsFromEnv(env);
  const results = [];
  const failures = [];
  const skipped = [];

  if (!credentials.email || !credentials.password) {
    const message = 'authenticated Ops credentials are required for CSV export audit proof';
    if (options.requireAuth) failures.push(message);
    else skipped.push(message);
    return {
      ok: failures.length === 0,
      generatedAt: new Date().toISOString(),
      app: 'ops',
      baseUrl,
      type,
      start,
      end,
      authenticated: false,
      results,
      failures,
      skipped,
      auditEntry: null,
    };
  }

  const session = await createAppSession('ops', {
    env,
    appConfig,
    fetchImpl,
    timeoutMs,
    credentials,
  });
  results.push(result(session.authenticated, 'ops-login', session.status || 0, session.message));
  if (!session.authenticated) {
    failures.push(`ops login: ${session.message} (${session.status || 'unknown'})`);
    return {
      ok: false,
      generatedAt: new Date().toISOString(),
      app: 'ops',
      baseUrl,
      type,
      start,
      end,
      authenticated: false,
      results,
      failures,
      skipped,
      auditEntry: null,
    };
  }

  const beforeAudit = await fetchAuditRecent({
    baseUrl,
    fetchImpl,
    timeoutMs,
    cookieHeader: session.cookieHeader,
    limit: DEFAULT_AUDIT_LIMIT,
  });
  results.push(result(beforeAudit.ok, 'audit-before', beforeAudit.status, beforeAudit.message));
  if (!beforeAudit.ok) failures.push(`audit-before: ${beforeAudit.message} (${beforeAudit.status})`);

  const beforeIds = new Set(beforeAudit.items.map((item) => String(item.id || '')).filter(Boolean));
  const afterCreatedAt = new Date(Date.now() - 5_000).toISOString();
  const exportUrl = buildExportUrl(baseUrl, { type, start, end });
  const exportResponse = await fetchWithTimeout(
    fetchImpl,
    exportUrl,
    {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Cookie: session.cookieHeader,
      },
    },
    timeoutMs
  );
  const exportBody = await readText(exportResponse);
  const contentType = responseHeader(exportResponse, 'content-type');
  const csvOk = exportResponse.status === 200 && isCsvResponse({ contentType, body: exportBody });
  results.push(result(
    csvOk,
    'csv-export',
    exportResponse.status,
    csvOk ? 'CSV export returned 200 text/csv with a header row' : 'CSV export did not return 200 text/csv with a header row',
    {
      type,
      rowCount: exportBody ? Math.max(exportBody.split(/\r?\n/).filter(Boolean).length - 1, 0) : 0,
      contentType,
    }
  ));
  if (!csvOk) failures.push(`csv-export: expected 200 text/csv with a header row but got ${exportResponse.status} ${contentType || 'unknown content type'}`);

  let auditPoll = { ok: false, item: null, attempts: [], message: 'CSV export failed before audit poll' };
  if (csvOk) {
    auditPoll = await pollForExportAuditEntry({
      baseUrl,
      fetchImpl,
      timeoutMs,
      auditTimeoutMs,
      cookieHeader: session.cookieHeader,
      limit: DEFAULT_AUDIT_LIMIT,
      excludeIds: beforeIds,
      afterCreatedAt,
    });
    results.push(result(
      auditPoll.ok,
      'export-audit-log',
      auditPoll.ok ? 200 : 0,
      auditPoll.message,
      {
        attempts: auditPoll.attempts.length,
        auditId: auditPoll.item?.id || null,
        createdAt: auditPoll.item?.created_at || null,
      }
    ));
    if (!auditPoll.ok) failures.push(`export-audit-log: ${auditPoll.message}`);
  }

  return {
    ok: failures.length === 0,
    generatedAt: new Date().toISOString(),
    app: 'ops',
    baseUrl,
    type,
    start,
    end,
    authenticated: true,
    results,
    failures,
    skipped,
    auditEntry: auditPoll.item
      ? {
          id: auditPoll.item.id,
          action: auditPoll.item.action,
          entity_type: auditPoll.item.entity_type,
          actor_role: auditPoll.item.actor_role,
          created_at: auditPoll.item.created_at,
        }
      : null,
  };
}

function escapeCell(value) {
  return String(value ?? '-').replace(/\|/g, '\\|');
}

function resultRows(summary) {
  if (!summary.results.length) return 'None found.';
  return summary.results.map((item) => {
    const marker = item.ok ? 'PASS' : 'FAIL';
    return `| ${marker} | ${escapeCell(item.key)} | ${item.status} | ${escapeCell(item.message)} |`;
  }).join('\n');
}

function failureRows(summary) {
  if (!summary.failures.length) return 'None found.';
  return summary.failures.map((failure) => `| ${escapeCell(failure)} |`).join('\n');
}

function generateMarkdown(summary) {
  const audit = summary.auditEntry;
  const auditRows = audit
    ? `| ${escapeCell(audit.id)} | ${escapeCell(audit.action)} | ${escapeCell(audit.entity_type)} | ${escapeCell(audit.actor_role)} | ${escapeCell(audit.created_at)} |`
    : 'None found.';

  return `# Ops Export Audit Smoke

Generated: ${summary.generatedAt}

This smoke proof verifies that the guarded Ops CSV export endpoint returns a valid CSV response and that a successful export produces a recent audit-log row. Credential values are intentionally never printed.

## Summary

| Metric | Value |
|---|---|
| App | Ops Admin |
| Base URL | ${escapeCell(summary.baseUrl)} |
| Export type | ${escapeCell(summary.type)} |
| Window start | ${escapeCell(summary.start)} |
| Window end | ${escapeCell(summary.end)} |
| Authenticated session | ${summary.authenticated ? 'Yes' : 'No'} |
| Passed | ${summary.ok ? 'Yes' : 'No'} |

## Checks

| Status | Check | Last status | Notes |
|---|---|---:|---|
${resultRows(summary)}

## Audit Entry

| ID | Action | Entity type | Actor role | Created at |
|---|---|---|---|---|
${auditRows}

## Failures

${failureRows(summary)}
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
    'docs/wiring/OPS_EXPORT_AUDIT_SMOKE.md',
    'docs/architecture/codebase-map/wiring/OPS_EXPORT_AUDIT_SMOKE.md',
    'docs/obsidian/codebase-map/Ops Export Audit Smoke.md',
  ];
  for (const output of outputs) writeFileEnsured(output, markdown, repoRoot);
  return outputs;
}

function printTextSummary(summary) {
  console.log('Ops export audit smoke checks');
  for (const item of summary.results) {
    const marker = item.ok ? 'PASS' : 'FAIL';
    console.log(`${marker} ${item.key} ${item.status} - ${item.message}`);
  }
  for (const item of summary.skipped) {
    console.log(`SKIP ${item}`);
  }
  if (summary.auditEntry) {
    console.log(`PASS export audit entry ${summary.auditEntry.id} at ${summary.auditEntry.created_at}`);
  }
  if (summary.failures.length) {
    console.log('Ops export audit smoke failures');
    for (const failure of summary.failures) console.log(` - ${failure}`);
  }
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  runOpsExportAuditSmoke(args)
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
  buildExportUrl,
  findExportAuditEntry,
  generateMarkdown,
  isCsvResponse,
  parseArgs,
  runOpsExportAuditSmoke,
  writeDocs,
};
