const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outDir = path.join(root, 'docs', 'wiring');
const diagramsDir = path.join(outDir, 'diagrams');
const architectureDir = path.join(root, 'docs', 'architecture', 'codebase-map');
const architectureWiringDir = path.join(architectureDir, 'wiring');
const obsidianDir = path.join(root, 'docs', 'obsidian', 'codebase-map');
const graphifyDir = path.join(root, 'graphify-out', 'ridendine-codebase-map');
const { pageContracts, apiContracts } = require('./wiring-contracts.cjs');
const runtimeSmokeContracts = require('../smoke/runtime-contracts.cjs');

const apps = [
  {
    name: 'Customer Web',
    slug: 'web',
    root: 'apps/web',
    appDir: 'apps/web/src/app',
    domain: 'ridendine.ca',
    local: 'http://localhost:3000',
    role: 'Customers',
    color: '#2563eb',
    purpose: 'Customer-facing marketplace, chef discovery, cart, checkout, account, support, loyalty, and order tracking.',
  },
  {
    name: 'Ops Admin',
    slug: 'ops-admin',
    root: 'apps/ops-admin',
    appDir: 'apps/ops-admin/src/app',
    domain: 'ops.ridendine.ca',
    local: 'http://localhost:3002',
    role: 'Platform operators',
    color: '#7c3aed',
    purpose: 'Control plane for operations, customers, chefs, drivers, dispatch, finance, payouts, reconciliation, support, and system health.',
  },
  {
    name: 'Chef Admin',
    slug: 'chef-admin',
    root: 'apps/chef-admin',
    appDir: 'apps/chef-admin/src/app',
    domain: 'chef.ridendine.ca',
    local: 'http://localhost:3001',
    role: 'Chefs',
    color: '#e85d26',
    purpose: 'Chef storefront management, menu, availability, orders, kitchen operations, analytics, payouts, profile, and reviews.',
  },
  {
    name: 'Driver App',
    slug: 'driver-app',
    root: 'apps/driver-app',
    appDir: 'apps/driver-app/src/app',
    domain: 'driver.ridendine.ca',
    local: 'http://localhost:3003',
    role: 'Delivery drivers',
    color: '#059669',
    purpose: 'Driver onboarding, presence, delivery offers, active deliveries, location updates, history, earnings, and payout setup.',
  },
];

const scanPackages = [
  'packages/auth',
  'packages/config',
  'packages/db',
  'packages/engine',
  'packages/notifications',
  'packages/routing',
  'packages/types',
  'packages/ui',
  'packages/utils',
  'packages/validation',
];
const actionExpectations = {
  'Customer browse chefs/restaurants': ['apps/web/src/app/chefs/page.tsx', 'apps/web/src/app/api'],
  'Customer add item to cart': ['apps/web/src/app/cart/page.tsx', 'apps/web/src/contexts/cart-context.tsx', 'apps/web/src/app/api/cart/route.ts'],
  'Customer checkout': ['apps/web/src/app/checkout/page.tsx', 'apps/web/src/app/api/checkout/route.ts'],
  'Customer track order': ['apps/web/src/components/tracking', 'apps/web/src/app/api/orders/[id]/route.ts'],
  'Customer update address': ['apps/web/src/app/account/addresses/page.tsx', 'apps/web/src/app/api/addresses/route.ts'],
  'Chef accept order': ['apps/chef-admin/src/app/dashboard/orders/page.tsx', 'apps/chef-admin/src/app/api/orders/[id]/route.ts'],
  'Chef mark preparing': ['apps/chef-admin/src/app/dashboard/orders/page.tsx', 'apps/chef-admin/src/app/api/orders/[id]/route.ts'],
  'Chef mark ready': ['apps/chef-admin/src/app/dashboard/orders/page.tsx', 'apps/chef-admin/src/app/api/orders/[id]/route.ts'],
  'Chef update menu item': ['apps/chef-admin/src/app/dashboard/menu/page.tsx', 'apps/chef-admin/src/app/api/menu/[id]/route.ts'],
  'Chef toggle availability': ['apps/chef-admin/src/app/dashboard/availability/page.tsx', 'apps/chef-admin/src/app/api/storefront/availability/route.ts'],
  'Driver go online/offline': ['apps/driver-app/src/app/api/driver/presence/route.ts', 'apps/driver-app/src/app/page.tsx'],
  'Driver accept offer': ['apps/driver-app/src/app/api/offers/route.ts'],
  'Driver update location': ['apps/driver-app/src/app/api/location/route.ts'],
  'Driver mark picked up': ['apps/driver-app/src/app/api/deliveries/[id]/route.ts'],
  'Driver mark delivered': ['apps/driver-app/src/app/api/deliveries/[id]/route.ts'],
  'Driver request instant payout': ['apps/driver-app/src/app/api/payouts/instant/route.ts', 'apps/driver-app/src/app/earnings/page.tsx'],
  'Ops view live board': ['apps/ops-admin/src/app/dashboard/page.tsx', 'apps/ops-admin/src/app/api/ops/live-board/route.ts'],
  'Ops assign driver': ['apps/ops-admin/src/app/dashboard/dispatch/page.tsx', 'apps/ops-admin/src/app/api/engine/dispatch/route.ts'],
  'Ops review SLA alerts': ['apps/ops-admin/src/app/api/engine/processors/sla/route.ts', 'apps/ops-admin/src/components/ops-alerts.tsx'],
  'Ops inspect order': ['apps/ops-admin/src/app/dashboard/orders/[id]/page.tsx', 'apps/ops-admin/src/app/api/orders/[id]/route.ts'],
  'Ops approve/hold payout': ['apps/ops-admin/src/app/dashboard/finance/payouts/page.tsx', 'apps/ops-admin/src/app/api/engine/payouts/execute/route.ts'],
  'Ops run reconciliation': ['apps/ops-admin/src/app/dashboard/finance/reconciliation/page.tsx', 'apps/ops-admin/src/app/api/engine/reconciliation/route.ts'],
};

function rel(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function read(relPath) {
  const abs = path.join(root, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

function walk(dir, predicate, acc = []) {
  if (!fs.existsSync(path.join(root, dir))) return acc;
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const child = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) walk(child, predicate, acc);
    else if (!predicate || predicate(child)) acc.push(child);
  }
  return acc.sort();
}

function mdLink(file) {
  return `[${file}](../../${file})`;
}

function deepMdLink(file) {
  return `[${file}](../../../${file})`;
}

function routeFromFile(appDir, file) {
  let route = file.replace(appDir, '').replace(/\/(page|route)\.tsx?$/, '');
  route = route.replace(/\/page$/, '');
  if (!route || route === '') return '/';
  route = route.replace(/\/\(.*?\)/g, '');
  return route.replace(/\[([^\]]+)\]/g, ':$1');
}

function endpointFromRouteFile(appDir, file) {
  return routeFromFile(appDir, file.replace(/route\.ts$/, 'page.tsx')).replace(/^\/api/, '/api');
}

function nearestLayout(appDir, file) {
  let dir = path.dirname(file);
  while (dir.startsWith(appDir)) {
    const candidate = path.join(dir, 'layout.tsx').replace(/\\/g, '/');
    if (exists(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  return `${appDir}/layout.tsx`;
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))].sort();
}

