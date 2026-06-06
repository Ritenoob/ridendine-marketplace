const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');

function missingReportAuthIntentFiles() {
  const report = fs.readFileSync(path.join(root, 'docs/wiring/MISSING_WIRING_REPORT.md'), 'utf8');
  return report
    .split(/\r?\n/)
    .filter((line) => line.startsWith('| ') && line.includes('Runtime contract covers auth intent'))
    .map((line) => {
      const match = /\]\(\.\.\/\.\.\/([^)]+)\)/.exec(line);
      assert.ok(match, `Expected markdown link in missing wiring row: ${line}`);
      return match[1].replace(/\\/g, '/');
    })
    .sort();
}

test('auth intent page contracts cover every runtime-covered auth review row', () => {
  const { authIntentPages } = require('./runtime-contracts.cjs');
  const contractedFiles = authIntentPages.map((contract) => contract.sourcePath).sort();

  assert.equal(authIntentPages.length, 17);
  assert.deepEqual(contractedFiles, missingReportAuthIntentFiles());
});

test('auth intent page contracts classify public and protected routes explicitly', () => {
  const { authIntentPages } = require('./runtime-contracts.cjs');
  const intents = new Set(authIntentPages.map((contract) => contract.authIntent));
  const apps = new Set(authIntentPages.map((contract) => contract.app));

  assert.deepEqual(intents, new Set(['protected', 'public']));
  assert.ok(apps.has('customer'));
  assert.ok(apps.has('chef'));
  assert.ok(apps.has('ops'));
  assert.equal(authIntentPages.filter((contract) => contract.authIntent === 'protected').length, 11);
  assert.equal(authIntentPages.filter((contract) => contract.authIntent === 'public').length, 6);
  assert.deepEqual(
    authIntentPages.find((contract) => contract.sourcePath === 'apps/web/src/app/order-confirmation/[orderId]/page.tsx'),
    {
      kind: 'page',
      app: 'customer',
      path: '/order-confirmation/phase-9-smoke-order',
      sourcePath: 'apps/web/src/app/order-confirmation/[orderId]/page.tsx',
      authIntent: 'public',
      expect: 'redirect',
      redirectedTo: '/orders/phase-9-smoke-order/confirmation',
      note: 'Legacy route is a public redirect shim; canonical /orders/:id/confirmation is protected.',
    }
  );
});

test('API runtime contracts include public JSON and protected JSON checks', () => {
  const { publicJsonApis, protectedJsonApis, allRuntimeContracts } = require('./runtime-contracts.cjs');

  assert.ok(publicJsonApis.length >= 7, 'expected public health and marketplace JSON contracts');
  assert.ok(protectedJsonApis.length >= 10, 'expected protected JSON contracts for auth rejection checks');
  assert.ok(publicJsonApis.every((contract) => contract.expect === 'json'));
  assert.ok(protectedJsonApis.every((contract) => contract.expect === 'json'));
  assert.ok(protectedJsonApis.every((contract) => contract.authIntent === 'protected'));
  assert.equal(
    allRuntimeContracts.length,
    publicJsonApis.length + protectedJsonApis.length + require('./runtime-contracts.cjs').authIntentPages.length
  );
});
