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

test('customer target verifies the ordering-first hero headline', () => {
  const customer = smoke.TARGETS.find((target) => target.label === 'Customer web');

  assert.ok(customer);
  assert.equal(customer.requiredHeading, 'Find chef-made meals near you.');
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

test('responsive smoke isolates each target in a fresh page', async () => {
  const playwright = require('@playwright/test');
  const originalLaunch = playwright.chromium.launch;
  let newPageCount = 0;

  class FakePage {
    constructor(viewport) {
      this.currentUrl = 'about:blank';
      this.viewport = viewport;
    }

    removeAllListeners() {}

    on() {}

    async goto(url) {
      this.currentUrl = url;
    }

    async waitForLoadState() {}

    async waitForTimeout() {}

    locator() {
      return {
        count: async () => 0,
        fill: async () => {},
      };
    }

    getByText() {
      return {
        waitFor: async () => {},
      };
    }

    async evaluate() {
      return {
        url: this.currentUrl,
        title: 'Smoke Test',
        viewportWidth: this.viewport.width,
        scrollWidth: this.viewport.width,
        overflowPx: 0,
        overflowElements: [],
        headings: smoke.TARGETS.map((target) => target.requiredHeading).filter(Boolean),
        visibleButtons: 0,
        visibleNavLinks: 0,
      };
    }

    url() {
      return this.currentUrl;
    }

    async close() {}
  }

  const fakeBrowser = {
    async newContext({ viewport }) {
      return {
        async newPage() {
          newPageCount += 1;
          return new FakePage(viewport);
        },
        async close() {},
      };
    },
    async close() {},
  };

  playwright.chromium.launch = async () => fakeBrowser;

  try {
    await smoke.runResponsiveSmoke();
  } finally {
    playwright.chromium.launch = originalLaunch;
  }

  assert.equal(newPageCount, smoke.TARGETS.length * Object.keys(smoke.VIEWPORTS).length);
});
