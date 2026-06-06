const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function generatedDoc(relativePath) {
  return exists(relativePath) ? read(relativePath) : '';
}

function markdownRowsFor(text, token) {
  return text.split('\n').filter((line) => line.startsWith('| ') && line.includes(token));
}

function authIntentReviewFiles() {
  const missingReport = generatedDoc('docs/wiring/MISSING_WIRING_REPORT.md');
  return missingReport
    .split('\n')
    .filter((line) => line.startsWith('| ') && line.includes('Runtime contract covers auth intent'))
    .map((line) => {
      const match = /\]\(\.\.\/\.\.\/([^)]+)\)/.exec(line);
      return match ? match[1].replace(/\\/g, '/') : null;
    })
    .filter(Boolean)
    .sort();
}

function walk(relativeDir, acc = []) {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'dist', 'coverage'].includes(entry.name)) continue;
    const child = path.join(relativeDir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) walk(child, acc);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(child)) acc.push(child);
  }
  return acc;
}

const checks = [
  {
    name: 'runtime Supabase queries use canonical drivers table',
    pass: () => {
      const files = [...walk('apps'), ...walk('packages')];
      return files.every((file) => !read(file).includes(".from('driver_profiles')"));
    },
  },
  {
    name: 'chef legal and password reset routes exist',
    pass: () =>
      exists('apps/chef-admin/src/app/privacy/page.tsx') &&
      exists('apps/chef-admin/src/app/terms/page.tsx') &&
      exists('apps/chef-admin/src/app/auth/forgot-password/page.tsx'),
  },
  {
    name: 'driver legal routes exist',
    pass: () =>
      exists('apps/driver-app/src/app/privacy/page.tsx') &&
      exists('apps/driver-app/src/app/terms/page.tsx'),
  },
  {
    name: 'chef storefront setup route exists',
    pass: () => exists('apps/chef-admin/src/app/dashboard/storefront/setup/page.tsx'),
  },
  {
    name: 'driver upload API route exists',
    pass: () => exists('apps/driver-app/src/app/api/upload/route.ts'),
  },
  {
    name: 'chef public storefront links point at customer web',
    pass: () => {
      const source = read('apps/chef-admin/src/app/dashboard/page.tsx');
      return !source.includes('href={`/chefs/${storefront.slug}`}') &&
        source.includes('https://ridendine.ca/chefs/${storefront.slug}');
    },
  },
  {
    name: 'wiring docs classify finance account detail pages as implemented',
    pass: () => {
      const routeInventory = generatedDoc('docs/wiring/ROUTE_INVENTORY.md');
      const chefRows = markdownRowsFor(routeInventory, '`/dashboard/finance/accounts/chefs/:id`');
      const driverRows = markdownRowsFor(routeInventory, '`/dashboard/finance/accounts/drivers/:id`');
      return chefRows.length === 1 &&
        driverRows.length === 1 &&
        chefRows[0].endsWith('| WIRED |') &&
        driverRows[0].endsWith('| WIRED |');
    },
  },
  {
    name: 'wiring docs do not mark known guarded API routes missing',
    pass: () => {
      const apiInventory = generatedDoc('docs/wiring/API_INVENTORY.md');
      const knownGuardedRoutes = [
        '`/api/deliveries/:id`',
        '`/api/engine/payouts/preview`',
        '`/api/internal/command-center/change-requests`',
        '`/api/payouts/request`',
      ];
      return knownGuardedRoutes.every((route) => {
        const routeRows = markdownRowsFor(apiInventory, route);
        return routeRows.length > 0 && routeRows.every((line) => !line.endsWith('| MISSING |'));
      });
    },
  },
  {
    name: 'wiring docs have no unexplained partial page or API statuses',
    pass: () => {
      const routeInventory = generatedDoc('docs/wiring/ROUTE_INVENTORY.md');
      const pageMatrix = generatedDoc('docs/wiring/PAGE_WIRING_MATRIX.md');
      const apiInventory = generatedDoc('docs/wiring/API_INVENTORY.md');
      const missingReport = generatedDoc('docs/wiring/MISSING_WIRING_REPORT.md');
      return !markdownRowsFor(routeInventory, '| PARTIAL |').length &&
        !markdownRowsFor(pageMatrix, '| PARTIAL |').length &&
        !markdownRowsFor(apiInventory, '| PARTIAL |').length &&
        !missingReport.includes(' is partially wired') &&
        !missingReport.includes(' is partially detectable');
    },
  },
  {
    name: 'phase 9 runtime contracts cover every auth-intent review row',
    pass: () => {
      const { authIntentPages, publicJsonApis, protectedJsonApis } = require(path.join(root, 'scripts/smoke/runtime-contracts.cjs'));
      const reviewFiles = authIntentReviewFiles();
      const contractFiles = authIntentPages.map((contract) => contract.sourcePath).sort();
      const missingReport = generatedDoc('docs/wiring/MISSING_WIRING_REPORT.md');
      return reviewFiles.length === 17 &&
        JSON.stringify(reviewFiles) === JSON.stringify(contractFiles) &&
        !missingReport.includes('Auth requirement not detectable') &&
        publicJsonApis.length >= 7 &&
        protectedJsonApis.length >= 10;
    },
  },
  {
    name: 'phase 9 runtime contract docs are generated in all mirrors',
    pass: () =>
      exists('docs/wiring/RUNTIME_CONTRACT_SMOKE.md') &&
      exists('docs/architecture/codebase-map/wiring/RUNTIME_CONTRACT_SMOKE.md') &&
      exists('docs/obsidian/codebase-map/Runtime Contract Smoke.md'),
  },
];

const failures = checks.filter((check) => !check.pass());

if (failures.length) {
  console.error('Known wiring fix checks failed:');
  for (const failure of failures) console.error(`- ${failure.name}`);
  process.exit(1);
}

console.log(`Known wiring fix checks passed: ${checks.length}/${checks.length}`);