function list(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function contractFor(contracts, app, route, file) {
  return contracts[file] || contracts[`${app.slug}:${route}`] || contracts[`${app.name}:${route}`] || null;
}

function mergeContractValues(detected, contractValues) {
  return unique([...detected, ...list(contractValues)]);
}

function cleanTarget(raw) {
  if (!raw) return '';
  const value = String(raw)
    .trim()
    .replace(/^['"`]+|['"`]+$/g, '')
    .replace(/&amp;/g, '&');
  return value.includes('${') ? value.replace(/^\{+/, '') : value.replace(/^['"`{]+|['"`}]+$/g, '');
}

function removeQueryHash(target) {
  return target.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
}

function appForHost(target) {
  const match = target.match(/^https?:\/\/([^/]+)(\/.*)?$/i);
  if (!match) return null;
  const host = match[1].toLowerCase();
  return apps.find((app) => app.domain === host || app.local.replace(/^https?:\/\//, '') === host) || null;
}

function internalPathFromTarget(target) {
  const hostedApp = appForHost(target);
  if (hostedApp) {
    const url = new URL(target);
    return { app: hostedApp, path: removeQueryHash(url.pathname || '/') };
  }
  if (target.startsWith('/')) return { app: null, path: removeQueryHash(target) };
  return { app: null, path: target };
}

function targetToPattern(target) {
  return removeQueryHash(target)
    .replace(/\$\{[^}]+\}/g, ':param')
    .replace(/\[[^\]]+\]/g, ':param')
    .replace(/\/:param(?=\/|$)/g, '/:param');
}

function routeToRegex(route) {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/:[^/]+/g, '[^/]+')}$`);
}

function routePatternMatches(route, target) {
  if (route === target) return true;
  const normalizedTarget = targetToPattern(target);
  if (route === normalizedTarget) return true;
  return routeToRegex(route).test(removeQueryHash(target).replace(/\$\{[^}]+\}/g, 'dynamic'));
}

function publicAssetExists(app, targetPath) {
  if (!targetPath.startsWith('/')) return false;
  const assetPath = `${app.root}/public${removeQueryHash(targetPath)}`;
  const abs = path.join(root, assetPath);
  return fs.existsSync(abs) && fs.statSync(abs).isFile();
}

function extractLinks(text) {
  const links = [];
  const patterns = [
    { kind: 'href', re: /\bhref=\{?['"`]([^'"`]+)['"`]\}?/g },
    { kind: 'router.push', re: /router\.(?:push|replace)\(['"`]([^'"`]+)['"`]\)/g },
    { kind: 'redirect', re: /(?:redirect|permanentRedirect)\(['"`]([^'"`]+)['"`]\)/g },
    { kind: 'window.location', re: /window\.location(?:\.href)?\s*=\s*['"`]([^'"`]+)['"`]/g },
  ];
  for (const { kind, re } of patterns) {
    let match;
    while ((match = re.exec(text))) links.push({ kind, target: cleanTarget(match[1]) });
  }
  return links.filter((link) => link.target && !link.target.startsWith('{'));
}

function extractEnvVars(text) {
  const vars = [];
  const patterns = [
    /process\.env\.([A-Z0-9_]+)/g,
    /process\.env\[['"`]([A-Z0-9_]+)['"`]\]/g,
    /\b(NEXT_PUBLIC_[A-Z0-9_]+|SUPABASE_[A-Z0-9_]+|STRIPE_[A-Z0-9_]+|CRON_SECRET|ENGINE_PROCESSOR_TOKEN|OPS_ADMIN_URL|RESEND_[A-Z0-9_]+|TWILIO_[A-Z0-9_]+)\b/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) vars.push(match[1]);
  }
  return unique(vars);
}

function extractComponents(text) {
  const components = [];
  const ridendineUi = text.match(/import\s+\{([^}]+)\}\s+from\s+['"]@ridendine\/ui['"]/);
  if (ridendineUi) {
    components.push(...ridendineUi[1].split(',').map((item) => item.trim().replace(/\s+as\s+.*/, '')));
  }
  const localComponentImports = [...text.matchAll(/from\s+['"](@\/components\/[^'"]+)['"]/g)].map((m) => m[1]);
  components.push(...localComponentImports);
  return unique(components);
}

function extractTables(text) {
  const tables = [];
  const patterns = [
    /\.from\(['"`]([^'"`]+)['"`]\)/g,
    /\.rpc\(['"`]([^'"`]+)['"`]\)/g,
    /from\s+public\.([a-zA-Z0-9_]+)/g,
    /(?:create table|alter table|drop table|create index).*?(?:public\.)?([a-zA-Z0-9_]+)/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) tables.push(match[1]);
  }
  return unique(tables);
}

function extractApis(text) {
  const apis = [];
  const patterns = [/fetch\(['"`]([^'"`]+)['"`]/g, /axios\.(?:get|post|put|patch|delete)\(['"`]([^'"`]+)['"`]/g];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) apis.push(match[1]);
  }
  return unique(apis);
}

function extractPackages(text) {
  const packages = [];
  const pattern = /from ['"](@ridendine\/[^'"]+)['"]/g;
  let match;
  while ((match = pattern.exec(text))) packages.push(match[1]);
  return unique(packages);
}

function extractMethods(text) {
  const methods = [];
  const pattern = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b|export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\b/g;
  let match;
  while ((match = pattern.exec(text))) methods.push(match[1] || match[2]);
  return unique(methods);
}

function detectAuth(text, route) {
  if (/auth\.getUser|getUser\(|requireAdmin|requireOps|requireChef|requireDriver|createServerClient\(cookie|cookies\(\)|isApprovedDriver|redirect\('\/auth\/login|getOpsActorContext|getChefActorContext|getChefBasicContext|getDriverActorContext|getCustomerActorContext|getCurrentCustomer|guardPlatformApi|finalizeOpsActor|hasRequiredRole|validateEngineProcessorHeaders|CRON_SECRET|ENGINE_PROCESSOR_TOKEN|verifyStripeWebhook|webhooks\.constructEvent|constructEvent/.test(text)) return 'Detected';
  if (route.startsWith('/auth') || route === '/' || route.startsWith('/about') || route.startsWith('/terms') || route.startsWith('/privacy')) return 'Public';
  return 'Undetected';
}

function statusFor({ auth, tables, apis, text, contract }) {
  if (/redirect\(|notFound\(|permanentRedirect\(/.test(text)) return 'WIRED';
  if (contract?.status) return contract.status;
  if (contract?.intent) return 'WIRED';
  if (/TODO|Coming Soon|not implemented|placeholder/i.test(text)) return 'PARTIAL';
  if (auth === 'Undetected' && tables.length === 0 && apis.length === 0 && !/static|metadata|return\s*\(/.test(text)) return 'MISSING';
  if (auth === 'Undetected' && (tables.length || apis.length)) return 'PARTIAL';
  return 'WIRED';
}

function collectRoutes() {
  const routes = [];
  for (const app of apps) {
    const pages = walk(app.appDir, (f) => f.endsWith('/page.tsx'));
    for (const file of pages) {
      const text = read(file);
      const route = routeFromFile(app.appDir, file);
      const contract = contractFor(pageContracts, app, route, file);
      const tables = mergeContractValues(extractTables(text), contract?.tables);
      const apis = mergeContractValues(extractApis(text), contract?.apis);
      const packages = mergeContractValues(extractPackages(text), contract?.packages);
      const links = extractLinks(text);
      const envVars = extractEnvVars(text);
      const components = mergeContractValues(extractComponents(text), contract?.components);
      const auth = contract?.auth || detectAuth(text, route);
      routes.push({
        app: app.name,
        slug: app.slug,
        route,
        file,
        layout: nearestLayout(app.appDir, file),
        auth,
        dataSource: contract?.dataSource || [...tables.map((t) => `table:${t}`), ...packages].join(', ') || 'Static/client component/undetected',
        apis,
        tables,
        packages,
        links,
        envVars,
        components,
        contract,
        status: statusFor({ auth, tables, apis, text, contract }),
      });
    }
  }
  return routes;
}

function collectApis() {
  const apis = [];
  for (const app of apps) {
    const files = walk(app.appDir, (f) => f.endsWith('/route.ts') && f.includes('/api/'));
    for (const file of files) {
      const text = read(file);
      const methods = extractMethods(text);
      const endpoint = endpointFromRouteFile(app.appDir, file);
      const contract = contractFor(apiContracts, app, endpoint, file);
      const tables = mergeContractValues(extractTables(text), contract?.tables);
      const packages = mergeContractValues(extractPackages(text), contract?.packages);
      const envVars = extractEnvVars(text);
      const auth = contract?.auth || detectAuth(text, '/api');
      const external = mergeContractValues([
        /stripe/i.test(text) ? 'Stripe' : '',
        /mapbox|osrm|routing/i.test(text) ? 'Routing provider' : '',
        /supabase/i.test(text) ? 'Supabase' : '',
        /sentry/i.test(text) ? 'Sentry' : '',
      ], contract?.external);
      apis.push({
        app: app.name,
        endpoint,
        file,
        methods: methods.length ? methods : ['UNDETECTED'],
        request: contract?.request || (/z\.object|Schema|parse\(|safeParse\(/.test(text) ? 'Validation/schema detectable' : 'Undetected'),
        response: contract?.response || (/NextResponse\.json|Response\.json/.test(text) ? 'JSON response' : 'Undetected'),
        auth,
        packages,
        tables,
        envVars,
        external,
        contract,
        status: methods.length ? statusFor({ auth, tables, apis: packages, text, contract }) : 'PARTIAL',
      });
    }
  }
  return apis;
}

function collectDbEngine() {
  const migrationFiles = walk('supabase/migrations', (f) => f.endsWith('.sql'));
  const packageFiles = scanPackages.flatMap((dir) => walk(dir, (f) => /\.(ts|tsx|sql)$/.test(f) && !f.includes('node_modules')));
  const migrationText = migrationFiles.map(read).join('\n');
  const packageText = packageFiles.map(read).join('\n');
  const tables = extractTables(`${migrationText}\n${packageText}`);
  const services = packageFiles.filter((f) => /service|engine|orchestrator|repository|provider|schema|validation|route|eta|ledger|payout|dispatch|reconciliation/i.test(f));
  return { migrationFiles, packageFiles, tables, services };
}

function write(file, body) {
  fs.mkdirSync(path.dirname(path.join(outDir, file)), { recursive: true });
  fs.writeFileSync(path.join(outDir, file), normalizeTextBody(body));
}

function writeTo(baseDir, file, body) {
  fs.mkdirSync(path.dirname(path.join(baseDir, file)), { recursive: true });
  fs.writeFileSync(path.join(baseDir, file), normalizeTextBody(body));
}

function writeJsonTo(baseDir, file, value) {
  writeTo(baseDir, file, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeTextBody(body) {
  return typeof body === 'string' ? `${body.trimEnd()}\n` : body;
}

function rebaseMdLinks(body, prefixToRepoRoot) {
  return body.replace(/\]\(\.\.\/\.\.\//g, `](${prefixToRepoRoot}`);
}

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? '').replace(/\n/g, '<br>').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function generateWiringContracts() {
  const pageRows = Object.entries(pageContracts).map(([file, contract]) => [
    mdLink(file),
    contract.auth,
    contract.dataSource || contract.intent || '',
    list(contract.apis).map((api) => `\`${api}\``).join(', ') || 'None',
    list(contract.tables).map((tableName) => `\`${tableName}\``).join(', ') || 'None',
    contract.status,
    contract.notes || '',
  ]);
  const apiRows = Object.entries(apiContracts).map(([file, contract]) => [
    mdLink(file),
    contract.auth,
    contract.request,
    contract.response,
    list(contract.tables).map((tableName) => `\`${tableName}\``).join(', ') || 'None',
    list(contract.external).join(', ') || 'None',
    contract.status,
    contract.notes || '',
  ]);

  return `# Wiring Contract Registry

Generated from \`scripts/wiring/wiring-contracts.cjs\`.

These contracts document route and API intent that static text scanning cannot reliably infer. They do not replace runtime tests; they keep generated wiring maps honest about known public, protected, health, and marketplace-read surfaces.

## Page Contracts

${table(['Page file', 'Auth intent', 'Data/API intent', 'APIs', 'Tables', 'Status', 'Notes'], pageRows)}

## API Contracts

${table(['API file', 'Auth intent', 'Request contract', 'Response contract', 'Tables', 'External', 'Status', 'Notes'], apiRows)}
`;
}

function generateRuntimeContractSmoke() {
  const { apps: runtimeApps, authIntentPages, publicJsonApis, protectedJsonApis } = runtimeSmokeContracts;
  const authenticatedApis = protectedJsonApis.filter((contract) => contract.authenticated);
  const pageRows = authIntentPages.map((contract) => [
    runtimeApps[contract.app].name,
    `\`${contract.path}\``,
    contract.sourcePath ? mdLink(contract.sourcePath) : 'None',
    contract.authIntent,
    contract.expect,
    contract.redirectedTo ? `\`${contract.redirectedTo}\`` : 'None',
    contract.note || '',
  ]);
  const publicApiRows = publicJsonApis.map((contract) => [
    runtimeApps[contract.app].name,
    `\`${contract.path}\``,
    contract.allowedStatuses.join(', '),
    contract.note || '',
  ]);
  const protectedApiRows = protectedJsonApis.map((contract) => [
    runtimeApps[contract.app].name,
    `\`${contract.path}\``,
    contract.allowedStatuses.join(', '),
    contract.authenticated ? 'Yes' : 'No',
    contract.note || '',
  ]);

  return `# Runtime Contract Smoke

Generated from \`scripts/smoke/runtime-contracts.cjs\`.

This Phase 9 smoke gate verifies live production behavior that static wiring scans cannot prove. It is read-only except for app-owned login requests used to create smoke sessions for customer, chef, driver, and ops authenticated API checks.

Run from the repo root:

\`\`\`powershell
$env:RIDENDINE_SMOKE_EMAIL = '<seeded smoke email>'
$env:RIDENDINE_SMOKE_PASSWORD = '<seeded smoke password>'
pnpm smoke:prod:contracts -- --require-auth
\`\`\`

## Coverage Summary

| Contract class | Count | Runtime proof |
| --- | ---: | --- |
| Auth-intent pages | ${authIntentPages.length} | Public pages return HTML, protected pages resolve to login guard, legacy redirect shims expose their redirect target. |
| Public JSON APIs | ${publicJsonApis.length} | Public/health/marketplace-read endpoints return JSON with allowed status codes. |
| Protected JSON APIs | ${protectedJsonApis.length} | Unauthenticated requests do not return 200. |
| Authenticated JSON APIs | ${authenticatedApis.length} | App-owned customer, chef, driver, and ops login sessions can read expected JSON APIs. |

## Auth-Intent Page Contracts

${table(['App', 'Route', 'Source file', 'Auth intent', 'Expected runtime proof', 'Redirect target', 'Notes'], pageRows)}

## Public JSON API Contracts

${table(['App', 'API', 'Allowed statuses', 'Notes'], publicApiRows)}

## Protected JSON API Contracts

${table(['App', 'API', 'Unauth allowed statuses', 'Authenticated proof', 'Notes'], protectedApiRows)}
`;
}

function generateRouteInventory(routes) {
  return `# Route Inventory

Generated from actual \`page.tsx\` files in \`apps/*/src/app\`.

${table(['App', 'Route URL', 'Page/component file', 'Layout file', 'Auth', 'Data source', 'API calls', 'DB tables', 'Status'], routes.map((r) => [
    r.app,
    `\`${r.route}\``,
    mdLink(r.file),
    mdLink(r.layout),
    r.auth,
    r.dataSource,
    r.apis.map((a) => `\`${a}\``).join(', ') || 'None detected',
    r.tables.map((t) => `\`${t}\``).join(', ') || 'None detected',
    r.status,
  ]))}
`;
}

function generateApiInventory(apis) {
  const rows = apis.flatMap((api) => api.methods.map((method) => [
    method,
    `\`${api.endpoint}\``,
    mdLink(api.file),
    api.request,
    api.response,
    api.auth,
    api.packages.join(', ') || 'None detected',
    api.tables.map((t) => `\`${t}\``).join(', ') || 'None detected',
    api.external.join(', ') || 'None detected',
    api.status,
  ]));
  return `# API Inventory

Generated from actual \`apps/*/src/app/api/**/route.ts\` files.

${table(['Method', 'Endpoint', 'File path', 'Request body/schema', 'Response shape', 'Auth check', 'Engine/package used', 'DB tables touched', 'External service', 'Status'], rows)}
`;
}

function generateDataEngineMap(map) {
  const serviceRows = map.services.map((file) => {
    const text = read(file);
    return [mdLink(file), extractTables(text).map((t) => `\`${t}\``).join(', ') || 'None detected', extractPackages(text).join(', ') || 'None detected'];
  });
  return `# Data And Engine Map

## Tables And RPCs Detected

${map.tables.map((t) => `- \`${t}\``).join('\n') || '- None detected'}

## Migration Sources

${map.migrationFiles.map((f) => `- ${mdLink(f)}`).join('\n') || '- No migration files found'}

## Core Services And Packages

${table(['Source file', 'Tables/RPCs touched', 'Ridéndine packages imported'], serviceRows)}

## Public Order Stage Flow

\`\`\`mermaid
flowchart LR
  Orders["orders table"] --> Engine["packages/engine order orchestration"]
  Engine --> PublicStage["packages/types public order stage"]
  PublicStage --> CustomerTracking["Customer tracking surfaces"]
  PublicStage --> OpsLive["Ops live board"]
\`\`\`

## Ledger Flow

\`\`\`mermaid
flowchart LR
  Payment["Stripe/order payment"] --> Ledger["ledger-related engine services"]
  Ledger --> ChefPayable["Chef payable records"]
  Ledger --> DriverPayable["Driver payable records"]
  Ledger --> Reconciliation["Reconciliation APIs/pages"]
\`\`\`

## Payout Flow

\`\`\`mermaid
flowchart LR
  ChefDashboard["Chef payout pages/APIs"] --> PayoutEngine["packages/engine payout services"]
  DriverEarnings["Driver earnings/instant payout APIs"] --> PayoutEngine
  OpsPayouts["Ops payout controls"] --> PayoutEngine
  PayoutEngine --> Supabase["Supabase payout/ledger tables detected above"]
\`\`\`

## Dispatch Flow

\`\`\`mermaid
flowchart LR
  OpsDispatch["Ops dispatch page/API"] --> DispatchEngine["packages/engine dispatch orchestration"]
  DispatchEngine --> DriverOffers["Driver offers API"]
  DriverOffers --> DeliveryUpdates["Driver delivery APIs"]
  DeliveryUpdates --> OrderState["Order/delivery state"]
\`\`\`

## Reconciliation Flow

\`\`\`mermaid
flowchart LR
  StripeWebhook["Stripe webhook APIs"] --> Engine["Engine finance/reconciliation services"]
  Engine --> OpsRecon["Ops reconciliation page/API"]
  OpsRecon --> Audit["Audit/recent APIs where detected"]
\`\`\`

## ETA / Routing Flow

\`\`\`mermaid
flowchart LR
  Address["Customer/driver location data"] --> RoutingPackage["packages/routing"]
  RoutingPackage --> Provider["Mapbox/OSRM provider when configured"]
  Provider --> ETA["ETA/progress services"]
  ETA --> Tracking["Customer tracking and ops map surfaces"]
\`\`\`

## Stripe Webhook Flow

\`\`\`mermaid
flowchart LR
  Stripe["Stripe"] --> WebWebhook["apps/web API webhook"]
  Stripe --> OpsWebhook["apps/ops-admin API webhook"]
  WebWebhook --> Orders["Orders/payment status"]
  OpsWebhook --> Finance["Finance/reconciliation controls"]
\`\`\`
`;
}

const diagrams = {
  'FULL_SYSTEM_CONTEXT.md': `# Full System Context

\`\`\`mermaid
flowchart TB
  Customer["Customer app apps/web"] --> Supabase["Supabase Auth + DB"]
  Chef["Chef admin apps/chef-admin"] --> Supabase
  Driver["Driver app apps/driver-app"] --> Supabase
  Ops["Ops admin apps/ops-admin"] --> Supabase
  Customer --> Stripe["Stripe"]
  Ops --> Stripe
  Driver --> Routing["Routing provider via packages/routing"]
  Ops --> Routing
  Vercel["Vercel hosting"] --> Customer
  Vercel --> Chef
  Vercel --> Driver
  Vercel --> Ops
  Shared["Shared packages: ui, db, engine, types, validation, routing, auth, utils"] --> Customer
  Shared --> Chef
  Shared --> Driver
  Shared --> Ops
\`\`\`
`,
  'CUSTOMER_ORDER_FLOW.md': `# Customer Order Flow

\`\`\`mermaid
flowchart LR
  Browse["Browse chefs/restaurants"] --> Menu["Chef menu"]
  Menu --> Cart["Cart"]
  Cart --> Checkout["Checkout API"]
  Checkout --> OrderCreated["Order created"]
  OrderCreated --> ChefQueue["Chef receives order"]
  ChefQueue --> Dispatch["Driver dispatch"]
  Dispatch --> Tracking["Customer tracking"]
  Tracking --> Completed["Completed order"]
\`\`\`
`,
  'CHEF_ORDER_FLOW.md': `# Chef Order Flow

\`\`\`mermaid
flowchart LR
  Login["Chef login"] --> Queue["Order queue"]
  Queue --> Accept["Accept order"]
  Accept --> Prep["Mark preparing"]
  Prep --> Ready["Mark ready"]
  Ready --> PublicStage["Public order stage update"]
  PublicStage --> Ops["Ops visibility"]
\`\`\`
`,
  'DRIVER_DELIVERY_FLOW.md': `# Driver Delivery Flow

\`\`\`mermaid
flowchart LR
  Online["Driver online"] --> Offer["Offer API/screen"]
  Offer --> Accept["Accept offer"]
  Accept --> Pickup["Pickup progression"]
  Pickup --> Dropoff["Delivery progression"]
  Dropoff --> Complete["Completion"]
  Complete --> Ledger["Payout ledger/earnings"]
\`\`\`
`,
  'OPS_CONTROL_FLOW.md': `# Ops Control Flow

\`\`\`mermaid
flowchart LR
  Dashboard["Ops dashboard"] --> Dispatch["Dispatch"]
  Dashboard --> Finance["Finance"]
  Finance --> Recon["Reconciliation"]
  Finance --> Payouts["Payout controls"]
  Dispatch --> Audit["Audit timeline/activity"]
  Recon --> Audit
  Payouts --> Audit
\`\`\`
`,
  'FINANCE_LEDGER_FLOW.md': `# Finance Ledger Flow

\`\`\`mermaid
flowchart LR
  Payment["Order payment"] --> Fee["Platform fee"]
  Payment --> Chef["Chef payable"]
  Payment --> Driver["Driver payable"]
  Chef --> Run["Payout run"]
  Driver --> Run
  Run --> Reconciliation["Reconciliation"]
\`\`\`
`,
  'AUTH_RBAC_FLOW.md': `# Auth RBAC Flow

\`\`\`mermaid
flowchart TB
  SupabaseAuth["Supabase auth"] --> Customer["Customer role -> apps/web account/cart/checkout"]
  SupabaseAuth --> Chef["Chef role -> apps/chef-admin dashboard"]
  SupabaseAuth --> Driver["Driver role -> apps/driver-app delivery/earnings"]
  SupabaseAuth --> Ops["Ops/admin role -> apps/ops-admin dashboard"]
  Middleware["App middleware and server auth checks"] --> Customer
  Middleware --> Chef
  Middleware --> Driver
  Middleware --> Ops
\`\`\`
`,
  'REALTIME_EVENT_FLOW.md': `# Realtime Event Flow

\`\`\`mermaid
flowchart LR
  API["API routes"] --> Engine["Engine events"]
  Engine --> Sanitizer["Public broadcast sanitizer"]
  Sanitizer --> Customer["Customer tracking"]
  Sanitizer --> Ops["Ops live board"]
  Engine --> Chef["Chef queue state"]
  Engine --> Driver["Driver state"]
\`\`\`
`,
};

function generatePageMatrix(routes) {
  return `# Page Wiring Matrix

${table(['App', 'Page', 'Route', 'Reads From', 'Writes To', 'Calls API', 'Shared Components', 'Auth Role', 'Status', 'Missing Wiring'], routes.map((r) => [
    r.app,
    mdLink(r.file),
    `\`${r.route}\``,
    r.tables.map((t) => `\`${t}\``).join(', ') || r.packages.join(', ') || 'Static/undetected',
    /POST|PATCH|PUT|DELETE|insert|update|delete|upsert/.test(read(r.file)) ? 'Detected write path in page/client flow' : 'None detected in page',
    r.apis.map((a) => `\`${a}\``).join(', ') || 'None detected',
    /@ridendine\/ui/.test(read(r.file)) ? '@ridendine/ui' : 'Undetected',
    r.auth,
    r.status,
    r.status === 'WIRED' ? '' : 'Review auth/data/API wiring',
  ]))}
`;
}

function generateActionMap(apis) {
  const rows = Object.entries(actionExpectations).map(([action, files]) => {
    const present = files.filter((f) => exists(f) || fs.existsSync(path.join(root, f)));
    const missing = files.filter((f) => !exists(f) && !fs.existsSync(path.join(root, f)));
    const relatedApi = apis.find((api) => files.some((f) => api.file.startsWith(f.replace('/route.ts', '')) || f.includes(api.file)));
    return [
      action,
      present.map(mdLink).join('<br>') || 'MISSING',
      relatedApi ? `\`${relatedApi.endpoint}\`` : 'MISSING/PARTIAL',
      relatedApi?.request || 'Undetected',
      relatedApi?.packages.join(', ') || 'Undetected',
      relatedApi?.tables.map((t) => `\`${t}\``).join(', ') || 'Undetected',
      relatedApi?.status || 'PARTIAL',
      missing.length ? `Missing expected source: ${missing.join(', ')}` : 'No missing source file from expected path list',
    ];
  });
  return `# Action Map

${table(['User action', 'Component/source file', 'API route', 'Validation schema', 'Engine/package', 'DB table/event target', 'Status', 'Notes'], rows)}
`;
}

function generateMissing(routes, apis) {
  const runtimePageContractsByFile = new Map(runtimeSmokeContracts.authIntentPages.map((contract) => [contract.sourcePath, contract]));
  const critical = [
    ...routes.filter((r) => r.status === 'MISSING').map((r) => [r.app, r.file, `Route ${r.route} has MISSING status`, 'Add/restore page implementation or remove route if obsolete', 'Phase 1']),
    ...apis.filter((a) => a.methods.includes('UNDETECTED')).map((a) => [a.app, a.file, `API ${a.endpoint} has no detectable HTTP method export`, 'Add explicit GET/POST/PATCH/PUT/DELETE export or remove dead route file', 'Phase 1']),
  ];
  const high = [
    ...routes.filter((r) => r.status === 'PARTIAL').map((r) => [r.app, r.file, `Route ${r.route} is partially wired`, 'Review auth/data/API path and complete missing state surfaces', 'Phase 2']),
    ...apis.filter((a) => a.status === 'PARTIAL').map((a) => [a.app, a.file, `API ${a.endpoint} is partially detectable`, 'Document or strengthen auth/schema/service wiring', 'Phase 2']),
  ];
  const authReviewRoutes = routes.filter((r) => r.auth === 'Undetected').slice(0, 40);
  const runtimeCoveredAuth = authReviewRoutes.filter((r) => runtimePageContractsByFile.has(r.file)).map((r) => {
    const contract = runtimePageContractsByFile.get(r.file);
    return [
      r.app,
      r.file,
      `Runtime contract covers auth intent for ${r.route}`,
      `${contract.authIntent}; proof: ${contract.expect}${contract.redirectedTo ? ` -> ${contract.redirectedTo}` : ''}`,
      'Phase 9',
    ];
  });
  const medium = authReviewRoutes
    .filter((r) => !runtimePageContractsByFile.has(r.file))
    .map((r) => [r.app, r.file, `Auth requirement not detectable for ${r.route}`, 'Confirm public/protected intent and document explicitly in code or route docs', 'Phase 3']);
  const low = [['All apps', 'packages/ui and app component files', 'Visual/status conventions still vary on older real pages', 'Gradually migrate pages to shared status/loading/error components', 'Phase 4']];
  const section = (title, rows) => `## ${title}\n\n${rows.length ? table(['App', 'File', 'Problem', 'Required fix', 'Suggested phase'], rows.map((r) => [r[0], mdLink(r[1]), r[2], r[3], r[4]])) : 'No issues detected by scanner.'}\n`;
  return `# Missing Wiring Report

Scanner statuses are conservative. Undetectable wiring is marked for review rather than guessed. Phase 9 runtime contracts move covered auth-intent rows out of unresolved medium review.

${section('CRITICAL', critical)}
${section('HIGH', high)}
${section('RUNTIME-COVERED AUTH INTENT', runtimeCoveredAuth)}
${section('MEDIUM', medium)}
${section('LOW', low)}
`;
}

function generateMaster(routes, apis) {
  const appRouteCounts = apps.map((app) => `${app.name}: ${routes.filter((r) => r.slug === app.slug).length}`).join(', ');
  const appApiCounts = apps.map((app) => `${app.name}: ${apis.filter((a) => a.app === app.name).length}`).join(', ');
  return `# Ridéndine Master Wiring Diagram

## System Diagram

\`\`\`mermaid
flowchart TB
  Web["apps/web customer"] --> WebApi["Customer APIs"]
  Chef["apps/chef-admin"] --> ChefApi["Chef APIs"]
  Driver["apps/driver-app"] --> DriverApi["Driver APIs"]
  Ops["apps/ops-admin"] --> OpsApi["Ops APIs"]
  WebApi --> DB["Supabase DB/Auth"]
  ChefApi --> DB
  DriverApi --> DB
  OpsApi --> DB
  WebApi --> Stripe["Stripe"]
  OpsApi --> Stripe
  DriverApi --> Routing["packages/routing / provider"]
  OpsApi --> Engine["packages/engine"]
  ChefApi --> Engine
  WebApi --> Engine
  DriverApi --> Engine
  Engine --> Types["packages/types"]
  Engine --> Validation["packages/validation"]
\`\`\`

## Route Map

Detected page routes: ${routes.length}. ${appRouteCounts}.

\`\`\`mermaid
flowchart LR
  WebRoutes["apps/web routes"] --> CustomerApis["Customer APIs"]
  ChefRoutes["chef-admin routes"] --> ChefApis["Chef APIs"]
  DriverRoutes["driver-app routes"] --> DriverApis["Driver APIs"]
  OpsRoutes["ops-admin routes"] --> OpsApis["Ops APIs"]
\`\`\`

## API Map

Detected API route files: ${apis.length}. ${appApiCounts}.

\`\`\`mermaid
flowchart TB
  APIs["apps/*/src/app/api"] --> Auth["Auth checks where detected"]
  APIs --> Validation["Schemas / safeParse where detected"]
  APIs --> Engine["Engine/services/packages"]
  APIs --> Tables["Supabase tables/RPCs"]
  APIs --> External["Stripe/routing/Supabase external clients"]
\`\`\`

## Order Lifecycle Map

\`\`\`mermaid
flowchart LR
  Browse --> Cart --> Checkout --> OrdersTable["orders"]
  OrdersTable --> ChefQueue --> Dispatch --> DriverDelivery --> Tracking --> Completed
\`\`\`

## Finance Lifecycle Map

\`\`\`mermaid
flowchart LR
  StripePayment --> OrderPaymentStatus --> Ledger --> ChefPayout --> DriverPayout --> Reconciliation --> Audit
\`\`\`

## Realtime State Map

\`\`\`mermaid
flowchart LR
  EngineEvents --> Sanitizer["public broadcast sanitizer"]
  Sanitizer --> CustomerTracking
  Sanitizer --> OpsLiveBoard
  EngineEvents --> ChefQueue
  EngineEvents --> DriverOfferDeliveryState
\`\`\`

## App Dependency Map

\`\`\`mermaid
flowchart TB
  UI["@ridendine/ui"] --> Web
  UI --> Chef
  UI --> Driver
  UI --> Ops
  DB["@ridendine/db"] --> Web
  DB --> Chef
  DB --> Driver
  DB --> Ops
  Engine["@ridendine/engine"] --> Ops
  Engine --> Web
  Routing["@ridendine/routing"] --> Driver
  Routing --> Ops
\`\`\`
`;
}

function generateHtml(routes, apis) {
  const cards = apps.map((app) => {
    const appRoutes = routes.filter((r) => r.slug === app.slug);
    const appApis = apis.filter((a) => a.app === app.name);
    return `<section class="card"><h2>${app.name}</h2><p>${appRoutes.length} pages · ${appApis.length} APIs</p><ul>${appRoutes.slice(0, 12).map((r) => `<li><span class="${r.status.toLowerCase()}">${r.status}</span> ${r.route}</li>`).join('')}</ul></section>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ridéndine Wiring Viewer</title>
  <style>
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #080b10; color: #e5edf7; }
    main { max-width: 1200px; margin: 0 auto; padding: 32px; }
    h1 { font-size: 40px; margin: 0 0 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    .card { border: 1px solid rgba(255,255,255,.12); background: #111827; border-radius: 18px; padding: 18px; box-shadow: 0 18px 50px rgba(0,0,0,.25); }
    .wired { color: #22c55e; font-weight: 700; }
    .partial { color: #f59e0b; font-weight: 700; }
    .missing { color: #ef4444; font-weight: 700; }
    a { color: #fbbf24; }
    li { margin: 8px 0; }
    pre { overflow: auto; background: #020617; border: 1px solid rgba(255,255,255,.1); border-radius: 14px; padding: 16px; }
  </style>
</head>
<body>
  <main>
    <h1>Ridéndine Wiring Viewer</h1>
    <p>Static index for generated wiring docs. Status colors: <span class="wired">WIRED</span>, <span class="partial">PARTIAL</span>, <span class="missing">MISSING</span>.</p>
    <div class="grid">${cards}</div>
    <section class="card">
      <h2>Documents</h2>
      <p><a href="./ROUTE_INVENTORY.md">Route inventory</a> · <a href="./API_INVENTORY.md">API inventory</a> · <a href="./PAGE_WIRING_MATRIX.md">Page matrix</a> · <a href="./RIDENDINE_MASTER_WIRING_DIAGRAM.md">Master diagram</a></p>
    </section>
    <section class="card">
      <h2>Mermaid Overview</h2>
      <pre>flowchart TB
  Customer --> APIs
  Chef --> APIs
  Driver --> APIs
  Ops --> APIs
  APIs --> Supabase
  APIs --> Engine
  APIs --> Stripe
  Engine --> Realtime</pre>
    </section>
  </main>
</body>
</html>`;
}

function generateCompletion(routes, apis, map) {
  return `# Wiring Completion Report

## Files Created

- \`docs/wiring/ROUTE_INVENTORY.md\`
- \`docs/wiring/API_INVENTORY.md\`
- \`docs/wiring/WIRING_CONTRACTS.md\`
- \`docs/wiring/RUNTIME_CONTRACT_SMOKE.md\`
- \`docs/wiring/DATA_ENGINE_MAP.md\`
- \`docs/wiring/PAGE_WIRING_MATRIX.md\`
- \`docs/wiring/ACTION_MAP.md\`
- \`docs/wiring/links/LINK_WIRING_MATRIX.md\`
- \`docs/wiring/links/API_CALL_MATRIX.md\`
- \`docs/wiring/links/ENVIRONMENT_WIRING_MATRIX.md\`
- \`docs/wiring/MISSING_WIRING_REPORT.md\`
- \`docs/wiring/RIDENDINE_MASTER_WIRING_DIAGRAM.md\`
- \`docs/wiring/index.html\`
- \`docs/wiring/diagrams/*.md\`
- \`docs/architecture/codebase-map/README.md\`
- \`docs/architecture/codebase-map/COMPLETE_CODEBASE_REVIEW.md\`
- \`docs/architecture/codebase-map/apps/*.md\`
- \`docs/architecture/codebase-map/pages/EVERY_PAGE_DOCUMENT.md\`
- \`docs/architecture/codebase-map/pages/*-pages.md\`
- \`docs/architecture/codebase-map/wiring/*.md\`
- \`docs/obsidian/codebase-map/*.md\`
- \`graphify-out/ridendine-codebase-map/graph.json\`
- \`graphify-out/ridendine-codebase-map/nodes.csv\`
- \`graphify-out/ridendine-codebase-map/edges.csv\`

## Diagrams Created

${Object.keys(diagrams).map((d) => `- \`docs/wiring/diagrams/${d}\``).join('\n')}

## Pages Discovered

${routes.length} page routes discovered.

${apps.map((app) => `- ${app.name}: ${routes.filter((r) => r.slug === app.slug).length}`).join('\n')}

## APIs Discovered

${apis.length} API route files discovered.

${apps.map((app) => `- ${app.name}: ${apis.filter((a) => a.app === app.name).length}`).join('\n')}

## Packages Discovered

${scanPackages.map((p) => `- \`${p}\``).join('\n')}

## Database / Engine Sources

- Migration files: ${map.migrationFiles.length}
- Data/engine/type/validation/routing source files scanned: ${map.packageFiles.length}
- Tables/RPC identifiers detected: ${map.tables.length}

## Missing Connections

See \`docs/wiring/MISSING_WIRING_REPORT.md\`. Scanner marks undetectable auth/data wiring as review work instead of guessing.

## Critical Risks

- API route files with no detectable method export are critical if present.
- Finance/admin endpoints should be reviewed manually even when marked WIRED because static scanning cannot prove authorization depth.
- UI-only pages with no detectable API/table use may be static by design or may need data wiring review.

## Recommended Next Build Phases

1. Add explicit route metadata comments for auth role, tables, and API dependencies.
2. Upgrade scanner to read those metadata blocks and reduce false PARTIAL findings.
3. Add route smoke tests for every page listed in \`PAGE_WIRING_MATRIX.md\`.
4. Add API contract tests for every route listed in \`API_INVENTORY.md\`.
5. Review all finance and dispatch actions against RBAC requirements.
`;
}

function findPage(routes, app, target) {
  const candidates = routes.filter((route) => route.slug === app.slug);
  return candidates.find((route) => route.route === removeQueryHash(target))
    || candidates.find((route) => routePatternMatches(route.route, target));
}

function findApi(apis, app, target) {
  const candidates = apis.filter((api) => api.app === app.name);
  return candidates.find((api) => api.endpoint === removeQueryHash(target))
    || candidates.find((api) => routePatternMatches(api.endpoint, target));
}

function resolveTarget(rawTarget, sourceApp, routes, apis, kind) {
  const target = cleanTarget(rawTarget);
  if (!target) {
    return { status: 'UNKNOWN', resolvedApp: sourceApp.name, resolvedFile: '', notes: 'Empty target' };
  }
  if (/^(mailto:|tel:|sms:|#)/i.test(target)) {
    return { status: 'EXTERNAL', resolvedApp: 'external', resolvedFile: '', notes: 'Non-route browser action' };
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) && !/^https?:\/\//i.test(target)) {
    return { status: 'EXTERNAL', resolvedApp: 'browser/runtime', resolvedFile: '', notes: 'Browser runtime target' };
  }
  if (/^https?:\/\//i.test(target) && !appForHost(target)) {
    return { status: 'EXTERNAL', resolvedApp: 'external', resolvedFile: '', notes: 'External URL' };
  }

  const resolved = internalPathFromTarget(target);
  const targetApp = resolved.app || sourceApp;
  const targetPath = targetToPattern(resolved.path);
  if (!targetPath.startsWith('/')) {
    return {
      status: target.includes('${') ? 'UNKNOWN_DYNAMIC' : 'EXTERNAL',
      resolvedApp: targetApp.name,
      resolvedFile: '',
      notes: 'Not an internal route path',
    };
  }

  if (publicAssetExists(targetApp, targetPath)) {
    return {
      status: 'ASSET',
      resolvedApp: targetApp.name,
      resolvedFile: `${targetApp.root}/public${targetPath}`,
      notes: 'Resolves to public asset',
    };
  }

  if (targetPath.startsWith('/api')) {
    const api = findApi(apis, targetApp, targetPath);
    return api
      ? {
          status: api.endpoint === targetPath ? 'WORKING' : 'WORKING_DYNAMIC',
          resolvedApp: targetApp.name,
          resolvedFile: api.file,
          notes: `${kind} resolves to API ${api.endpoint}`,
        }
      : {
          status: target.includes('${') ? 'UNKNOWN_DYNAMIC' : 'BROKEN',
          resolvedApp: targetApp.name,
          resolvedFile: '',
          notes: 'No matching API route file detected',
        };
  }

  const page = findPage(routes, targetApp, targetPath);
  return page
    ? {
        status: page.route === targetPath ? 'WORKING' : 'WORKING_DYNAMIC',
        resolvedApp: targetApp.name,
        resolvedFile: page.file,
        notes: `${kind} resolves to page ${page.route}`,
      }
    : {
        status: target.includes('${') ? 'UNKNOWN_DYNAMIC' : 'BROKEN',
        resolvedApp: targetApp.name,
        resolvedFile: '',
        notes: 'No matching page route file detected',
      };
}

function sourceFilesForApp(app) {
  return walk(app.root, (f) => {
    if (!/\.(ts|tsx|js|jsx)$/.test(f)) return false;
    if (f.includes('/node_modules/') || f.includes('/.next/')) return false;
    if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f) || f.includes('/__tests__/')) return false;
    return true;
  });
}

function sourceKindForFile(app, file) {
  if (file.startsWith(app.appDir) && file.endsWith('/page.tsx')) return 'page';
  if (file.startsWith(app.appDir) && file.endsWith('/route.ts')) return 'api-route';
  if (file.includes('/components/')) return 'component';
  if (file.includes('/lib/')) return 'lib';
  if (file.includes('/hooks/')) return 'hook';
  if (file.endsWith('/middleware.ts')) return 'middleware';
  return 'source';
}

function collectLinksAndCalls(routes, apis) {
  const rows = [];
  for (const app of apps) {
    for (const file of sourceFilesForApp(app)) {
      const text = read(file);
      const sourceKind = sourceKindForFile(app, file);
      for (const link of extractLinks(text)) {
        const resolved = resolveTarget(link.target, app, routes, apis, link.kind);
        rows.push({
          app: app.name,
          sourceKind,
          sourceFile: file,
          kind: link.kind,
          target: link.target,
          ...resolved,
        });
      }
      for (const apiCall of extractApis(text)) {
        const resolved = resolveTarget(apiCall, app, routes, apis, 'fetch');
        rows.push({
          app: app.name,
          sourceKind,
          sourceFile: file,
          kind: 'fetch',
          target: apiCall,
          ...resolved,
        });
      }
    }
  }
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.app}|${row.sourceFile}|${row.kind}|${row.target}|${row.resolvedFile}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => `${a.app}${a.sourceFile}${a.target}`.localeCompare(`${b.app}${b.sourceFile}${b.target}`));
}

function generateLinkMatrix(linkRows) {
  return `# Link Wiring Matrix

Generated from \`href\`, \`router.push\`, \`redirect\`, \`window.location\`, and \`fetch()\` references in app source files.

Status labels:

- \`WORKING\`: exact route/API file exists.
- \`WORKING_DYNAMIC\`: dynamic route/API file exists, such as \`/orders/:id\`.
- \`BROKEN\`: static internal link has no matching page/API route file.
- \`UNKNOWN_DYNAMIC\`: dynamic target cannot be proven by static scan.
- \`ASSET\`: target resolves to an app public asset.
- \`EXTERNAL\`: external URL, browser action, mail, phone, or fragment.

${table(['Status', 'App', 'Source kind', 'Source file', 'Reference kind', 'Target', 'Resolved app', 'Resolved file', 'Notes'], linkRows.map((row) => [
    row.status,
    row.app,
    row.sourceKind,
    mdLink(row.sourceFile),
    row.kind,
    `\`${row.target}\``,
    row.resolvedApp,
    row.resolvedFile ? mdLink(row.resolvedFile) : '',
    row.notes,
  ]))}
`;
}

function generateApiCallMatrix(linkRows) {
  const apiRows = linkRows.filter((row) => row.kind === 'fetch' || row.target.includes('/api'));
  return `# API Call Matrix

This is the client/server caller view of API wiring. The API inventory is the provider view.

${table(['Status', 'Caller app', 'Caller file', 'Target API', 'Resolved API file', 'Notes'], apiRows.map((row) => [
    row.status,
    row.app,
    mdLink(row.sourceFile),
    `\`${row.target}\``,
    row.resolvedFile ? mdLink(row.resolvedFile) : '',
    row.notes,
  ]))}
`;
}

function generateEnvMatrix(routes, apis) {
  const rows = [];
  for (const route of routes) {
    for (const envVar of route.envVars || []) rows.push([envVar, route.app, 'page', mdLink(route.file), `\`${route.route}\``]);
  }
  for (const api of apis) {
    for (const envVar of api.envVars || []) rows.push([envVar, api.app, 'api', mdLink(api.file), `\`${api.endpoint}\``]);
  }
  const sorted = rows.sort((a, b) => `${a[0]}${a[1]}${a[3]}`.localeCompare(`${b[0]}${b[1]}${b[3]}`));
  return `# Environment Wiring Matrix

Generated from \`process.env\` and uppercase env references in page/API source files.

${table(['Variable', 'App', 'Surface', 'File', 'Route/API'], sorted)}
`;
}

