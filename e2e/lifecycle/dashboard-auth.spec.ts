import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function postJson(page: Page, url: string, body: Record<string, unknown>) {
  return page.evaluate(
    async ({ url: requestUrl, body: requestBody }) => {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });
      return {
        ok: response.ok,
        status: response.status,
        body: await response.text(),
      };
    },
    { url, body }
  );
}

async function signInWithForm(page: Page, baseUrl: string, email: string) {
  await page.goto(`${baseUrl}/auth/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });
}

async function signInViaApi(page: Page, baseUrl: string, email: string) {
  await page.goto(`${baseUrl}/auth/login`);
  const result = await postJson(page, '/api/auth/login', {
    email,
    password: 'password123',
  });
  expect(result.ok, `${email} login failed (${result.status}): ${result.body}`).toBe(true);
}

test.describe('authenticated dashboard surfaces @lifecycle', () => {
  test('customer account dashboard opens an order detail', async ({ page }) => {
    await signInWithForm(page, 'http://127.0.0.1:3000', 'alice@example.com');

    await page.goto('http://127.0.0.1:3000/account/orders');
    await expect(page.getByText(/orders|order history|RND-001|delivered/i).first()).toBeVisible({
      timeout: 10_000,
    });

    const detailLink = page
      .getByRole('link', { name: /view|track|details|RND-001/i })
      .first();
    await expect(detailLink).toBeVisible({ timeout: 10_000 });
    await detailLink.click();
    await expect(page).toHaveURL(/\/orders\//, { timeout: 10_000 });
    await expect(page.getByText(/order|status|delivered|tracking/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('chef dashboard opens live order management', async ({ page }) => {
    await signInWithForm(page, 'http://127.0.0.1:3001', 'sean@ridendine.ca');

    await page.goto('http://127.0.0.1:3001/dashboard');
    await expect(page.getByText(/chef operating dashboard|action queue/i).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('link', { name: /open live orders|manage/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/orders|\/dashboard\/menu/, { timeout: 10_000 });
    await expect(page.getByText(/orders|menu|kitchen|status/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('driver dashboard toggles shift state', async ({ page }) => {
    await signInViaApi(page, 'http://127.0.0.1:3003', 'mike.driver@ridendine.ca');

    await page.goto('http://127.0.0.1:3003/');
    await expect(page.getByText(/driver command center|work dashboard|today/i).first()).toBeVisible({
      timeout: 15_000,
    });

    const toggle = page.getByTestId('driver-online-toggle').first();
    await expect(toggle).toBeVisible({ timeout: 10_000 });
    await toggle.click();
    await expect(page.getByText(/online|offline|available|on shift/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('ops dashboard opens order operations detail', async ({ page }) => {
    await signInViaApi(page, 'http://127.0.0.1:3002', 'ops@ridendine.ca');

    await page.goto('http://127.0.0.1:3002/dashboard');
    await expect(page.getByText(/live|board|active|orders|in.?flight/i).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.goto('http://127.0.0.1:3002/dashboard/orders');
    const orderRow = page.locator('tr', { hasText: 'RND-006' }).first();
    await expect(orderRow).toBeVisible({ timeout: 10_000 });
    await orderRow.getByRole('link', { name: /^View$/ }).click();
    await expect(page.getByText(/order|status|item|delivery/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
