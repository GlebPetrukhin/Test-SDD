# Tasks

## 1. Backend (sdd-backend)

- [x] 1.1 Автотест [system-status-01] в sdd-backend/tests/integration: `GET /api/status` → 200, JSON, `status = ok`, есть `version` (сначала красный; проверка: `dotnet test --filter Scenario=system-status-01`)
- [x] 1.2 Автотест [system-status-02] в sdd-backend/tests/integration: с `APP_VERSION=1.2.3` в ответе `version = 1.2.3`, без переменной — `dev` (проверка: `dotnet test --filter Scenario=system-status-02`)
- [x] 1.3 Реализовать `GET /api/status` по контракту из design.md (проверка: тесты 1.1–1.2 зелёные, `dotnet test` весь зелёный)
- [x] 1.4 Добавить `APP_VERSION` в sdd-backend/deploy/k8s/deployment.yaml (проверка: `kubectl kustomize deploy/k8s` содержит переменную)

## 2. Frontend (sdd-frontend)

- [x] 2.1 Unit-тест сервиса статуса: ответ `ok` → состояние «доступна» с версией; ошибка HTTP → «недоступна» (проверка: `npm run test:ci`)
- [x] 2.2 E2E-тест [system-status-03] в sdd-frontend/tests/e2e: при моке `/api/status` → `ok` видно «Система доступна» и версию (проверка: `npm run e2e`)
- [x] 2.3 E2E-тест [system-status-04] в sdd-frontend/tests/e2e: при ответе 500 видно «Система недоступна» без деталей ошибки (проверка: `npm run e2e`)
- [x] 2.4 Реализовать сервис статуса и блок «Статус системы» на главной странице (проверка: тесты 2.1–2.3 зелёные)

## 3. Сквозная проверка

- [x] 3.1 Smoke-тест `@smoke` [system-status-03] против развёрнутого стека в Kubernetes: страница показывает «Система доступна» и версию из `APP_VERSION` (проверка: `E2E_BASE_URL=http://localhost:8080 npm run e2e:smoke` после деплоя)
  - Проверено 2026-10-27 на Docker Desktop (Windows, kind, k8s v1.36.1) через `open.cmd`: страница «Система доступна», «Версия бэкенда: dev»; `GET /api/status` → 200 `{"status":"ok","version":"dev"}`. Сверено вручную в браузере по шагам smoke-теста: Node.js на машине пока нет, автоматический прогон `npm run e2e:smoke` — после его установки.

## Workflow follow-up

- `/opsx:verify add-system-status`, затем `/opsx:archive add-system-status` в sdd-specs
