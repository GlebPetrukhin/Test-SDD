# Tasks

## 1. Backend (sdd-backend)

- [x] 1.1 Автотест [system-status-05.1] в sdd-backend/tests/unit: нормализация версии с пробелами и переводами строк (проверка: `dotnet test --filter TestCase=system-status-05.1`)
- [x] 1.2 Автотест [system-status-05.2] в sdd-backend/tests/integration: `APP_VERSION="  3.1.0  "` → `version` = `3.1.0` (проверка: `dotnet test --filter TestCase=system-status-05.2`)
- [x] 1.3 Из данных автотеста [system-status-02.3] убрать значение `" 2.0.0 "` — оно теперь в 05.1 (проверка: `dotnet test` зелёный, `node ../sdd-specs/workspace/trace-check.mjs --strict` без ошибок)

## Workflow follow-up

- `/opsx:verify normalize-app-version`, затем `/opsx:archive normalize-app-version` в sdd-specs — со слиянием кейсов в каталог
