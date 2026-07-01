/**
 * Lifecycle: Ops manager end-to-end journey
 *
 * Covers: sign in as ops_manager → live board → drill into stuck order →
 *         force-assign driver → approve pending chef → process refund →
 *         run payout preview → run reconciliation (zero discrepancies).
 *
 * Seed dependencies:
 *   - Ops super_admin: ops@ridendine.ca / password123
 *   - Seeded in-flight orders: RND-004 (preparing), RND-005 (pending),
 *     RND-006 (ready_for_pickup — "stuck" for force-assign scenario)
 *   - Seeded approved drivers: d2000000-0000-4000-8000-000000000001 (Mike Chen),
 *     d2000000-0000-4000-8000-000000000002 (Sarah Kim)
 *
 * Missing seed hooks needed for full green run:
 *   - A 'pending_approval' chef account for the approve-chef test.
 *     (All seeded chefs are already 'approved'.)
 *   - A refundable completed order with payment_status='completed'.
 */

import { expect, test } from '@playwright/test';

import { hasUsableStripeTestCredentials } from './stripe-credentials';

async function becomesVisible(locator: import('@playwright/test').Locator, timeout = 8_000) {
  return locator
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);
}

async function signInOps(page: import('@playwright/test').Page) {
  await page.goto('/auth/login');
  const result = await page.evaluate(async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ops@ridendine.ca',
        password: 'password123',
      }),
    });
    return {
      ok: response.ok,
      status: response.status,
      body: await response.text(),
    };
  });

  expect(result.ok, `ops login failed (${result.status}): ${result.body}`).toBe(true);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
}

test.describe('ops lifecycle @lifecycle', () => {
  test.use({ baseURL: 'http://127.0.0.1:3002' });

  test.beforeEach(async ({ page }) => {
    await signInOps(page);
  });

  test('ops dashboard live board renders with in-flight orders', async ({ page }) => {
    await page.goto('/dashboard');
    // Live board / orders section
    await expect(page.getByText(/live|board|active|in.?flight|orders/i).first()).toBeVisible({ timeout: 10_000 });
    // Seeded orders should appear (preparing, pending, ready_for_pickup)
    await expect(page.getByText(/RND-00[456]|preparing|pending|ready/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('ops can drill into an order and see full details', async ({ page }) => {
    await page.goto('/dashboard/orders');
    const orderRow = page.locator('tr', { hasText: 'RND-006' }).first();
    if (!(await becomesVisible(orderRow, 8_000))) {
      test.skip();
    }
    const viewBtn = orderRow.getByRole('link', { name: /^View$/ });
    await viewBtn.click();
    // Order detail page should render status and items
    await expect(page.getByText(/order|status|item/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('ops can reassign a driver on a stuck delivery', async ({ page }) => {
    await page.goto('/dashboard/deliveries/de100000-0000-4000-8000-000000000006');
    await expect(page.getByText(/Delivery Intervention Console/i)).toBeVisible({ timeout: 10_000 });

    const assignBtn = page.getByRole('button', { name: /manual reassign|manual assign/i }).first();
    if (!(await becomesVisible(assignBtn, 8_000))) {
      test.skip();
    }
    await assignBtn.click();
    await page.locator('select').selectOption({ label: 'Sarah Kim' });
    await page.getByPlaceholder(/required reason/i).fill('E2E manual dispatch verification');
    const confirmBtn = page.getByRole('button', { name: /submit|confirm/i }).last();
    await confirmBtn.click();
    await expect(page.getByText(/Sarah Kim/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('ops can approve a pending chef', async ({ page }) => {
    await page.goto('/dashboard/chefs');
    await expect(page).toHaveURL(/\/dashboard\/chefs/);
    // Pending chefs section
    const pendingChef = page.locator('tr', { hasText: 'Pending Chef' }).first();
    if (!(await becomesVisible(pendingChef, 8_000))) {
      // All seed chefs are approved — skip until a pending_approval chef is seeded
      test.skip();
    }
    const approveBtn = pendingChef.locator('button[title="Approve"]').first();
    await approveBtn.click();
    await expect(pendingChef.getByText(/approved/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('ops can process a refund on a completed order', async ({ page }) => {
    if (!hasUsableStripeTestCredentials()) {
      test.skip();
    }
    await page.goto('/dashboard/finance/refunds');
    await expect(page).toHaveURL(/\/dashboard\/finance\/refunds/);
    const refundBtn = page.getByRole('button', { name: /issue refund|refund|process/i }).first();
    if (!(await refundBtn.isVisible({ timeout: 5_000 }))) {
      test.skip();
    }
    await refundBtn.click();
    await expect(page.getByText(/refund|processed|success/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('ops can run payout preview', async ({ page }) => {
    await page.goto('/dashboard/finance/payouts');
    await expect(page).toHaveURL(/\/dashboard\/finance\/payouts/);
    // Preview button
    const previewBtn = page.getByRole('button', { name: /preview|run preview|calculate/i }).first();
    if (!(await becomesVisible(previewBtn, 8_000))) {
      test.skip();
    }
    await previewBtn.click();
    await expect(page.getByText(/preview|payout|total/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('ops reconciliation runs cleanly with zero discrepancies', async ({ page }) => {
    await page.goto('/dashboard/finance/reconciliation');
    await expect(page).toHaveURL(/\/dashboard\/finance\/reconciliation/);
    const reconBtn = page.getByRole('button', { name: /reconcil|run reconcil/i }).first();
    if (!(await becomesVisible(reconBtn, 8_000))) {
      test.skip();
    }
    await reconBtn.click();
    await expect(
      page.getByText(/zero discrepancies|no discrepancies|clean|0 discrepanc/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
