const assert = require('node:assert/strict');
const test = require('node:test');

const {
  applySampleValues,
  collectRequiredSamples,
  resolveSamplesFromEnv,
} = require('./runtime-sample-fixtures.cjs');

test('collectRequiredSamples finds dynamic route placeholders', () => {
  const samples = collectRequiredSamples([
    { route: '/dashboard/orders/[id]' },
    { endpoint: '/api/support/tickets/[id]' },
  ]);

  assert.deepEqual(samples.sort(), ['id']);
});

test('applySampleValues replaces dynamic segments', () => {
  const result = applySampleValues('/dashboard/orders/[id]', { id: 'order_123' });
  assert.equal(result, '/dashboard/orders/order_123');
});

test('resolveSamplesFromEnv reports configured and missing sample slots', () => {
  const resolved = resolveSamplesFromEnv({
    RIDENDINE_SAMPLE_ORDER_ID: 'order_123',
    RIDENDINE_SAMPLE_CHEF_SLUG: 'sample-chef',
  });

  assert.equal(resolved.samples.orderId, 'order_123');
  assert.equal(resolved.samples.chefSlug, 'sample-chef');
  assert.ok(resolved.missing.some((item) => item.key === 'supportTicketId'));
});
