#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { apps } = require('./runtime-contracts.cjs');
const {
  baseUrlForApp,
  createAppSession,
} = require('./runtime-contract-smoke.cjs');

const USER_AGENT = 'RidenDine-Runtime-Sample-Fixtures/thread-5';

const sampleDefinitions = [
  { key: 'chefId', label: 'Chef ID', env: 'RIDENDINE_SAMPLE_CHEF_ID' },
  { key: 'chefSlug', label: 'Chef slug', env: 'RIDENDINE_SAMPLE_CHEF_SLUG' },
  { key: 'storefrontId', label: 'Storefront ID', env: 'RIDENDINE_SAMPLE_STOREFRONT_ID' },
  { key: 'customerId', label: 'Customer ID', env: 'RIDENDINE_SAMPLE_CUSTOMER_ID' },
  { key: 'driverId', label: 'Driver ID', env: 'RIDENDINE_SAMPLE_DRIVER_ID' },
  { key: 'deliveryId', label: 'Delivery ID', env: 'RIDENDINE_SAMPLE_DELIVERY_ID' },
  { key: 'orderId', label: 'Order ID', env: 'RIDENDINE_SAMPLE_ORDER_ID' },
  { key: 'payoutRunId', label: 'Payout run ID', env: 'RIDENDINE_SAMPLE_PAYOUT_RUN_ID' },
  { key: 'supportTicketId', label: 'Support ticket ID', env: 'RIDENDINE_SAMPLE_SUPPORT_TICKET_ID' },
];

function dynamicSegmentNames(value) {
  const names = [];
  const pattern = /\[(\.\.\.)?([^\]]+)\]/g;
  let match = pattern.exec(String(value || ''));
  while (match) {
    names.push(match[2]);
    match = pattern.exec(String(value || ''));
  }
  return names;
}

function collectRequiredSamples(items) {
  const names = new Set();
  for (const item of items || []) {
    for (const name of dynamicSegmentNames(item.route || item.endpoint || item.path)) names.add(name);
  }
  return [...names].sort();
}

function applySampleValues(routeOrEndpoint, values = {}) {
  return String(routeOrEndpoint || '').replace(/\[(\.\.\.)?([^\]]+)\]/g, (segment, _rest, name) => {
    return values[name] || values[segment] || segment;
  });
}

function firstEnv(env, names) {
  for (const name of names) {
    if (env[name]) return env[name];
  }
  return '';
}

function credentialsFromEnv(env = process.env) {
  return {
    email: firstEnv(env, ['RIDENDINE_SMOKE_EMAIL', 'RIDENDINE_ADMIN_EMAIL']),
    password: firstEnv(env, ['RIDENDINE_SMOKE_PASSWORD', 'RIDENDINE_ADMIN_PASSWORD']),
  };
}

function resolveSamplesFromEnv(env = process.env) {
  const samples = {};
  const slots = sampleDefinitions.map((definition) => {
    const value = env[definition.env] || '';
    if (value) samples[definition.key] = value;
    return {
      ...definition,
      configured: Boolean(value),
      source: value ? 'env' : 'missing',
    };
  });

  return {
    samples,
    slots,
    missing: slots.filter((slot) => !slot.configured),
  };
}

