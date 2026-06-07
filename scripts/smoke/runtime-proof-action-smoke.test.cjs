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

test('selectProofActions picks authenticated and public JSON API buckets', () => {
  const selected = selectProofActions({
    disposition: {
      pages: [],
      apis: [
        { endpoint: '/api/health', proofCovered: false, proofDisposition: { nextProofAction: 'public-json-smoke' } },
        { endpoint: '/api/profile', proofCovered: false, proofDisposition: { nextProofAction: 'authenticated-json-smoke' } },
        { endpoint: '/api/orders/[id]', proofCovered: false, proofDisposition: { nextProofAction: 'sampled-authenticated-json-smoke' } },
        { endpoint: '/api/checkout', proofCovered: false, proofDisposition: { nextProofAction: 'negative-authz-contract' } },
      ],
    },
    buckets: ['public-json-smoke', 'authenticated-json-smoke', 'sampled-authenticated-json-smoke'],
  });

  assert.deepEqual(selected.map((item) => item.endpoint), [
    '/api/health',
    '/api/profile',
    '/api/orders/[id]',
  ]);
});

test('selectProofActions picks contract-only API buckets', () => {
  const selected = selectProofActions({
    disposition: {
      pages: [],
      apis: [
        { endpoint: '/api/auth/login', proofDisposition: { nextProofAction: 'auth-entry-contract' } },
        { endpoint: '/api/stripe/webhook', proofDisposition: { nextProofAction: 'signature-contract' } },
        { endpoint: '/api/internal/command-center/change-requests', proofDisposition: { nextProofAction: 'command-center-contract' } },
        { endpoint: '/api/health', proofDisposition: { nextProofAction: 'public-json-smoke' } },
      ],
    },
    buckets: ['auth-entry-contract', 'signature-contract', 'command-center-contract'],
  });

  assert.deepEqual(selected.map((item) => item.endpoint), [
    '/api/auth/login',
    '/api/stripe/webhook',
    '/api/internal/command-center/change-requests',
  ]);
});
