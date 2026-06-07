const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '../..');

test('dispositions every remaining page proof gap', () => {
  const { collectProofDisposition } = require('./runtime-proof-disposition.cjs');
  const summary = collectProofDisposition({ root: repoRoot });

  assert.equal(summary.pageTotals.total, 90);
  assert.equal(summary.pageTotals.proofCovered, 17);
  assert.equal(summary.pageTotals.dispositionedGaps, 73);
  assert.equal(summary.pageTotals.unresolved, 0);

  const chefLogin = summary.pages.find((page) => page.app === 'chef' && page.route === '/auth/login');
  assert.equal(chefLogin.proofCovered, false);
  assert.equal(chefLogin.proofDisposition.nextProofAction, 'public-page-smoke');

  const opsDashboard = summary.pages.find((page) => page.app === 'ops' && page.route === '/dashboard');
  assert.equal(opsDashboard.proofCovered, false);
  assert.equal(opsDashboard.proofDisposition.nextProofAction, 'login-guard-page-smoke');

  const opsCustomerDetail = summary.pages.find((page) => page.app === 'ops' && page.route === '/dashboard/customers/[id]');
  assert.equal(opsCustomerDetail.proofDisposition.nextProofAction, 'already-covered');
  assert.equal(opsCustomerDetail.proofDisposition.recommendedProofAction, 'sampled-login-guard-page-smoke');
});

test('dispositions every remaining API proof gap', () => {
  const { collectProofDisposition } = require('./runtime-proof-disposition.cjs');
  const summary = collectProofDisposition({ root: repoRoot });

  assert.equal(summary.apiTotals.total, 120);
  assert.equal(summary.apiTotals.proofCovered, 46);
  assert.equal(summary.apiTotals.dispositionedGaps, 74);
  assert.equal(summary.apiTotals.unresolved, 0);

  const customerLogin = summary.apis.find((api) => api.app === 'customer' && api.endpoint === '/api/auth/login');
  assert.equal(customerLogin.proofCovered, false);
  assert.equal(customerLogin.proofDisposition.nextProofAction, 'auth-entry-contract');

  const stripeWebhook = summary.apis.find((api) => api.app === 'ops' && api.endpoint === '/api/stripe/webhook');
  assert.equal(stripeWebhook.proofCovered, true);
  assert.equal(stripeWebhook.proofDisposition.nextProofAction, 'already-covered');
  assert.equal(stripeWebhook.proofDisposition.recommendedProofAction, 'signature-contract');

  const checkout = summary.apis.find((api) => api.app === 'customer' && api.endpoint === '/api/checkout');
  assert.equal(checkout.proofCovered, false);
  assert.equal(checkout.proofDisposition.nextProofAction, 'negative-authz-contract');
});

test('generates markdown proof disposition docs with zero unresolved gaps', () => {
  const {
    collectProofDisposition,
    generateMarkdown,
  } = require('./runtime-proof-disposition.cjs');
  const markdown = generateMarkdown(collectProofDisposition({ root: repoRoot }));

  assert.ok(markdown.includes('# Runtime Proof Disposition'));
  assert.ok(markdown.includes('| Pages | 90 | 17 | 73 | 73 | 0 |'));
  assert.ok(markdown.includes('| API route handlers | 120 | 46 | 74 | 74 | 0 |'));
  assert.ok(markdown.includes('## Page Proof Gap Disposition'));
  assert.ok(markdown.includes('## API Proof Gap Disposition'));
});

