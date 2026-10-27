// Проверка собранного интерфейса во внутренней Docker-сети, без повторной сборки ng serve.
import { defineConfig } from '@playwright/test';
import config from '../playwright.config';
export default defineConfig({
  ...config,
  testDir: './e2e',
  webServer: undefined,
  use: { ...config.use, baseURL: 'http://sdd-grid-ui-web:8080' },
});
