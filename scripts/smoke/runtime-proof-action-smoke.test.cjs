const assert = require('node:assert/strict');
const test = require('node:test');

const {
  selectProofActions,
  summarizeProofActionResults,
} = require('./runtime-proof-action-smoke.cjs');

test('selectProofActions picks only requested page buckets', () => {
  const selected = selectProofActions({
    disposition: {
      pages: [
        { route: '/', proofCovered: false, proofDisposition: { nextProofAction: 'public-page-smoke' } },
        { route: '/dashboard', proofCovered: false, proofDisposition: { nextProofAction: 'login-guard-page-smoke' } },
        { route: '/api/orders', proofCovered: false, proofDisposition: { nextProofAction: 'authenticated-json-smoke' } },
      ],
      apis: [],
    },
    buckets: ['public-page-smoke', 'login-guard-page-smoke'],
  });

  assert.deepEqual(selected.map((item) => item.route), ['/', '/dashboard']);
});

test('summarizeProofActionResults fails when one result fails', () => {
  const summary = summarizeProofActionResults([
    { ok: true, bucket: 'public-page-smoke' },
    { ok: false, bucket: 'login-guard-page-smoke', message: 'not guarded' },
  ]);

  assert.equal(summary.ok, false);
  assert.equal(summary.failures.length, 1);
});