function appStatusSummary(app, routes, apis, linkRows) {
  const appRoutes = routes.filter((route) => route.slug === app.slug);
  const appApis = apis.filter((api) => api.app === app.name);
  const appLinks = linkRows.filter((row) => row.app === app.name);
  const broken = appLinks.filter((row) => row.status === 'BROKEN');
  const unknown = appLinks.filter((row) => row.status === 'UNKNOWN_DYNAMIC');
  return {
    appRoutes,
    appApis,
    appLinks,
    broken,
    unknown,
    wiredRoutes: appRoutes.filter((route) => route.status === 'WIRED').length,
    partialRoutes: appRoutes.filter((route) => route.status === 'PARTIAL').length,
    missingRoutes: appRoutes.filter((route) => route.status === 'MISSING').length,
    wiredApis: appApis.filter((api) => api.status === 'WIRED').length,
    partialApis: appApis.filter((api) => api.status === 'PARTIAL').length,
  };
}

function generateStandaloneAppMap(app, routes, apis, linkRows) {
  const summary = appStatusSummary(app, routes, apis, linkRows);
  return `# ${app.name} Standalone Map

## Surface

- Domain: \`${app.domain}\`
- Local development URL: \`${app.local}\`
- Primary users: ${app.role}
- Code root: \`${app.root}\`
- App router root: \`${app.appDir}\`
- Purpose: ${app.purpose}

## Status Summary

- Page routes: ${summary.appRoutes.length} total, ${summary.wiredRoutes} WIRED, ${summary.partialRoutes} PARTIAL, ${summary.missingRoutes} MISSING.
- API route files: ${summary.appApis.length} total, ${summary.wiredApis} WIRED, ${summary.partialApis} PARTIAL.
- Internal link/API references: ${summary.appLinks.length} total, ${summary.broken.length} BROKEN, ${summary.unknown.length} UNKNOWN_DYNAMIC.

## Standalone App Diagram

\`\`\`mermaid
flowchart TB
  classDef app fill:${app.color},stroke:#111827,color:#ffffff
  classDef api fill:#dbeafe,stroke:#2563eb,color:#172033
  classDef data fill:#dcfce7,stroke:#16a34a,color:#172033
  classDef warn fill:#fef3c7,stroke:#f59e0b,color:#172033
  App["${app.name}<br/>${app.domain}"]:::app
  Pages["${summary.appRoutes.length} pages"]:::api
  APIs["${summary.appApis.length} API route files"]:::api
  Shared["Shared packages"]:::data
  DB["Supabase tables/RPCs"]:::data
  External["Stripe / routing / notifications where detected"]:::warn
  App --> Pages
  Pages --> APIs
  APIs --> Shared
  APIs --> DB
  APIs --> External
\`\`\`

## Pages

${table(['Status', 'Route', 'Page file', 'Layout', 'Auth', 'Tables', 'APIs called', 'Components'], summary.appRoutes.map((route) => [
    route.status,
    `\`${route.route}\``,
    mdLink(route.file),
    mdLink(route.layout),
    route.auth,
    route.tables.map((tableName) => `\`${tableName}\``).join(', ') || 'None detected',
    route.apis.map((api) => `\`${api}\``).join(', ') || 'None detected',
    route.components.map((component) => `\`${component}\``).join(', ') || 'None detected',
  ]))}

