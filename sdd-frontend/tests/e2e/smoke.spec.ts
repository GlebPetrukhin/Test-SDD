import { expect, test } from '@playwright/test';

// Сквозная проверка против развёрнутого стека (без моков): E2E_BASE_URL=http://localhost:8080 npm run e2e:smoke

test('[system-status-03.3] @smoke стенд: фронт видит живой бэкенд', async ({ page }) => {
  test.skip(!process.env['E2E_BASE_URL'], 'Только против развёрнутого стенда');
  await page.goto('/');
  await expect(page.getByText('Система доступна')).toBeVisible();
  await expect(page.getByTestId('backend-version')).not.toBeEmpty();
});
