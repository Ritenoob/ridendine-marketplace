const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '../..');

test('converts app router files to runtime routes and endpoints', () => {
  const { routeFromFile } = require('./runtime-coverage-audit.cjs');

  assert.equal(
    routeFromFile('apps/web', 'apps/web/src/app/account/favorites/page.tsx', 'page'),
    '/account/favorites'
  );
  assert.equal(
    routeFromFile('apps/ops-admin', 'apps/ops-admin/src/app/api/orders/[id]/refund/route.ts', 'api'),
    '/api/orders/[id]/refund'
  );
  assert.equal(
    routeFromFile('apps/ops-admin', 'apps/ops-admin/src/app/(control)/page.tsx', 'page'),
    '/'
  );
});

test('discovers page and API surfaces across all four apps', () => {
  const { discoverRuntimeSurfaces } = require('./runtime-coverage-audit.cjs');
  const inventory = discoverRuntimeSurfaces({ root: repoRoot });
  const appKeys = [...new Set([...inventory.pages, ...inventory.apis].map((item) => item.app))].sort();

  assert.deepEqual(appKeys, ['chef', 'customer', 'driver', 'ops']);
  assert.ok(inventory.pages.length >= 90);
  assert.ok(inventory.apis.length >= 118);
  assert.ok(inventory.pages.some((page) => page.file === 'apps/chef-admin/src/app/dashboard/availability/page.tsx'));
  assert.ok(inventory.apis.some((api) => api.file === 'apps/ops-admin/src/app/api/team/route.ts'));
});

test('maps discovered surfaces to existing runtime contract sources', () => {
  const { collectRuntimeCoverage } = require('./runtime-coverage-audit.cjs');
  const summary = collectRuntimeCoverage({ root: repoRoot });

  assert.equal(summary.ok, true);
  assert.ok(summary.totals.pages.total >= 90);
  assert.ok(summary.totals.apis.total >= 118);
  assert.equal(summary.totals.pages.covered, summary.totals.pages.total);
  assert.equal(summary.totals.apis.covered, summary.totals.apis.total);

  const chefAvailability = summary.coverage.pages.find(
    (page) => page.file === 'apps/chef-admin/src/app/dashboard/availability/page.tsx'
  );
  assert.ok(chefAvailability.covered);
  assert.ok(chefAvailability.coverageSources.includes('runtime-page-auth-intent'));
  assert.ok(chefAvailability.coverageSources.includes('runtime-page-classification'));
  assert.ok(chefAvailability.proofSources.includes('runtime-page-auth-intent'));

  const chefOrders = summary.coverage.apis.find((api) => api.app === 'chef' && api.endpoint === '/api/orders');
  assert.ok(chefOrders.covered);
  assert.ok(chefOrders.coverageSources.includes('runtime-authenticated-json'));
  assert.ok(chefOrders.coverageSources.includes('live-role-fixture'));
  assert.ok(chefOrders.coverageSources.includes('runtime-api-classification'));
  assert.ok(chefOrders.proofSources.includes('runtime-authenticated-json'));

  const opsFinance = summary.coverage.apis.find((api) => api.app === 'ops' && api.endpoint === '/api/engine/finance');
  assert.ok(opsFinance.covered);
  assert.ok(opsFinance.coverageSources.includes('live-role-fixture'));
  assert.ok(opsFinance.coverageSources.includes('non-admin-role-fixture'));
  assert.ok(opsFinance.coverageSources.includes('runtime-api-classification'));
  assert.ok(opsFinance.proofSources.includes('live-role-fixture'));

  assert.equal(summary.gaps.pages.length, 0);
  assert.equal(summary.gaps.apis.length, 0);
  assert.ok(summary.proofGaps.pages.length > 0);
  assert.ok(summary.proofGaps.apis.length > 0);
});

test('generates markdown coverage docs with page and API gap sections', () => {
  const {
    collectRuntimeCoverage,
    generateMarkdown,
  } = require('./runtime-coverage-audit.cjs');
  const markdown = generateMarkdown(collectRuntimeCoverage({ root: repoRoot }));

  assert.ok(markdown.includes('# Runtime Coverage Audit'));
  assert.ok(markdown.includes('## Uncovered Pages'));
  assert.ok(markdown.includes('## Uncovered API Route Files'));
  assert.ok(markdown.includes('## Page Proof Gaps'));
  assert.ok(markdown.includes('## API Proof Gaps'));
  assert.ok(markdown.includes('Phase 17 coverage inventory'));
});