## APIs

${table(['Status', 'Endpoint', 'Methods', 'File', 'Auth', 'Tables', 'Packages', 'External'], summary.appApis.map((api) => [
    api.status,
    `\`${api.endpoint}\``,
    api.methods.join(', '),
    mdLink(api.file),
    api.auth,
    api.tables.map((tableName) => `\`${tableName}\``).join(', ') || 'None detected',
    api.packages.join(', ') || 'None detected',
    api.external.join(', ') || 'None detected',
  ]))}

## Broken Or Unproven Links

${summary.broken.length || summary.unknown.length
    ? table(['Status', 'Source file', 'Kind', 'Target', 'Notes'], [...summary.broken, ...summary.unknown].map((row) => [
        row.status,
        mdLink(row.sourceFile),
        row.kind,
        `\`${row.target}\``,
        row.notes,
      ]))
    : 'No broken or unknown dynamic internal links detected by the static scanner.'}
`;
}

function fileSafeName(value) {
  return value
    .replace(/^\//, 'root')
    .replace(/[:*?"<>|[\]{}$`\\]/g, '-')
    .replace(/\//g, '__')
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'root';
}

function mermaidLabel(value) {
  return String(value ?? '')
    .replace(/"/g, "'")
    .replace(/\n/g, '<br/>')
    .replace(/\|/g, '/');
}

function pageOutgoing(route, linkRows) {
  return linkRows.filter((row) => row.sourceFile === route.file);
}

function pageIncoming(route, linkRows) {
  return linkRows.filter((row) => row.resolvedFile === route.file);
}

function endpointMethodsForTarget(target, apis, appName) {
  const app = apps.find((candidate) => candidate.name === appName);
  if (!app) return '';
  const resolved = internalPathFromTarget(target);
  const targetApp = resolved.app || app;
  const endpoint = removeQueryHash(resolved.path || target);
  const api = findApi(apis, targetApp, endpoint);
  return api ? api.methods.join(', ') : '';
}

function pageDiagram(route, linkRows) {
  const out = pageOutgoing(route, linkRows);
  const tableNodes = route.tables.slice(0, 7);
  const apiNodes = out.filter((row) => row.target.includes('/api')).slice(0, 7);
  const brokenNodes = out.filter((row) => row.status === 'BROKEN' || row.status === 'UNKNOWN_DYNAMIC').slice(0, 5);
  const componentNodes = route.components.slice(0, 6);

  const lines = [
    'flowchart TB',
    `  Page["${mermaidLabel(route.app)}<br/>${mermaidLabel(route.route)}"]`,
    `  Layout["Layout<br/>${mermaidLabel(route.layout)}"]`,
    `  File["Page file<br/>${mermaidLabel(route.file)}"]`,
    `  Auth["Auth<br/>${mermaidLabel(route.auth)}"]`,
    '  Page --> Layout',
    '  Page --> File',
    '  Page --> Auth',
  ];
  tableNodes.forEach((tableName, index) => {
    lines.push(`  Table${index}["DB table/RPC<br/>${mermaidLabel(tableName)}"]`);
    lines.push(`  Page --> Table${index}`);
  });
  apiNodes.forEach((row, index) => {
    lines.push(`  Api${index}["API/fetch<br/>${mermaidLabel(row.target)}"]`);
    lines.push(`  Page --> Api${index}`);
  });
  componentNodes.forEach((component, index) => {
    lines.push(`  Component${index}["Component/import<br/>${mermaidLabel(component)}"]`);
    lines.push(`  Page --> Component${index}`);
  });
  brokenNodes.forEach((row, index) => {
    lines.push(`  Gap${index}["${mermaidLabel(row.status)}<br/>${mermaidLabel(row.target)}"]`);
    lines.push(`  Page -. review .-> Gap${index}`);
  });
  lines.push('  classDef page fill:#111827,stroke:#111827,color:#ffffff');
  lines.push('  classDef data fill:#dcfce7,stroke:#16a34a,color:#172033');
  lines.push('  classDef api fill:#dbeafe,stroke:#2563eb,color:#172033');
  lines.push('  classDef warn fill:#fef3c7,stroke:#f59e0b,color:#172033');
  lines.push('  class Page page');
  if (tableNodes.length) lines.push(`  class ${tableNodes.map((_, index) => `Table${index}`).join(',')} data`);
  if (apiNodes.length) lines.push(`  class ${apiNodes.map((_, index) => `Api${index}`).join(',')} api`);
  if (brokenNodes.length) lines.push(`  class ${brokenNodes.map((_, index) => `Gap${index}`).join(',')} warn`);
  return lines.join('\n');
}

function generatePageDetail(route, routes, apis, linkRows, headingLevel = 1) {
  const out = pageOutgoing(route, linkRows);
  const incoming = pageIncoming(route, linkRows);
  const titlePrefix = '#'.repeat(headingLevel);
  const broken = out.filter((row) => row.status === 'BROKEN');
  const unknown = out.filter((row) => row.status === 'UNKNOWN_DYNAMIC');
  const apiCalls = out.filter((row) => row.target.includes('/api') || row.kind === 'fetch');
  const navigation = out.filter((row) => !row.target.includes('/api') && row.kind !== 'fetch');
  const app = apps.find((candidate) => candidate.name === route.app);
  const subPrefix = '#'.repeat(Math.min(6, headingLevel + 1));

  return `${titlePrefix} ${route.app}: \`${route.route}\`

${subPrefix} Page Diagram

\`\`\`mermaid
${pageDiagram(route, linkRows)}
\`\`\`

${subPrefix} Actual Page Information

| Field | Value |
| --- | --- |
| App | ${route.app} |
| Domain | \`${app?.domain ?? 'unknown'}\` |
| Route | \`${route.route}\` |
| Status | \`${route.status}\` |
| Auth | ${route.auth} |
| Page file | ${mdLink(route.file)} |
| Layout | ${mdLink(route.layout)} |
| Data source summary | ${route.dataSource} |

${subPrefix} Data And API Wiring

| Type | Details |
| --- | --- |
| DB tables/RPCs | ${route.tables.map((tableName) => `\`${tableName}\``).join(', ') || 'None detected'} |
| Fetch/API calls | ${apiCalls.map((row) => `\`${row.target}\`${endpointMethodsForTarget(row.target, apis, row.app) ? ` (${endpointMethodsForTarget(row.target, apis, row.app)})` : ''}`).join('<br>') || 'None detected'} |
| Shared packages | ${route.packages.join(', ') || 'None detected'} |
| Components/imports | ${route.components.map((component) => `\`${component}\``).join(', ') || 'None detected'} |
| Environment vars | ${route.envVars.map((envVar) => `\`${envVar}\``).join(', ') || 'None detected'} |

