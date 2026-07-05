import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('saved library entries persist for the logged-in user', async ({ page }) => {
  const title = `Retention note ${randomUUID()}`;

  await page.goto('/');
  await page.getByTestId('login-username').fill('admin');
  await page.getByTestId('login-password').fill('secret-passphrase');
  await page.getByTestId('login-submit').click();

  await page.getByTestId('nav-btn-library').click();
  await page.getByText('+ Add Entry').click();
  await page.getByPlaceholder('Title...').fill(title);
  await page.getByPlaceholder('Content...').fill('Keep the chain of custody intact.');
  await page.getByText('Save').click();

  await page.reload();
  await page.getByTestId('nav-btn-library').click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
});
