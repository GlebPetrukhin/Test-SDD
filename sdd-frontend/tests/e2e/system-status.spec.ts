import { expect, test } from '@playwright/test';

// Спецификация: sdd-specs/openspec/specs/system-status/spec.md
// Тест-кейсы: sdd-specs/openspec/specs/system-status/test-cases.md

test('[system-status-03.2] Главная страница показывает доступность и версию', async ({ page }) => {
  await page.route('**/api/status', (route) =>
    route.fulfill({ json: { status: 'ok', version: '9.9.9' } }),
  );
  await page.goto('/');
  await expect(page.getByText('Система доступна')).toBeVisible();
  await expect(page.getByTestId('backend-version')).toHaveText('9.9.9');
});

test('[system-status-04.3] Ошибка бэкенда без технических деталей на странице', async ({ page }) => {
  await page.route('**/api/status', (route) =>
    route.fulfill({ status: 500, body: 'System.NullReferenceException at Sdd.Api' }),
  );
  await page.goto('/');
  await expect(page.getByText('Система недоступна')).toBeVisible();
  await expect(page.getByText('NullReferenceException')).toHaveCount(0);
});

// Срок из сценария [system-status-04] — 5 с; допуск на загрузку страницы в тестовом браузере — 1 с.
const UNAVAILABLE_DEADLINE_MS = 5_000;
const PAGE_LOAD_ALLOWANCE_MS = 1_000;

test('[system-status-04.4] Зависший бэкенд — «недоступна» не позже чем через 5 с', async ({ page }) => {
  await page.route('**/api/status', () => {
    /* запрос повисает без ответа */
  });
  const started = Date.now();
  await page.goto('/');
  await expect(page.getByText('Система недоступна')).toBeVisible({
    timeout: UNAVAILABLE_DEADLINE_MS + PAGE_LOAD_ALLOWANCE_MS,
  });
  expect(Date.now() - started).toBeLessThanOrEqual(UNAVAILABLE_DEADLINE_MS + PAGE_LOAD_ALLOWANCE_MS);
});
