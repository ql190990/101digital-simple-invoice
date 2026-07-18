import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE } from './paths';

/**
 * Playwright E2E config for SimpleInvoice.
 *
 * The suite runs against the full Docker Compose stack (nginx SPA on :8080 that
 * reverse-proxies /api to the NestJS backend, which migrates + seeds on boot).
 * `global-setup.ts` brings the stack up (reusing it if already healthy) and
 * `global-teardown.ts` tears it down. The browser is the system Google Chrome
 * (`channel: 'chrome'`) so no chromium download is needed; `--no-sandbox` is
 * required because the harness runs as root.
 *
 * Auth: a `setup` project logs in once and saves storageState; the desktop and
 * mobile projects reuse it (login is rate-limited to 5/60s, so per-test UI logins
 * would trip HTTP 429). Tests that exercise the login flow itself opt out of the
 * stored state locally.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1, // one shared seeded stack; serial avoids cross-test interference
  retries: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    channel: 'chrome',
    launchOptions: { args: ['--no-sandbox', '--disable-dev-shm-usage'] },
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: [/responsive\.spec\.ts/, /auth\.setup\.ts/],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'], channel: 'chrome', storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testMatch: /responsive\.spec\.ts/,
    },
  ],
});
