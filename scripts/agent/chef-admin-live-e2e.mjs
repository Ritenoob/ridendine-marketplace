#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const DEFAULT_ROUTES = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/privacy',
  '/terms',
  '/dashboard',
  '/dashboard/orders',
  '/dashboard/menu',
  '/dashboard/kitchen',
  '/dashboard/storefront',
  '/dashboard/storefront/setup',
  '/dashboard/availability',
  '/dashboard/reviews',
  '/dashboard/customers',
  '/dashboard/payouts',
  '/dashboard/analytics',
  '/dashboard/growth',
  '/dashboard/settings',
];

function readArgs(argv) {
  const args = {
    baseUrl: process.env.CHEF_ADMIN_BASE_URL || 'http://127.0.0.1:3001',
    outDir: '.codex-artifacts',
    routes: DEFAULT_ROUTES,
    clickLimit: 12,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--base-url') args.baseUrl = argv[++i];
    else if (arg === '--out-dir') args.outDir = argv[++i];
    else if (arg === '--routes') args.routes = argv[++i].split(',').map((route) => route.trim()).filter(Boolean);
    else if (arg === '--click-limit') args.clickLimit = Number(argv[++i]);
    else if (arg === '--help') {
      console.log(`Usage: node scripts/agent/chef-admin-live-e2e.mjs [--base-url URL] [--out-dir DIR] [--routes /a,/b] [--click-limit N]`);
      process.exit(0);
    }
  }

  args.baseUrl = args.baseUrl.replace(/\/$/, '');
  return args;
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function slugify(value) {
  return value.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

async function textOrError(locator) {
  try {
    return await locator.innerText({ timeout: 4_000 });
  } catch (error) {
    return `[[TEXT_ERROR: ${error.message}]]`;
  }
}

async function evaluateAll(locator, fn) {
  try {
    return await locator.evaluateAll(fn);
  } catch (error) {
    return [{ error: error.message }];
  }
}

async function collectRoute(page, baseUrl, route, clickLimit) {
  const consoleMessages = [];
  const pageErrors = [];
  const failedRequests = [];
  const httpIssues = [];

  const onConsole = (message) => {
    consoleMessages.push({
      type: message.type(),
      text: message.text().slice(0, 1_200),
    });
  };
  const onPageError = (error) => {
    pageErrors.push({
      message: error.message,
      stack: error.stack?.slice(0, 1_600),
    });
  };
  const onRequestFailed = (request) => {
    failedRequests.push({
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText,
    });
  };
  const onResponse = (response) => {
    if (response.url().startsWith(baseUrl) && response.status() >= 400) {
      httpIssues.push({
        status: response.status(),
        statusText: response.statusText(),
        url: response.url(),
      });
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);

  const requestedUrl = `${baseUrl}${route}`;
  let gotoError = null;
  try {
    await page.goto(requestedUrl, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    await page.waitForTimeout(1_000);
  } catch (error) {
    gotoError = error.message;
  }

  const overlayCount = await page
    .locator('[data-nextjs-dialog], .nextjs-toast-errors-parent, .vite-error-overlay, #webpack-dev-server-client-overlay')
    .count()
    .catch(() => -1);
  const title = await page.title().catch(() => '');
  const bodyText = await textOrError(page.locator('body'));
  const buttons = await evaluateAll(page.locator('button'), (elements) =>
    elements.map((element, index) => ({
      index,
      text: (element.innerText || '').replace(/\s+/g, ' ').trim(),
      aria: element.getAttribute('aria-label'),
      title: element.getAttribute('title'),
      disabled: element.disabled,
      visible: Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length),
    })),
  );
  const links = await evaluateAll(page.locator('a'), (elements) =>
    elements.map((element, index) => ({
      index,
      text: (element.innerText || '').replace(/\s+/g, ' ').trim(),
      aria: element.getAttribute('aria-label'),
      href: element.href,
      target: element.target,
      visible: Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length),
    })),
  );

  const clickResults = [];
  const visibleButtons = buttons.filter((button) => button.visible && !button.disabled).slice(0, clickLimit);
  for (const button of visibleButtons) {
    const name = button.aria || button.title || button.text || `button#${button.index}`;
    if (name.toLowerCase().includes('sign out')) {
      clickResults.push({ button: name, skipped: 'sign-out-click-is-final-only' });
      continue;
    }

    try {
      const before = normalizeText(await textOrError(page.locator('body')));
      await page.locator('button').nth(button.index).click({ timeout: 4_000 });
      await page.waitForTimeout(500);
      const after = normalizeText(await textOrError(page.locator('body')));
      clickResults.push({
        button: name,
        ok: true,
        changedText: before !== after,
        urlAfter: page.url(),
        afterSnippet: after.slice(0, 500),
      });
    } catch (error) {
      clickResults.push({
        button: name,
        ok: false,
        error: error.message.slice(0, 900),
        urlAfter: page.url(),
      });
    }
  }

  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  page.off('requestfailed', onRequestFailed);
  page.off('response', onResponse);

  return {
    route,
    requestedUrl,
    finalUrl: page.url(),
    gotoError,
    title,
    overlayCount,
    bodyLength: bodyText.length,
    bodyText,
    buttons,
    links,
    clickResults,
    consoleMessages,
    pageErrors,
    failedRequests,
    httpIssues,
  };
}

async function collectAuthFlows(page, baseUrl) {
  const snapshots = [];
  const events = [];

  page.on('console', (message) => {
    if (message.type() === 'error') events.push({ kind: 'console', text: message.text().slice(0, 1_200) });
  });
  page.on('requestfailed', (request) => {
    events.push({ kind: 'requestfailed', method: request.method(), url: request.url(), failure: request.failure()?.errorText });
  });
  page.on('response', (response) => {
    if (response.url().startsWith(baseUrl) && response.status() >= 400) {
      events.push({ kind: 'http', status: response.status(), url: response.url(), statusText: response.statusText() });
    }
  });

  async function snapshot(label) {
    snapshots.push({
      label,
      url: page.url(),
      text: await textOrError(page.locator('body')),
    });
  }

  await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email').fill('sean@ridendine.ca').catch(() => {});
  await page.getByLabel('Password').fill('wrong-password').catch(() => {});
  await page.getByLabel('Remember me').check().catch(() => {});
  await page.getByRole('button', { name: 'Sign in' }).click().catch(() => {});
  await page.waitForTimeout(2_000);
  await snapshot('login_wrong_password');

  await page.goto(`${baseUrl}/auth/signup`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('First Name').fill('Codex').catch(() => {});
  await page.getByLabel('Last Name').fill('Tester').catch(() => {});
  await page.getByLabel('Email').fill('codex-test@example.com').catch(() => {});
  await page.getByLabel('Phone').fill('+14165550123').catch(() => {});
  await page.getByLabel(/^Password$/).fill('password123').catch(() => {});
  await page.getByLabel('Confirm Password').fill('different123').catch(() => {});
  const checkboxCount = await page.locator('input[type="checkbox"]').count().catch(() => 0);
  for (let index = 0; index < checkboxCount; index += 1) {
    await page.locator('input[type="checkbox"]').nth(index).check().catch(() => {});
  }
  await page.getByRole('button', { name: 'Create chef account' }).click().catch(() => {});
  await page.waitForTimeout(900);
  await snapshot('signup_password_mismatch');

  await page.goto(`${baseUrl}/auth/forgot-password`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email').fill('sean@ridendine.ca').catch(() => {});
  await page.getByRole('button', { name: 'Send reset link' }).click().catch(() => {});
  await page.waitForTimeout(2_000);
  await snapshot('forgot_password_submit');

  return { snapshots, events };
}

async function collectMobileNav(page, baseUrl) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const before = await textOrError(page.locator('body'));
  await page.getByLabel(/open menu/i).click().catch(() => {});
  await page.waitForTimeout(500);
  const afterOpen = await textOrError(page.locator('body'));
  await page.getByRole('link', { name: /^Orders$/ }).click().catch(() => {});
  await page.waitForTimeout(700);
  const afterNav = await textOrError(page.locator('body'));
  await page.setViewportSize({ width: 1440, height: 1000 });
  return { urlAfterNav: page.url(), before, afterOpen, afterNav };
}

function summarizeMarkdown(report) {
  const lines = [
    `# Chef Admin Live E2E Feedback - ${report.generatedAt}`,
    '',
    `Base URL: \`${report.baseUrl}\``,
    '',
    '## Route Summary',
    '',
    '| Route | Final URL | Status | Notable Evidence |',
    '| --- | --- | --- | --- |',
  ];

  for (const page of report.pages) {
    const issues = [];
    if (page.gotoError) issues.push(`navigation error: ${page.gotoError}`);
    if (page.overlayCount > 0) issues.push(`error overlay: ${page.overlayCount}`);
    if (page.pageErrors.length > 0) issues.push(`page errors: ${page.pageErrors.length}`);
    if (page.httpIssues.length > 0) issues.push(`HTTP issues: ${page.httpIssues.map((issue) => issue.status).join(', ')}`);
    if (page.failedRequests.length > 0) issues.push(`failed requests: ${page.failedRequests.length}`);
    const status = issues.length ? 'Needs attention' : 'Rendered';
    const evidence = issues.length ? issues.join('; ') : normalizeText(page.bodyText).slice(0, 120);
    lines.push(`| \`${page.route}\` | \`${page.finalUrl}\` | ${status} | ${evidence.replaceAll('|', '\\|')} |`);
  }

  lines.push('', '## Auth Flow Snapshots', '');
  for (const snapshot of report.auth.snapshots) {
    lines.push(`### ${snapshot.label}`, '', `URL: \`${snapshot.url}\``, '', '```text', snapshot.text.slice(0, 1_500), '```', '');
  }

  lines.push('## Mobile Navigation', '', `After tapping Orders: \`${report.mobile.urlAfterNav}\``, '');
  lines.push('## Sign Out', '', `Before: \`${report.signOut.beforeUrl}\``, '', `After: \`${report.signOut.afterUrl || 'not-run'}\``, '');
  return lines.join('\n');
}

async function main() {
  const args = readArgs(process.argv);
  fs.mkdirSync(args.outDir, { recursive: true });

  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${slugify(args.baseUrl)}`;
  const jsonPath = path.join(args.outDir, `chef-admin-live-e2e-${runId}.json`);
  const markdownPath = path.join(args.outDir, `chef-admin-live-e2e-${runId}.md`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  const pages = [];
  for (const route of args.routes) {
    pages.push(await collectRoute(page, args.baseUrl, route, args.clickLimit));
  }

  const auth = await collectAuthFlows(page, args.baseUrl);
  const mobile = await collectMobileNav(page, args.baseUrl);

  await page.goto(`${args.baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(700);
  const signOut = { beforeUrl: page.url() };
  try {
    await page.getByRole('button', { name: /sign out/i }).click({ timeout: 5_000 });
    await page.waitForTimeout(900);
    signOut.afterUrl = page.url();
    signOut.body = await textOrError(page.locator('body'));
  } catch (error) {
    signOut.error = error.message;
  }

  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    routes: args.routes,
    pages,
    auth,
    mobile,
    signOut,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(markdownPath, summarizeMarkdown(report));

  const issueCount = pages.reduce(
    (count, pageResult) =>
      count +
      Number(Boolean(pageResult.gotoError)) +
      pageResult.pageErrors.length +
      pageResult.failedRequests.length +
      pageResult.httpIssues.length +
      Number(pageResult.overlayCount > 0),
    0,
  );

  console.log(
    JSON.stringify(
      {
        ok: issueCount === 0,
        issueCount,
        jsonPath,
        markdownPath,
      },
      null,
      2,
    ),
  );

  if (issueCount > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
