import { defineConfig, devices } from '@playwright/test';

/**
 * E2E-тесты пользовательских сценариев из sdd-specs.
 *
 * Локально: `npm run e2e` — сам поднимет `ng serve` на :4200, вызовы /api мокаются в тестах.
 * Против развёрнутого стенда (Kubernetes): `E2E_BASE_URL=http://localhost:8080 npm run e2e:smoke`.
 */
const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4200';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env['E2E_BASE_URL']
    ? undefined
    : {
        command: 'npm start',
        url: 'http://localhost:4200',
        reuseExistingServer: !process.env['CI'],
        timeout: 300_000,
      },
});