${subPrefix} Navigation And Links

${navigation.length ? table(['Status', 'Kind', 'Target', 'Resolved app', 'Resolved file', 'Notes'], navigation.map((row) => [
    row.status,
    row.kind,
    `\`${row.target}\``,
    row.resolvedApp,
    row.resolvedFile ? mdLink(row.resolvedFile) : '',
    row.notes,
  ])) : 'No outgoing page-navigation links detected.'}

${subPrefix} API Calls From This Page

${apiCalls.length ? table(['Status', 'Kind', 'Target', 'Resolved app', 'Resolved file', 'Notes'], apiCalls.map((row) => [
    row.status,
    row.kind,
    `\`${row.target}\``,
    row.resolvedApp,
    row.resolvedFile ? mdLink(row.resolvedFile) : '',
    row.notes,
  ])) : 'No outgoing API/fetch calls detected.'}

${subPrefix} Incoming References

${incoming.length ? table(['Source app', 'Source file', 'Kind', 'Target', 'Status'], incoming.slice(0, 25).map((row) => [
    row.app,
    mdLink(row.sourceFile),
    row.kind,
    `\`${row.target}\``,
    row.status,
  ])) : 'No incoming static references detected.'}

${subPrefix} Review Notes

${[
    broken.length ? `- Broken static references: ${broken.map((row) => `\`${row.target}\``).join(', ')}.` : '',
    unknown.length ? `- Dynamic/unproven references: ${unknown.map((row) => `\`${row.target}\``).join(', ')}.` : '',
    route.status !== 'WIRED' ? `- Page status is ${route.status}; review auth/data/API metadata and runtime behavior.` : '',
    !broken.length && !unknown.length && route.status === 'WIRED' ? '- Static wiring scan did not flag this page, but runtime auth, DB data, and external services still need smoke/e2e proof.' : '',
  ].filter(Boolean).join('\n')}
`;
}

