import { test, expect } from '@playwright/test';

test('requires login before showing the legal workspace', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('login-screen')).toBeVisible();
  await expect(page.getByTestId('app-root')).toHaveCount(0);
});

test('lets the bootstrap admin enter the workspace', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('login-username').fill('admin');
  await page.getByTestId('login-password').fill('secret-passphrase');
  await page.getByTestId('login-submit').click();

  await expect(page.getByTestId('app-root')).toBeVisible();
  await expect(page.getByTestId('login-screen')).toHaveCount(0);
});
