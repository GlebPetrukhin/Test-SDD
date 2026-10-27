# Test Cases

## system-status

### [system-status-01.1] Статус бэкенда по API
- **Scenario**: [system-status-01] Бэкенд сообщает, что он работает
- **Level**: integration
- **Preconditions**: бэкенд запущен, переменная `APP_VERSION` не задана
- **Test data**: —
- **Steps**:
  1. Выполнить `GET /api/status` без авторизации
- **Expected result**: HTTP 200, `Content-Type: application/json`; `status` = `ok`; `version` — непустая строка
- **Automation**: sdd-backend/tests/integration/SystemStatusTests.cs → `Status_returns_ok_with_version`

### [system-status-02.1] Версия из настройки развёртывания
- **Scenario**: [system-status-02] Версия сборки задаётся при развёртывании
- **Level**: integration
- **Preconditions**: бэкенд запущен с `APP_VERSION=1.2.3`
- **Test data**: `APP_VERSION=1.2.3`
- **Steps**:
  1. Выполнить `GET /api/status`
- **Expected result**: `version` = `1.2.3`
- **Automation**: sdd-backend/tests/integration/SystemStatusTests.cs → `Status_version_comes_from_APP_VERSION`

### [system-status-02.2] Версия по умолчанию — dev
- **Scenario**: [system-status-02] Версия сборки задаётся при развёртывании
- **Level**: integration
- **Preconditions**: бэкенд запущен, `APP_VERSION` не задана
- **Test data**: —
- **Steps**:
  1. Выполнить `GET /api/status`
- **Expected result**: `version` = `dev`
- **Automation**: sdd-backend/tests/integration/SystemStatusTests.cs → `Status_version_defaults_to_dev`

### [system-status-02.3] Пустое значение версии считается незаданным
- **Scenario**: [system-status-02] Версия сборки задаётся при развёртывании
- **Level**: unit
- **Preconditions**: —
- **Test data**: `APP_VERSION` = `null`, `""`, `"   "`; контроль — `"1.2.3"`
- **Steps**:
  1. Сформировать ответ статуса для каждого значения
- **Expected result**: для `null`, `""`, `"   "` — `version` = `dev`; для `"1.2.3"` — `1.2.3`; `status` всегда `ok`
  (обрезка пробелов вокруг непустой версии — кейсы сценария 05)
- **Automation**: sdd-backend/tests/unit/SystemStatusTests.cs → `Version_is_taken_from_APP_VERSION_or_defaults_to_dev`

### [system-status-05.1] Нормализация версии с пробелами
- **Scenario**: [system-status-05] Пробелы вокруг версии не попадают в ответ
- **Level**: unit
- **Preconditions**: —
- **Test data**: `" 2.0.0 "`, `"2.0.0\n"`, `"\t2.0.0\r\n"`, `" \n "`
- **Steps**:
  1. Сформировать ответ статуса для каждого значения
- **Expected result**: для первых трёх — `version` = `2.0.0`; для `" \n "` — `dev`
- **Automation**: sdd-backend/tests/unit/SystemStatusTests.cs

### [system-status-05.2] Версия с пробелами из окружения приходит в API без них
- **Scenario**: [system-status-05] Пробелы вокруг версии не попадают в ответ
- **Level**: integration
- **Preconditions**: бэкенд запущен с `APP_VERSION="  3.1.0  "`
- **Test data**: `APP_VERSION="  3.1.0  "`
- **Steps**:
  1. Выполнить `GET /api/status`
- **Expected result**: HTTP 200, `version` = `3.1.0`
- **Automation**: sdd-backend/tests/integration/SystemStatusTests.cs

## Gaps

None

## Coverage

| Scenario | Test cases |
|---|---|
| [system-status-01] Бэкенд сообщает, что он работает | system-status-01.1 (без изменений) |
| [system-status-02] Версия сборки задаётся при развёртывании | system-status-02.1, system-status-02.2 (без изменений), system-status-02.3 (уточнён Expected result; из автотеста убрано значение `" 2.0.0 "`) |
| [system-status-05] Пробелы вокруг версии не попадают в ответ | system-status-05.1, system-status-05.2 (новые) |