function mergeSampleSets(...sets) {
  const samples = {};
  const sources = {};
  for (const set of sets) {
    for (const [key, value] of Object.entries(set?.samples || {})) {
      if (!samples[key] && value) {
        samples[key] = value;
        sources[key] = set.sources?.[key] || set.source || 'resolved';
      }
    }
  }
  return { samples, sources };
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchJson(baseUrl, pathName, cookieHeader, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${String(baseUrl).replace(/\/+$/, '')}${pathName}`, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader || '',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
    });
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: await readJsonResponse(response),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function firstArrayItem(...values) {
  for (const value of values) {
    if (Array.isArray(value) && value.length) return value[0];
  }
  return null;
}

async function createControlledSupportTicket(options) {
  const baseUrl = baseUrlForApp('customer', options.env, options.appConfig || apps);
  const response = await fetch(`${baseUrl}/api/support`, {
    method: 'POST',
    headers: {
      Cookie: options.cookieHeader,
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify({
      name: 'RidenDine Smoke',
      email: options.email || 'smoke@ridendine.ca',
      subject: 'Runtime sample fixture smoke ticket',
      message: 'Controlled runtime sample fixture for smoke proof. Safe to close after verification.',
      category: 'technical',
    }),
  });
  const json = await readJsonResponse(response);
  return {
    ok: response.status >= 200 && response.status < 300 && Boolean(json?.data?.ticketId),
    status: response.status,
    ticketId: json?.data?.ticketId || '',
  };
}

async function discoverSamplesFromRuntime(options = {}) {
  const env = options.env || process.env;
  const appConfig = options.appConfig || apps;
  const timeoutMs = options.timeoutMs || 45_000;
  const credentials = options.credentials || credentialsFromEnv(env);
  const samples = {};
  const sources = {};
  const notes = [];

  if (!credentials.email || !credentials.password) {
    return { samples, sources, notes: ['live discovery skipped: credentials missing'] };
  }

  const sessions = {};
  for (const appKey of ['customer', 'ops', 'driver']) {
    sessions[appKey] = await createAppSession(appKey, {
      env,
      appConfig,
      credentials,
      timeoutMs,
      fetchImpl: fetch,
    });
    if (!sessions[appKey].authenticated) notes.push(`${appKey} discovery login failed`);
  }

  const customerBase = baseUrlForApp('customer', env, appConfig);
  const opsBase = baseUrlForApp('ops', env, appConfig);
  const driverBase = baseUrlForApp('driver', env, appConfig);

  if (sessions.customer?.authenticated) {
    const storefronts = await fetchJson(customerBase, '/api/storefronts?limit=1', sessions.customer.cookieHeader, timeoutMs);
    const storefront = firstArrayItem(storefronts.json?.data?.storefronts, storefronts.json?.storefronts);
    if (storefront?.id) {
      samples.storefrontId = storefront.id;
      sources.storefrontId = 'customer /api/storefronts?limit=1';
    }
    if (storefront?.slug) {
      samples.chefSlug = storefront.slug;
      sources.chefSlug = 'customer /api/storefronts?limit=1';
    }
    if (storefront?.chef?.id) {
      samples.chefId = storefront.chef.id;
      sources.chefId = 'customer /api/storefronts?limit=1';
    }

    const orders = await fetchJson(customerBase, '/api/orders', sessions.customer.cookieHeader, timeoutMs);
    const order = firstArrayItem(orders.json?.data?.orders, orders.json?.orders);
    if (order?.id) {
      samples.orderId = order.id;
      sources.orderId = 'customer /api/orders';
    }
    if (order?.customer_id) {
      samples.customerId = order.customer_id;
      sources.customerId = 'customer /api/orders';
    }

    let tickets = await fetchJson(customerBase, '/api/support/tickets', sessions.customer.cookieHeader, timeoutMs);
    let ticket = firstArrayItem(tickets.json?.data?.items, tickets.json?.items);
    if (!ticket && options.createSupportTicket) {
      const created = await createControlledSupportTicket({
        env,
        appConfig,
        email: credentials.email,
        cookieHeader: sessions.customer.cookieHeader,
      });
      if (created.ok) {
        notes.push('created controlled customer support ticket fixture');
        tickets = await fetchJson(customerBase, '/api/support/tickets', sessions.customer.cookieHeader, timeoutMs);
        ticket = firstArrayItem(tickets.json?.data?.items, tickets.json?.items) || { id: created.ticketId };
      } else {
        notes.push(`support ticket fixture creation failed (${created.status})`);
      }
    }
    if (ticket?.id) {
      samples.supportTicketId = ticket.id;
      sources.supportTicketId = options.createSupportTicket
        ? 'customer /api/support controlled fixture'
        : 'customer /api/support/tickets';
    }
  }

  if (sessions.ops?.authenticated) {
    const chefs = await fetchJson(opsBase, '/api/chefs', sessions.ops.cookieHeader, timeoutMs);
    const chef = firstArrayItem(chefs.json?.data?.items, chefs.json?.items);
    if (!samples.chefId && chef?.id) {
      samples.chefId = chef.id;
      sources.chefId = 'ops /api/chefs';
    }

    const drivers = await fetchJson(opsBase, '/api/drivers', sessions.ops.cookieHeader, timeoutMs);
    const driver = firstArrayItem(drivers.json?.data?.items, drivers.json?.items);
    if (driver?.id) {
      samples.driverId = driver.id;
      sources.driverId = 'ops /api/drivers';
    }

    const deliveries = await fetchJson(opsBase, '/api/deliveries', sessions.ops.cookieHeader, timeoutMs);
    const delivery = firstArrayItem(deliveries.json?.data, deliveries.json?.data?.items, deliveries.json?.items);
    if (delivery?.id) {
      samples.deliveryId = delivery.id;
      sources.deliveryId = 'ops /api/deliveries';
    }
  }

  if (sessions.driver?.authenticated) {
    const deliveries = await fetchJson(driverBase, '/api/deliveries', sessions.driver.cookieHeader, timeoutMs);
    const delivery = firstArrayItem(deliveries.json?.data?.deliveries, deliveries.json?.deliveries);
    if (!samples.deliveryId && delivery?.id) {
      samples.deliveryId = delivery.id;
      sources.deliveryId = 'driver /api/deliveries';
    }
    if (!samples.driverId && delivery?.driver_id) {
      samples.driverId = delivery.driver_id;
      sources.driverId = 'driver /api/deliveries';
    }
  }

  return { samples, sources, notes };
}

async function resolveRuntimeSamples(options = {}) {
  const envResolved = resolveSamplesFromEnv(options.env || process.env);
  const liveResolved = options.discoverLive ? await discoverSamplesFromRuntime(options) : { samples: {}, sources: {}, notes: [] };
  const merged = mergeSampleSets({ samples: envResolved.samples, source: 'env' }, liveResolved);
  const slots = sampleDefinitions.map((definition) => ({
    ...definition,
    configured: Boolean(merged.samples[definition.key]),
    source: merged.sources[definition.key] || 'missing',
  }));
  return {
    samples: merged.samples,
    sources: merged.sources,
    slots,
    missing: slots.filter((slot) => !slot.configured),
    notes: liveResolved.notes || [],
  };
}

function escapeCell(value) {
  return String(value ?? '-').replace(/\|/g, '\\|');
}

function generateMarkdown(summary) {
  const rows = sampleDefinitions.map((definition) => {
    const value = summary.samples[definition.key];
    const source = summary.sources[definition.key] || 'missing';
    return `| ${value ? 'READY' : 'MISSING'} | ${escapeCell(definition.label)} | \`${definition.env}\` | ${value ? escapeCell(value) : '-'} | ${escapeCell(source)} |`;
  });
  const notes = summary.notes?.length ? summary.notes.map((note) => `- ${escapeCell(note)}`).join('\n') : 'None found.';

  return `# Runtime Sample Fixtures

Generated: ${summary.generatedAt || new Date().toISOString()}

This smoke fixture record resolves stable sample values for dynamic runtime proof actions. Values are IDs or slugs only; authentication credentials are never printed.

## Summary

| Metric | Count |
|---|---:|
| Sample slots | ${sampleDefinitions.length} |
| Ready slots | ${sampleDefinitions.length - summary.missing.length} |
| Missing slots | ${summary.missing.length} |

## Samples

| Status | Sample | Env var | Value | Source |
|---|---|---|---|---|
${rows.join('\n')}

## Notes

${notes}
`;
}

