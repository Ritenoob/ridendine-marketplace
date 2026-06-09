const assert = require('node:assert/strict');
const test = require('node:test');

const smoke = require('./responsive-production-smoke.cjs');

test('responsive smoke covers all production app surfaces', () => {
  const labels = smoke.TARGETS.map((target) => target.label);

  assert.deepEqual(labels, [
    'Customer web',
    'Ops admin',
    'Chef admin',
    'Driver app',
  ]);
});

test('responsive smoke checks mobile and desktop viewports', () => {
  assert.deepEqual(smoke.VIEWPORTS, {
    mobile: { width: 390, height: 844 },
    desktop: { width: 1440, height: 900 },
  });
});

test('driver target uses the real home route instead of missing dashboard route', () => {
  const driver = smoke.TARGETS.find((target) => target.label === 'Driver app');

  assert.ok(driver);
  assert.equal(driver.url, 'https://driver.ridendine.ca/auth/login?redirect=%2F');
  assert.notEqual(driver.url.includes('%2Fdashboard'), true);
});

test('decorative overflow is ignored only when the page itself does not scroll horizontally', () => {
  assert.equal(
    smoke.isMeaningfulOverflow({
      overflowPx: 0,
      overflowElements: [{ text: 'absolute -top-40 -right-40 h-80 w-80' }],
    }),
    false,
  );
  assert.equal(
    smoke.isMeaningfulOverflow({
      overflowPx: 93,
      overflowElements: [{ tag: 'header', text: 'RideNDine Chef Sign out' }],
    }),
    true,
  );
});