function generateEveryPageDocument(routes, apis, linkRows) {
  const sections = routes.map((route) => generatePageDetail(route, routes, apis, linkRows, 2)).join('\n\n---\n\n');
  return `# Every Page Application Document

This document is generated from the current codebase by \`pnpm docs:wiring\`. It covers every detected Next.js App Router page in the four RideNDine applications.

## Legend

- \`WIRED\`: static scan found a plausible route implementation and no high-confidence missing source.
- \`PARTIAL\`: page exists, but auth/data/API metadata is not fully provable by static scan.
- \`MISSING\`: page exists but looks empty or not meaningfully wired by static scan.
- Link statuses are documented in \`docs/wiring/links/LINK_WIRING_MATRIX.md\`.

## Application Diagram

\`\`\`mermaid
flowchart TB
  Customer["Customer Web<br/>ridendine.ca"] --> Shared["Shared API/package/data layer"]
  Chef["Chef App<br/>chef.ridendine.ca"] --> Shared
  Driver["Driver App<br/>driver.ridendine.ca"] --> Shared
  Ops["Ops Admin<br/>ops.ridendine.ca"] --> Shared
  Ops -. controls .-> Customer
  Ops -. controls .-> Chef
  Ops -. controls .-> Driver
  Shared --> DB["Supabase"]
  Shared --> Stripe["Stripe"]
  Shared --> Routing["Routing/ETA"]
\`\`\`

## Page Index

${table(['App', 'Route', 'Status', 'Page file'], routes.map((route) => [
    route.app,
    `\`${route.route}\``,
    route.status,
    mdLink(route.file),
  ]))}

