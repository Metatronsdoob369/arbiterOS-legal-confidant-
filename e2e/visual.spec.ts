/**
 * Visual sanity-check tests for ArbiterOS.
 *
 * These tests capture screenshots at key states and compare them against
 * stored baselines.  The first run (or after `--update-snapshots`) creates
 * the baseline; subsequent runs diff against it.
 *
 * Viewports covered:
 *  - Desktop  (1280 × 800)
 *  - Mobile   (390 × 844  — iPhone-ish)
 *  - Night mode on desktop
 */

import { test, expect } from '@playwright/test';

async function loginAsBootstrapAdmin(page: import('@playwright/test').Page) {
  await page.getByTestId('login-username').fill('admin');
  await page.getByTestId('login-password').fill('secret-passphrase');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('app-root')).toBeVisible();
}

async function mockAiRoutes(page: import('@playwright/test').Page) {
  await page.route('**/v1/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'mock',
        object: 'chat.completion',
        choices: [{ message: { role: 'assistant', content: 'Mock.' }, finish_reason: 'stop', index: 0 }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    });
  });
  await page.route('**/images/generations', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [{ url: 'https://via.placeholder.com/256' }] }),
    });
  });
}

test.describe('Visual snapshots', () => {
  test('default desktop view', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockAiRoutes(page);
    await page.goto('/');
    await loginAsBootstrapAdmin(page);
    await expect(page).toHaveScreenshot('desktop-default.png', { fullPage: false });
  });

  test('mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockAiRoutes(page);
    await page.goto('/');
    await loginAsBootstrapAdmin(page);
    await expect(page).toHaveScreenshot('mobile-default.png', { fullPage: false });
  });

  test('night mode on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockAiRoutes(page);
    await page.goto('/');
    await loginAsBootstrapAdmin(page);
    // Enable night mode
    await page.getByTestId('night-mode-toggle').click();
    // Wait for the overlay to be injected into the DOM (deterministic)
    await page.getByTestId('night-mode-overlay').waitFor({ state: 'attached' });
    await expect(page).toHaveScreenshot('desktop-night-mode.png', { fullPage: false });
  });
});
