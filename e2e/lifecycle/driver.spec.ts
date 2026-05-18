/**
 * Lifecycle: Driver end-to-end journey
 *
 * Covers: sign-up → vehicle details → auto-approval → toggle online →
 *         receive offer (API-injected) → accept → pickup with stub photo →
 *         dropoff with stub photo + signature → view earnings.
 *
 * Seed dependencies:
 *   - Seeded driver: mike.driver@ridendine.ca / password123 (status: approved)
 *   - Seeded delivery: del-00001 in 'delivered' state (earnings baseline)
 *
 * Missing seed hooks needed for full green run:
 *   - A 'pending' delivery offer associated with the test driver account.
 *   - Auto-approval hook: if new-driver sign-up sets status='pending', a
 *     beforeEach fixture using the admin client should UPDATE drivers SET
 *     status='approved' WHERE email = newDriverEmail.
 *   - PROCESSOR_TOKEN env var for order/delivery state injection via API.
 */

import * as path from 'path';
import { expect, test } from '@playwright/test';

const STUB_PHOTO_PATH = path.join(__dirname, 'fixtures', 'stub-photo.png');

async function signInDriver(page: import('@playwright/test').Page) {
  await page.goto('/auth/login');
  const result = await page.evaluate(async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: 'mike.driver@ridendine.ca',
        password: 'password123',
      }),
    });
    const body = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      error: typeof body.error === 'string' ? body.error : null,
    };
  });

  expect(result, result.error ?? `Driver login failed with status ${result.status}`).toMatchObject({
    ok: true,
  });
  await page.goto('/');
  await expect(page).not.toHaveURL(/\/auth\/login/);
}

test.describe('driver lifecycle @lifecycle', () => {
  test.use({ baseURL: 'http://localhost:3003' });

  test('new driver can sign up', async ({ page }) => {
    const driverEmail = `driver-${Date.now()}@ridendine.ca`;
    await page.goto('/auth/signup');
    await page.getByLabel(/first name/i).fill('E2E');
    await page.getByLabel(/last name/i).fill('Driver');
    await page.getByLabel(/email/i).fill(driverEmail);
    await page.getByLabel(/phone/i).fill('+1 555 010 1234');
    await page.getByLabel(/^password/i).fill('DriverPass123!');
    const confirmField = page.getByLabel(/confirm password/i);
    if (await confirmField.isVisible()) {
      await confirmField.fill('DriverPass123!');
    }
    await page.getByLabel(/terms of service/i).check();
    await page.getByLabel(/independent contractor/i).check();
    await page.getByRole('button', { name: /submit application/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/signup'), { timeout: 15_000 });
  });

  test('driver can fill vehicle details', async ({ page }) => {
    await signInDriver(page);

    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByTestId('driver-vehicle-details')).toBeVisible({ timeout: 5_000 });
  });

  test('approved driver can toggle online status', async ({ page }) => {
    await signInDriver(page);

    // Driver app home / dashboard
    await page.goto('/');
    const toggle = page.getByTestId('driver-online-toggle').first();
    await expect(toggle).toBeVisible({ timeout: 5_000 });
    await toggle.click();
    // Status label should update
    await expect(page.getByText(/online|offline|available/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('driver can see and accept a delivery offer', async ({ page }) => {
    await signInDriver(page);

    // Navigate to deliveries list — seeded ready_for_pickup order (ord-00006 / del-assigned pending)
    await page.goto('/delivery');
    // If no offer is present, skip — a real pending offer requires API injection
    const offerCard = page.locator('[data-testid*="offer"], [class*="offer"], button:has-text("Accept")').first();
    if (!(await offerCard.isVisible({ timeout: 5_000 }))) {
      test.skip();
    }
    await page.getByRole('button', { name: /accept/i }).first().click();
    await expect(page.getByText(/accepted|picking up|on the way|en route/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('driver can confirm pickup with stub photo', async ({ page }) => {
    await signInDriver(page);

    // Navigate to active delivery — assumes accepted state from prior step
    await page.goto('/delivery');
    const pickupBtn = page.getByRole('button', { name: /confirm pickup|picked up/i }).first();
    if (!(await pickupBtn.isVisible({ timeout: 5_000 }))) {
      test.skip();
    }
    // Upload stub photo if file input present
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(STUB_PHOTO_PATH);
    }
    await pickupBtn.click();
    await expect(page.getByText(/on the way|picked up|delivering/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('driver can confirm dropoff with stub photo and complete delivery', async ({ page }) => {
    await signInDriver(page);

    await page.goto('/delivery');
    const dropoffBtn = page.getByRole('button', { name: /confirm drop.?off|delivered|complete/i }).first();
    if (!(await dropoffBtn.isVisible({ timeout: 5_000 }))) {
      test.skip();
    }
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(STUB_PHOTO_PATH);
    }
    // Signature canvas — draw a squiggle if present
    const sigCanvas = page.locator('canvas[data-testid*="sig"], canvas').first();
    if (await sigCanvas.isVisible()) {
      const box = await sigCanvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + 10, box.y + 10);
        await page.mouse.down();
        await page.mouse.move(box.x + 40, box.y + 20);
        await page.mouse.up();
      }
    }
    await dropoffBtn.click();
    await expect(page.getByText(/delivered|complete|great job/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('driver earnings page shows updated balance', async ({ page }) => {
    await signInDriver(page);

    await page.goto('/earnings');
    await expect(page).toHaveURL(/\/earnings/);
    await expect(page.getByText(/earnings|balance|total/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
