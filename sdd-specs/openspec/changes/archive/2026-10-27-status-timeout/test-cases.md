# Test Cases

## system-status

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

## Gaps

None

## Coverage

| Scenario | Test cases |
|---|---|
| [system-status-03] Пользователь видит, что система доступна | system-status-03.1, system-status-03.2, system-status-03.3 |
| [system-status-04] Пользователь видит, что система недоступна | system-status-04.1, system-status-04.2, system-status-04.3, system-status-04.4 |