function writeFileEnsured(relativePath, content, repoRoot = process.cwd()) {
  const absolutePath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
}

function writeSampleFixtureDocs(summary, options = {}) {
  const repoRoot = options.root || process.cwd();
  const markdown = generateMarkdown(summary);
  const outputs = [
    'docs/wiring/RUNTIME_SAMPLE_FIXTURES.md',
    'docs/architecture/codebase-map/wiring/RUNTIME_SAMPLE_FIXTURES.md',
    'docs/obsidian/codebase-map/Runtime Sample Fixtures.md',
  ];
  for (const output of outputs) writeFileEnsured(output, markdown, repoRoot);
  return outputs;
}

function parseArgs(argv) {
  const parsed = {
    json: false,
    writeDocs: false,
    discoverLive: false,
    requireAll: false,
    createSupportTicket: false,
    timeoutMs: 45_000,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--') continue;
    if (arg === '--json') parsed.json = true;
    else if (arg === '--write-docs') parsed.writeDocs = true;
    else if (arg === '--discover-live') parsed.discoverLive = true;
    else if (arg === '--require-all') parsed.requireAll = true;
    else if (arg === '--allow-create-support-ticket') parsed.createSupportTicket = true;
    else if (arg === '--timeout-ms') {
      parsed.timeoutMs = Number(argv[i + 1]);
      i += 1;
    }
  }
  return parsed;
}

function printTextSummary(summary) {
  console.log('Runtime sample fixtures');
  for (const slot of summary.slots) {
    console.log(`${slot.configured ? 'READY' : 'MISSING'} ${slot.key} via ${slot.source}`);
  }
  for (const note of summary.notes) console.log(`NOTE ${note}`);
  if (summary.missing.length) {
    console.log('Missing sample fixture slots');
    for (const slot of summary.missing) console.log(` - ${slot.key} (${slot.env})`);
  }
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  resolveRuntimeSamples({
    env: process.env,
    discoverLive: args.discoverLive,
    createSupportTicket: args.createSupportTicket,
    timeoutMs: args.timeoutMs,
  })
    .then((summary) => {
      const finalSummary = { ...summary, generatedAt: new Date().toISOString() };
      if (args.writeDocs) writeSampleFixtureDocs(finalSummary);
      if (args.json) console.log(JSON.stringify(finalSummary, null, 2));
      else printTextSummary(finalSummary);
      if (args.requireAll && finalSummary.missing.length) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error && error.stack ? error.stack : String(error));
      process.exitCode = 1;
    });
}

module.exports = {
  applySampleValues,
  collectRequiredSamples,
  discoverSamplesFromRuntime,
  generateMarkdown,
  parseArgs,
  resolveRuntimeSamples,
  resolveSamplesFromEnv,
  sampleDefinitions,
  writeSampleFixtureDocs,
};
