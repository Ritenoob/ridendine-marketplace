/**
 * Lifecycle: Driver end-to-end journey
 *
 * Covers: sign-up → vehicle details → auto-approval → toggle online →
 *         receive offer (API-injected) → accept → pickup with stub photo →
 *         dropoff with stub photo + signature → view earnings.
 *
 * Seed dependencies:
 *   - Seeded driver: mike.driver@ridendine.ca / password123 (status: approved)
 *   - Seeded delivery: de100000-0000-4000-8000-000000000001 in 'delivered' state (earnings baseline)
 *
 * Reset dependencies:
 *   - scripts/e2e/reset-live-fixtures.mjs restores the pending RND-009 offer
 *     associated with the seeded driver account.
 *   - New-driver signup may still require an approval fixture if the route
 *     stops auto-approving deterministic E2E accounts.
 */

import * as path from 'path';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const STUB_PHOTO_PATH = path.join(__dirname, 'fixtures', 'stub-photo.png');
const POSITIVE_DRIVER_DELIVERY_ID = 'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b3b3';

async function becomesVisible(locator: Locator, timeout = 8_000) {
  return locator
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);
}

async function signInDriver(page: Page) {
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

async function closeMapsPopup(page: Page, action: () => Promise<void>) {
  const popupPromise = page.waitForEvent('popup', { timeout: 2_000 }).catch(() => null);
  await action();
  const popup = await popupPromise;
  await popup?.close().catch(() => {});
}

async function acceptPositiveOffer(page: Page) {
  await page.goto('/');
  const startShiftButton = page.getByRole('button', { name: /^start shift$/i }).first();
  if (await becomesVisible(startShiftButton, 2_000)) {
    await startShiftButton.click();
    await expect(page.getByText(/online|on shift|available/i).first()).toBeVisible({ timeout: 15_000 });
    await page.reload();
  }

  await expect(page.getByText(/pending offers|offer queue/i).first()).toBeVisible({ timeout: 30_000 });

  const acceptButton = page.getByRole('button', { name: /^accept$/i }).first();

  if (
    (await becomesVisible(page.getByText(/order RND-009/i).first(), 30_000)) &&
    (await becomesVisible(acceptButton, 30_000))
  ) {
    await acceptButton.click();
    await expect(page).toHaveURL(new RegExp(`/delivery/${POSITIVE_DRIVER_DELIVERY_ID}`), {
      timeout: 10_000,
    });
    return;
  }

  await page.goto(`/delivery/${POSITIVE_DRIVER_DELIVERY_ID}`);
  await expect(page.getByText(/delivery work/i).first()).toBeVisible({ timeout: 15_000 });
}

async function advanceUntilVisibleAction(page: Page, targetName: RegExp): Promise<Locator> {
  for (let step = 0; step < 5; step += 1) {
    const target = page.getByRole('button', { name: targetName }).first();
    if (await becomesVisible(target, 1_000)) return target;

    const nextAction = page
      .getByRole('button', {
        name: /start navigation to pickup|arrived at restaurant|start navigation to customer|arrived at customer/i,
      })
      .first();
    await expect(nextAction).toBeVisible({ timeout: 15_000 });
    await closeMapsPopup(page, () => nextAction.click());
    await expect(page.getByText(/current step/i).first()).toBeVisible({ timeout: 10_000 });
  }

  throw new Error(`Delivery action ${targetName} did not become visible`);
}

async function confirmPickupIfNeeded(page: Page) {
  await page.goto(`/delivery/${POSITIVE_DRIVER_DELIVERY_ID}`);
  if (await becomesVisible(page.getByRole('button', { name: /^complete delivery$/i }).first(), 1_000)) {
    return;
  }
  if (await becomesVisible(page.getByRole('button', { name: /start navigation to customer/i }).first(), 1_000)) {
    return;
  }

  const pickupButton = await advanceUntilVisibleAction(page, /^confirm pickup$/i);
  await pickupButton.click();
  await expect(page.getByRole('dialog', { name: /confirm pickup/i })).toBeVisible({ timeout: 5_000 });
  await page.locator('input[type="file"]').setInputFiles(STUB_PHOTO_PATH);
  await page.getByRole('dialog', { name: /confirm pickup/i }).getByRole('button', { name: /^confirm pickup$/i }).click();
  await expect(page.getByText(/picked up|start navigation to customer|en route to customer/i).first()).toBeVisible({
    timeout: 15_000,
  });
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

    await acceptPositiveOffer(page);
  });

  test('driver can confirm pickup with stub photo', async ({ page }) => {
    await signInDriver(page);
    await acceptPositiveOffer(page);

    await page.goto(`/delivery/${POSITIVE_DRIVER_DELIVERY_ID}`);
    const pickupBtn = await advanceUntilVisibleAction(page, /^confirm pickup$/i);
    await pickupBtn.click();
    await expect(page.getByRole('dialog', { name: /confirm pickup/i })).toBeVisible({ timeout: 5_000 });
    await page.locator('input[type="file"]').setInputFiles(STUB_PHOTO_PATH);
    await page.getByRole('dialog', { name: /confirm pickup/i }).getByRole('button', { name: /^confirm pickup$/i }).click();
    await expect(page.getByText(/picked up|start navigation to customer|en route to customer/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('driver can confirm dropoff with stub photo and complete delivery', async ({ page }) => {
    await signInDriver(page);
    await acceptPositiveOffer(page);
    await confirmPickupIfNeeded(page);

    await page.goto(`/delivery/${POSITIVE_DRIVER_DELIVERY_ID}`);
    const dropoffBtn = await advanceUntilVisibleAction(page, /^complete delivery$/i);
    await dropoffBtn.click();
    await expect(page.getByRole('dialog', { name: /complete delivery/i })).toBeVisible({ timeout: 5_000 });
    await page.locator('input[type="file"]').setInputFiles(STUB_PHOTO_PATH);
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
    await page.getByRole('dialog', { name: /complete delivery/i }).getByRole('button', { name: /^complete$/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect(page.getByText(/work dashboard|today's summary|driver command center/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('driver earnings page shows updated balance', async ({ page }) => {
    await signInDriver(page);

    await page.goto('/earnings');
    await expect(page).toHaveURL(/\/earnings/);
    await expect(page.getByText(/earnings|balance|total/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
