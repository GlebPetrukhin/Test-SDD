# system-status — каталог тест-кейсов

Действующий набор проверок capability `system-status`: по каждому сценарию из [spec.md](spec.md) — тест-кейсы
с уровнем, данными, шагами, ожидаемым результатом и местом автотеста.

- Обновляется только через изменения: кейсы пишутся в `test-cases.md` изменения и вливаются сюда командой
  `openspec-sdd merge-test-cases <изменение>` после `openspec archive`. Руками в обход изменения не править.
- Сверка «сценарии ↔ кейсы ↔ автотесты»: `openspec-sdd trace-check`.
- История: `2026-10-27-add-system-status` (кейсы 01.1–04.4); `2026-10-27-normalize-app-version` (02.3 уточнён, 05.1–05.2); `2026-10-27-status-timeout` (обновлены 04.2, 04.4).

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

### [system-status-03.1] Ответ ok превращается в «Система доступна»
- **Scenario**: [system-status-03] Пользователь видит, что система доступна
- **Level**: unit
- **Preconditions**: HTTP-клиент замокан
- **Test data**: ответ `{"status":"ok","version":"1.2.3"}`
- **Steps**:
  1. Запросить статус через сервис статуса
- **Expected result**: состояние «доступна», версия `1.2.3`
- **Automation**: sdd-frontend/src/app/features/system-status/system-status.service.spec.ts

### [system-status-03.2] Главная страница показывает доступность и версию
- **Scenario**: [system-status-03] Пользователь видит, что система доступна
- **Level**: e2e
- **Preconditions**: `/api/status` замокан по контракту
- **Test data**: ответ `{"status":"ok","version":"9.9.9"}`
- **Steps**:
  1. Открыть главную страницу
- **Expected result**: видно «Система доступна» и версию `9.9.9`
- **Automation**: sdd-frontend/tests/e2e/system-status.spec.ts

### [system-status-03.3] Стенд: фронт видит живой бэкенд (smoke)
- **Scenario**: [system-status-03] Пользователь видит, что система доступна
- **Level**: e2e (`@smoke`, без моков, против развёрнутого стека)
- **Preconditions**: стек развёрнут в Kubernetes, `open.cmd` / `kubectl port-forward` запущен
- **Test data**: `APP_VERSION` из манифеста (по умолчанию `dev`)
- **Steps**:
  1. Открыть http://localhost:8080
- **Expected result**: видно «Система доступна» и непустую версию бэкенда
- **Automation**: sdd-frontend/tests/e2e/smoke.spec.ts (`E2E_BASE_URL=http://localhost:8080 npm run e2e:smoke`)

### [system-status-04.1] Ошибка HTTP превращается в «Система недоступна»
- **Scenario**: [system-status-04] Пользователь видит, что система недоступна
- **Level**: unit
- **Preconditions**: HTTP-клиент замокан
- **Test data**: ответ HTTP 500
- **Steps**:
  1. Запросить статус через сервис статуса
- **Expected result**: состояние «недоступна»
- **Automation**: sdd-frontend/src/app/features/system-status/system-status.service.spec.ts

### [system-status-04.2] Нет ответа — «недоступна» ровно по таймауту 5 с
- **Scenario**: [system-status-04] Пользователь видит, что система недоступна
- **Level**: unit
- **Preconditions**: HTTP-клиент замокан, время управляется тестом
- **Test data**: запрос без ответа; граница — 5000 мс
- **Steps**:
  1. Запросить статус
  2. Прокрутить время на 4999 мс
  3. Прокрутить время ещё на 2 мс
- **Expected result**: после шага 2 запрос не отменён, состояние ещё не «недоступна»; после шага 3 запрос отменён, состояние «недоступна»
- **Automation**: sdd-frontend/src/app/features/system-status/system-status.service.spec.ts

### [system-status-04.3] Ошибка бэкенда без технических деталей на странице
- **Scenario**: [system-status-04] Пользователь видит, что система недоступна
- **Level**: e2e
- **Preconditions**: `/api/status` замокан
- **Test data**: ответ HTTP 500 с телом `System.NullReferenceException at Sdd.Api`
- **Steps**:
  1. Открыть главную страницу
- **Expected result**: видно «Система недоступна»; текста `NullReferenceException` на странице нет
- **Automation**: sdd-frontend/tests/e2e/system-status.spec.ts

### [system-status-04.4] Зависший бэкенд — «недоступна» не позже чем через 5 с
- **Scenario**: [system-status-04] Пользователь видит, что система недоступна
- **Level**: e2e
- **Preconditions**: запрос `/api/status` перехвачен и не получает ответа
- **Test data**: срок 5 с, допуск на загрузку страницы в тестовом браузере — 1 с
- **Steps**:
  1. Открыть главную страницу, засечь время
  2. Дождаться сообщения «Система недоступна»
- **Expected result**: сообщение появилось; от открытия страницы прошло не больше 6 с (5 с + допуск)
- **Automation**: sdd-frontend/tests/e2e/system-status.spec.ts

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
| [system-status-01] Бэкенд сообщает, что он работает | system-status-01.1 |
| [system-status-02] Версия сборки задаётся при развёртывании | system-status-02.1, system-status-02.2, system-status-02.3 |
| [system-status-05] Пробелы вокруг версии не попадают в ответ | system-status-05.1, system-status-05.2 |
| [system-status-03] Пользователь видит, что система доступна | system-status-03.1, system-status-03.2, system-status-03.3 |
| [system-status-04] Пользователь видит, что система недоступна | system-status-04.1, system-status-04.2, system-status-04.3, system-status-04.4 |