---

${sections}
`;
}

function generateAppPagesDocument(app, routes, apis, linkRows) {
  const appRoutes = routes.filter((route) => route.slug === app.slug);
  return `# ${app.name} Page Document

Domain: \`${app.domain}\`

Purpose: ${app.purpose}

${appRoutes.map((route) => generatePageDetail(route, routes, apis, linkRows, 2)).join('\n\n---\n\n')}
`;
}

function generateArchitectureReadme(routes, apis, linkRows, map) {
  const linkBroken = linkRows.filter((row) => row.status === 'BROKEN').length;
  const linkUnknown = linkRows.filter((row) => row.status === 'UNKNOWN_DYNAMIC').length;
  return `# RideNDine Complete Codebase Map

Generated by \`pnpm docs:wiring\` from app routes, API routes, package imports, Supabase table references, internal links, fetch calls, env references, and migration files.

## App Split

${table(['App', 'Domain', 'Local URL', 'Users', 'Root', 'Purpose'], apps.map((app) => [
    app.name,
    `\`${app.domain}\``,
    `\`${app.local}\``,
    app.role,
    `\`${app.root}\``,
    app.purpose,
  ]))}

## Global Counts

- App pages detected: ${routes.length}
- API route files detected: ${apis.length}
- Internal/external link and fetch references detected: ${linkRows.length}
- Broken static internal references: ${linkBroken}
- Unknown dynamic references: ${linkUnknown}
- Supabase migration files scanned: ${map.migrationFiles.length}
- Data/engine/package source files scanned: ${map.packageFiles.length}
- Table/RPC identifiers detected: ${map.tables.length}

## Main Map

\`\`\`mermaid
flowchart TB
  classDef customer fill:#dbeafe,stroke:#2563eb,color:#172033
  classDef chef fill:#ffedd5,stroke:#e85d26,color:#172033
  classDef driver fill:#dcfce7,stroke:#059669,color:#172033
  classDef ops fill:#ede9fe,stroke:#7c3aed,color:#172033
  classDef shared fill:#f8fafc,stroke:#475569,color:#172033
  Customer["Customer Web<br/>ridendine.ca"]:::customer
  Chef["Chef App<br/>chef.ridendine.ca"]:::chef
  Driver["Driver App<br/>driver.ridendine.ca"]:::driver
  Ops["Ops Admin<br/>ops.ridendine.ca<br/>controls platform"]:::ops
  APIs["API route layer"]:::shared
  Engine["@ridendine/engine"]:::shared
  DB["@ridendine/db + Supabase"]:::shared
  Stripe["Stripe money movement"]:::shared
  Routing["Routing / ETA"]:::shared
  Customer --> APIs
  Chef --> APIs
  Driver --> APIs
  Ops --> APIs
  APIs --> Engine
  APIs --> DB
  APIs --> Stripe
  APIs --> Routing
  Ops -. platform control .-> Customer
  Ops -. platform control .-> Chef
  Ops -. platform control .-> Driver
\`\`\`

## Where To Look

- App maps: \`docs/architecture/codebase-map/apps/*.md\`
- Every page document: \`docs/architecture/codebase-map/pages/EVERY_PAGE_DOCUMENT.md\`
- Separate wiring/link folder: \`docs/wiring\`
- Architecture mirror of wiring: \`docs/architecture/codebase-map/wiring\`
- Obsidian notes: \`docs/obsidian/codebase-map\`
- Graphify outputs: \`graphify-out/ridendine-codebase-map\`
`;
}

function generateCompleteReview(routes, apis, linkRows, map) {
  const brokenRows = linkRows.filter((row) => row.status === 'BROKEN');
  const unknownRows = linkRows.filter((row) => row.status === 'UNKNOWN_DYNAMIC');
  return `# Complete Codebase Review

## Executive Read

RideNDine is a four-app Next.js monorepo. Ops Admin is the control plane. Customer Web is public/customer-facing. Chef Admin is the chef operating surface. Driver App is the driver operating surface. Shared behavior lives in \`packages/*\`, with Supabase as auth/database, Stripe for payments and payouts, and routing/ETA logic in shared routing/engine services.

## What Is Working By Static Evidence

- Route files exist for all four app surfaces.
- API route files exist for customer, chef, driver, and ops workflows.
- Shared packages are wired into app/API files through \`@ridendine/*\` imports.
- Supabase table/RPC references and migration sources are discoverable from the repo.
- Stripe checkout/webhook/payout/reconciliation source files are present and mapped.
- The internal command center already references wiring docs under \`docs/wiring\`.

## What Is Not Proven Or Needs Review

- Static scans cannot prove runtime auth/RBAC correctness. Finance, dispatch, admin, refund, and payout APIs must still be reviewed/tested manually.
- Dynamic links with template strings can only be matched when the route pattern is obvious.
- External domains are labeled but not network-tested by this generator.
- Pages marked \`PARTIAL\` often have data/API references but no explicit metadata declaring the intended auth/data contract.
- Legal, launch, production readiness, and live payment readiness remain outside this static wiring proof.

## Broken Static Internal Links

${brokenRows.length
    ? table(['App', 'Source file', 'Kind', 'Target', 'Notes'], brokenRows.map((row) => [
        row.app,
        mdLink(row.sourceFile),
        row.kind,
        `\`${row.target}\``,
        row.notes,
      ]))
    : 'No broken static internal links detected by this scan.'}

## Unknown Dynamic Links

${unknownRows.length
    ? table(['App', 'Source file', 'Kind', 'Target', 'Notes'], unknownRows.map((row) => [
        row.app,
        mdLink(row.sourceFile),
        row.kind,
        `\`${row.target}\``,
        row.notes,
      ]))
    : 'No unknown dynamic internal links detected by this scan.'}

## Payment Flow

