/**
 * Smoke e2e tests for ArbiterOS.
 *
 * These tests verify that:
 *  1. The app shell renders on load.
 *  2. All six sidebar views can be navigated to.
 *  3. The night-mode toggle works.
 *
 * All outbound fetch/XHR calls are intercepted so that no real API keys
 * or network connectivity are required.
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAsBootstrapAdmin(page: import('@playwright/test').Page) {
  await page.getByTestId('login-username').fill('admin');
  await page.getByTestId('login-password').fill('secret-passphrase');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('app-root')).toBeVisible();
}

/** Block all calls to the configured AI base URL so no real key is needed. */
async function mockAiRoutes(page: import('@playwright/test').Page) {
  await page.route('**/v1/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'mock-response',
        object: 'chat.completion',
        choices: [
          {
            message: { role: 'assistant', content: 'Mock legal response.' },
            finish_reason: 'stop',
            index: 0,
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    });
  });
  // Also block image generation endpoints
  await page.route('**/images/generations', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [{ url: 'https://via.placeholder.com/256' }] }),
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('App shell', () => {
  test.beforeEach(async ({ page }) => {
    await mockAiRoutes(page);
    await page.goto('/');
    await loginAsBootstrapAdmin(page);
  });

  test('loads and renders the app root', async ({ page }) => {
    await expect(page.getByTestId('app-root')).toBeVisible();
  });

  test('renders the sidebar', async ({ page }) => {
    await expect(page.getByTestId('sidebar')).toBeVisible();
    await expect(page.getByTestId('sidebar-nav')).toBeVisible();
  });

  test('default view is Legal Counsel (advisor)', async ({ page }) => {
    await expect(page.getByTestId('view-advisor')).toBeVisible();
    await expect(page.getByTestId('view-legal-advisor')).toBeVisible();
  });
});

test.describe('Navigation — sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await mockAiRoutes(page);
    await page.goto('/');
    await loginAsBootstrapAdmin(page);
  });

  const views: Array<{
    btn: string;
    viewId: string;
    heading: string;
    headingText?: RegExp;
  }> = [
    { btn: 'nav-btn-advisor',    viewId: 'view-advisor',            heading: 'view-legal-advisor' },
    { btn: 'nav-btn-private',    viewId: 'view-private_confidant',  heading: 'view-private-confidant' },
    { btn: 'nav-btn-evidence',   viewId: 'view-evidence',           heading: 'heading-evidence-board' },
    { btn: 'nav-btn-library',    viewId: 'view-library',            heading: 'heading-library' },
    { btn: 'nav-btn-case_board', viewId: 'view-case_board',         heading: 'heading-case-board', headingText: /Growth/i },
    { btn: 'nav-btn-studio',     viewId: 'view-studio',             heading: 'heading-image-gen' },
    { btn: 'nav-btn-audit',      viewId: 'view-audit',              heading: 'heading-audit-log' },
  ];

  for (const { btn, viewId, heading, headingText } of views) {
    test(`clicking ${btn} shows the correct view`, async ({ page }) => {
      await page.getByTestId(btn).click();
      await expect(page.getByTestId(viewId).first()).toBeVisible();
      await expect(page.getByTestId(heading)).toBeVisible();
      if (headingText) {
        await expect(page.getByTestId(heading)).toHaveText(headingText);
      }
    });
  }

  test('Growth funnel reaches stairway from Status Upgrades', async ({ page }) => {
    await page.getByTestId('nav-btn-case_board').click();
    await page.getByTestId('growth-folder-status-upgrades').click();
    await page.getByTestId(/growth-area-/).first().click();
    await page.getByTestId(/growth-vehicle-/).first().click();
    await expect(page.getByTestId('growth-stairway')).toBeVisible();
  });
});

test.describe('Night mode', () => {
  test.beforeEach(async ({ page }) => {
    await mockAiRoutes(page);
    await page.goto('/');
    await loginAsBootstrapAdmin(page);
  });

  test('night-mode toggle exists', async ({ page }) => {
    await expect(page.getByTestId('night-mode-toggle')).toBeVisible();
  });

  test('toggling night mode applies the lamp overlay', async ({ page }) => {
    // The lamp glow overlay only exists in the DOM when nightMode === true.
    await expect(page.getByTestId('night-mode-overlay')).toHaveCount(0);

    await page.getByTestId('night-mode-toggle').click();

    // After toggle the overlay element is injected into the DOM.
    await expect(page.getByTestId('night-mode-overlay')).toHaveCount(1);
  });

  test('clicking night-mode toggle twice returns to normal mode', async ({ page }) => {
    await page.getByTestId('night-mode-toggle').click();
    await expect(page.getByTestId('night-mode-overlay')).toHaveCount(1);

    await page.getByTestId('night-mode-toggle').click();
    await expect(page.getByTestId('night-mode-overlay')).toHaveCount(0);
  });
});
