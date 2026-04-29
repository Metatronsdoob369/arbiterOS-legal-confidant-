import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for ArbiterOS e2e tests.
 * Tests run against the Vite dev server (port 3000).
 * Network requests to AI/API endpoints are mocked inside each test.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      // Provide a dummy key so the app doesn't throw on startup
      OPENAI_API_KEY: 'test-key-placeholder',
      AI_BASE_URL: 'http://localhost:9999',
      AI_MODEL: 'test-model',
    },
  },
});