\`\`\`mermaid
sequenceDiagram
  participant C as Customer Web
  participant Checkout as /api/checkout
  participant Stripe as Stripe
  participant Webhook as Stripe Webhooks
  participant Engine as @ridendine/engine
  participant DB as Supabase
  participant Ops as Ops Finance
  C->>Checkout: cart/address/payment request
  Checkout->>Stripe: create/confirm PaymentIntent
  Checkout->>DB: order + payment metadata
  Stripe->>Webhook: payment/refund/transfer/payout event
  Webhook->>Engine: idempotent finance handler
  Engine->>DB: ledger, payout, reconciliation, audit rows
  Ops->>DB: inspect, refund, payout, reconcile
\`\`\`

## Order And Delivery Flow

\`\`\`mermaid
sequenceDiagram
  participant Customer
  participant Chef
  participant Ops
  participant Driver
  participant Engine
  participant DB
  Customer->>Engine: checkout/order create
  Engine->>DB: order + kitchen queue
  Chef->>Engine: accept / preparing / ready
  Engine->>DB: order state + public stage
  Ops->>Engine: monitor / dispatch / override
  Engine->>Driver: delivery offer
  Driver->>Engine: accept / pickup / delivered
  Engine->>DB: delivery state + tracking + ledger
\`\`\`

## Data Ownership

\`\`\`mermaid
flowchart TB
  Customer["customers, customer_addresses, carts, favorites, orders"] --> CustomerWeb["apps/web"]
  Chef["chef_profiles, chef_storefronts, menu, kitchen, chef_payouts"] --> ChefApp["apps/chef-admin"]
  Driver["drivers, driver_presence, deliveries, driver_payouts"] --> DriverApp["apps/driver-app"]
  Ops["platform_users, audit_logs, ledger, reconciliation, support, settings"] --> OpsApp["apps/ops-admin"]
  OpsApp --> Customer
  OpsApp --> Chef
  OpsApp --> Driver
\`\`\`
`;
}

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers, rows) {
  return [headers.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\n') + '\n';
}

function graphNode(id, label, type, extra = {}) {
  return { id, label, type, ...extra };
}

function generateGraphify(routes, apis, linkRows, map) {
  const nodes = [];
  const edges = [];
  const addNode = (node) => {
    if (!nodes.some((n) => n.id === node.id)) nodes.push(node);
  };
  const addEdge = (from, to, label, status = 'WIRED') => {
    if (!edges.some((e) => e.from === from && e.to === to && e.label === label)) edges.push({ from, to, label, status });
  };

  for (const app of apps) {
    addNode(graphNode(`app:${app.slug}`, app.name, 'app', { domain: app.domain, status: 'WIRED' }));
  }
  for (const route of routes) {
    const routeId = `route:${route.slug}:${route.route}`;
    const fileId = `file:${route.file}`;
    addNode(graphNode(routeId, `${route.app} ${route.route}`, 'page-route', { status: route.status, file: route.file }));
    addNode(graphNode(fileId, route.file, 'file', { status: route.status }));
    addEdge(`app:${route.slug}`, routeId, 'owns route', route.status);
    addEdge(routeId, fileId, 'implemented by', route.status);
    for (const tableName of route.tables) {
      const tableId = `table:${tableName}`;
      addNode(graphNode(tableId, tableName, 'table'));
      addEdge(routeId, tableId, 'reads/writes table', route.status);
    }
    for (const pkg of route.packages) {
      const pkgId = `package:${pkg}`;
      addNode(graphNode(pkgId, pkg, 'package'));
      addEdge(routeId, pkgId, 'imports', route.status);
    }
  }
  for (const api of apis) {
    const slug = apps.find((app) => app.name === api.app)?.slug || api.app;
    const apiId = `api:${slug}:${api.endpoint}`;
    const fileId = `file:${api.file}`;
    addNode(graphNode(apiId, `${api.app} ${api.endpoint}`, 'api-route', { status: api.status, file: api.file, methods: api.methods.join(',') }));
    addNode(graphNode(fileId, api.file, 'file', { status: api.status }));
    addEdge(`app:${slug}`, apiId, 'owns API', api.status);
    addEdge(apiId, fileId, 'implemented by', api.status);
    for (const tableName of api.tables) {
      const tableId = `table:${tableName}`;
      addNode(graphNode(tableId, tableName, 'table'));
      addEdge(apiId, tableId, 'touches table', api.status);
    }
    for (const pkg of api.packages) {
      const pkgId = `package:${pkg}`;
      addNode(graphNode(pkgId, pkg, 'package'));
      addEdge(apiId, pkgId, 'imports', api.status);
    }
    for (const external of api.external) {
      const extId = `external:${external}`;
      addNode(graphNode(extId, external, 'external'));
      addEdge(apiId, extId, 'calls external', api.status);
    }
  }
  for (const tableName of map.tables) addNode(graphNode(`table:${tableName}`, tableName, 'table'));
  for (const row of linkRows) {
    if (!row.resolvedFile) continue;
    addNode(graphNode(`file:${row.sourceFile}`, row.sourceFile, 'file'));
    addNode(graphNode(`file:${row.resolvedFile}`, row.resolvedFile, 'file'));
    addEdge(`file:${row.sourceFile}`, `file:${row.resolvedFile}`, `${row.kind}: ${row.target}`, row.status);
  }

  writeJsonTo(graphifyDir, 'graph.json', { generatedAt: new Date().toISOString(), nodes, edges });
  writeTo(graphifyDir, 'nodes.csv', toCsv(['id', 'label', 'type', 'status', 'file', 'domain', 'methods'], nodes.map((n) => [
    n.id,
    n.label,
    n.type,
    n.status || '',
    n.file || '',
    n.domain || '',
    n.methods || '',
  ])));
  writeTo(graphifyDir, 'edges.csv', toCsv(['from', 'to', 'label', 'status'], edges.map((e) => [e.from, e.to, e.label, e.status])));
  writeTo(graphifyDir, 'README.md', `# Graphify RideNDine Codebase Map

Generated by \`pnpm docs:wiring\`.

- \`graph.json\`: machine-readable nodes and edges.
- \`nodes.csv\`: node export for graph tooling.
- \`edges.csv\`: edge export for graph tooling.
- \`master-graph.md\`: Mermaid entry graph.

## Counts

- Nodes: ${nodes.length}
- Edges: ${edges.length}
`);
  writeTo(graphifyDir, 'master-graph.md', `# Graphify Master Graph

\`\`\`mermaid
flowchart TB
  classDef customer fill:#dbeafe,stroke:#2563eb,color:#172033
  classDef chef fill:#ffedd5,stroke:#e85d26,color:#172033
  classDef driver fill:#dcfce7,stroke:#059669,color:#172033
  classDef ops fill:#ede9fe,stroke:#7c3aed,color:#172033
  classDef shared fill:#f8fafc,stroke:#475569,color:#172033
  Web["Customer Web"]:::customer --> Shared["Shared APIs/packages"]:::shared
  Chef["Chef App"]:::chef --> Shared
  Driver["Driver App"]:::driver --> Shared
  Ops["Ops Admin"]:::ops --> Shared
  Shared --> DB["Supabase DB/Auth"]:::shared
  Shared --> Stripe["Stripe"]:::shared
  Shared --> Routing["Routing/ETA"]:::shared
  Ops -. controls .-> Web
  Ops -. controls .-> Chef
  Ops -. controls .-> Driver
\`\`\`
`);
  return { nodes, edges };
}

function generateObsidian(routes, apis, linkRows, map) {
  writeTo(obsidianDir, '00 Index.md', `# RideNDine Codebase Map

Use this folder as the Obsidian entry point for the repo map.

## App Notes

- [[Customer Web]]
- [[Chef Admin]]
- [[Driver App]]
- [[Ops Admin]]

## Flow Notes

- [[Payment Flow]]
- [[Order Delivery Flow]]
- [[Every Page Document]]
- [[API Wiring]]
- [[Runtime Contract Smoke]]
- [[Link Wiring]]
- [[Database And Engine]]
- [[Known Gaps]]

## Generated Sources

- Canonical wiring docs: \`docs/wiring\`
- Architecture docs: \`docs/architecture/codebase-map\`
- Graphify outputs: \`graphify-out/ridendine-codebase-map\`
`);

  for (const app of apps) {
    writeTo(obsidianDir, `${app.name}.md`, rebaseMdLinks(generateStandaloneAppMap(app, routes, apis, linkRows), '../../../')
      .replace(/^# .+ Standalone Map/, `# ${app.name}`));
  }

  writeTo(obsidianDir, 'Payment Flow.md', `# Payment Flow

\`\`\`mermaid
flowchart LR
  Customer["Customer Web checkout"] --> Stripe["Stripe PaymentIntent"]
  Stripe --> Webhook["Web/Ops Stripe webhook routes"]
  Webhook --> Idempotency["stripe_events_processed"]
  Idempotency --> Ledger["ledger_entries"]
  Ledger --> ChefPayout["chef_payouts / accounts"]
  Ledger --> DriverPayout["driver_payouts / accounts"]
  Ledger --> Reconciliation["stripe_reconciliation"]
  Reconciliation --> Ops["Ops finance/reconciliation"]
\`\`\`

Primary source maps:

- \`docs/architecture/PAYMENT_WORKFLOW_SCHEMATIC.md\`
- \`docs/architecture/payment-workflow-schematic.html\`
- \`docs/wiring/API_INVENTORY.md\`
`);

  writeTo(obsidianDir, 'Order Delivery Flow.md', `# Order Delivery Flow

\`\`\`mermaid
flowchart LR
  Browse["Customer browse/menu"] --> Cart
  Cart --> Checkout
  Checkout --> Order["orders"]
  Order --> Kitchen["Chef order queue"]
  Kitchen --> Ready["ready for pickup"]
  Ready --> Dispatch["Ops/engine dispatch"]
  Dispatch --> Offer["Driver offer"]
  Offer --> Delivery["delivery progression"]
  Delivery --> Complete["delivered + ledger"]
\`\`\`
`);

  writeTo(obsidianDir, 'API Wiring.md', rebaseMdLinks(generateApiInventory(apis), '../../../').replace(/^# API Inventory/, '# API Wiring'));
  writeTo(obsidianDir, 'Wiring Contracts.md', rebaseMdLinks(generateWiringContracts(), '../../../'));
  writeTo(obsidianDir, 'Runtime Contract Smoke.md', rebaseMdLinks(generateRuntimeContractSmoke(), '../../../'));
  writeTo(obsidianDir, 'Link Wiring.md', rebaseMdLinks(generateLinkMatrix(linkRows), '../../../').replace(/^# Link Wiring Matrix/, '# Link Wiring'));
  writeTo(obsidianDir, 'Database And Engine.md', rebaseMdLinks(generateDataEngineMap(map), '../../../').replace(/^# Data And Engine Map/, '# Database And Engine'));
  writeTo(obsidianDir, 'Known Gaps.md', rebaseMdLinks(generateMissing(routes, apis), '../../../').replace(/^# Missing Wiring Report/, '# Known Gaps'));
  writeTo(obsidianDir, 'Every Page Document.md', rebaseMdLinks(generateEveryPageDocument(routes, apis, linkRows), '../../../'));
}

function generateArchitectureDocs(routes, apis, linkRows, map) {
  writeTo(architectureDir, 'README.md', generateArchitectureReadme(routes, apis, linkRows, map));
  writeTo(architectureDir, 'COMPLETE_CODEBASE_REVIEW.md', rebaseMdLinks(generateCompleteReview(routes, apis, linkRows, map), '../../../'));
  writeTo(architectureDir, 'STANDALONE_APPS.md', `# Standalone App Surfaces

${apps.map((app) => `- [${app.name}](apps/${app.slug}.md): ${app.domain} — ${app.purpose}`).join('\n')}
`);
  for (const app of apps) {
    writeTo(architectureDir, `apps/${app.slug}.md`, rebaseMdLinks(generateStandaloneAppMap(app, routes, apis, linkRows), '../../../../'));
    writeTo(architectureDir, `pages/${app.slug}-pages.md`, rebaseMdLinks(generateAppPagesDocument(app, routes, apis, linkRows), '../../../../'));
  }
  writeTo(architectureDir, 'pages/EVERY_PAGE_DOCUMENT.md', rebaseMdLinks(generateEveryPageDocument(routes, apis, linkRows), '../../../../'));
  writeTo(architectureWiringDir, 'LINK_WIRING_MATRIX.md', rebaseMdLinks(generateLinkMatrix(linkRows), '../../../../'));
  writeTo(architectureWiringDir, 'API_CALL_MATRIX.md', rebaseMdLinks(generateApiCallMatrix(linkRows), '../../../../'));
  writeTo(architectureWiringDir, 'ENVIRONMENT_WIRING_MATRIX.md', rebaseMdLinks(generateEnvMatrix(routes, apis), '../../../../'));
  writeTo(architectureWiringDir, 'ROUTE_INVENTORY.md', rebaseMdLinks(generateRouteInventory(routes), '../../../../'));
  writeTo(architectureWiringDir, 'API_INVENTORY.md', rebaseMdLinks(generateApiInventory(apis), '../../../../'));
  writeTo(architectureWiringDir, 'WIRING_CONTRACTS.md', rebaseMdLinks(generateWiringContracts(), '../../../../'));
  writeTo(architectureWiringDir, 'RUNTIME_CONTRACT_SMOKE.md', rebaseMdLinks(generateRuntimeContractSmoke(), '../../../../'));
  writeTo(architectureWiringDir, 'MISSING_WIRING_REPORT.md', rebaseMdLinks(generateMissing(routes, apis), '../../../../'));
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(diagramsDir, { recursive: true });
  const routes = collectRoutes();
  const apis = collectApis();
  const map = collectDbEngine();
  const linkRows = collectLinksAndCalls(routes, apis);

  write('ROUTE_INVENTORY.md', generateRouteInventory(routes));
  write('API_INVENTORY.md', generateApiInventory(apis));
  write('WIRING_CONTRACTS.md', generateWiringContracts());
  write('RUNTIME_CONTRACT_SMOKE.md', generateRuntimeContractSmoke());
  write('DATA_ENGINE_MAP.md', generateDataEngineMap(map));
  write('PAGE_WIRING_MATRIX.md', generatePageMatrix(routes));
  write('ACTION_MAP.md', generateActionMap(apis));
  write('links/LINK_WIRING_MATRIX.md', rebaseMdLinks(generateLinkMatrix(linkRows), '../../../'));
  write('links/API_CALL_MATRIX.md', rebaseMdLinks(generateApiCallMatrix(linkRows), '../../../'));
  write('links/ENVIRONMENT_WIRING_MATRIX.md', rebaseMdLinks(generateEnvMatrix(routes, apis), '../../../'));
  write('MISSING_WIRING_REPORT.md', generateMissing(routes, apis));
  write('RIDENDINE_MASTER_WIRING_DIAGRAM.md', generateMaster(routes, apis));
  write('index.html', generateHtml(routes, apis));
  write('WIRING_COMPLETION_REPORT.md', generateCompletion(routes, apis, map));
  for (const [file, body] of Object.entries(diagrams)) write(path.join('diagrams', file), body);
  generateArchitectureDocs(routes, apis, linkRows, map);
  generateObsidian(routes, apis, linkRows, map);
  const graph = generateGraphify(routes, apis, linkRows, map);

  console.log(`Generated wiring docs: ${routes.length} pages, ${apis.length} API route files, ${linkRows.length} link/fetch references, ${map.tables.length} table/RPC identifiers, ${graph.nodes.length} graph nodes.`);
}

main();
