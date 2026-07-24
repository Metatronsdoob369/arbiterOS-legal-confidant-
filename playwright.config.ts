import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for ArbiterOS e2e tests.
 * Uses a dedicated port (4321) to avoid conflicts with other dev servers.
 * Network requests to AI/API endpoints are mocked inside each test.
 */
const webServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER
  ? undefined
  : {
      command: 'npm run seed:admin && npm run dev',
      url: 'http://localhost:4321',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        // Provide a dummy key so the app doesn't throw on startup
        OPENAI_API_KEY: 'test-key-placeholder',
        AI_BASE_URL: 'http://localhost:9999',
        AI_MODEL: 'test-model',
      },
    };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
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
  webServer,
});
