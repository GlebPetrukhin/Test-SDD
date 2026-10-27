# grid-models — каталог тест-кейсов

Действующий набор проверок capability `grid-models`: по каждому сценарию из [spec.md](spec.md) — тест-кейсы
с уровнем, данными, шагами, ожидаемым результатом и местом автотеста.

- Обновляется только через изменения: кейсы пишутся в `test-cases.md` изменения и вливаются сюда командой
  `openspec-sdd merge-test-cases <изменение>` после `openspec archive`. Руками в обход изменения не править.
- Сверка «сценарии ↔ кейсы ↔ автотесты»: `openspec-sdd trace-check`.
- История: `2026-10-27-add-grid-model-workflow` (создан).

## grid-models

### [grid-models-01.1] Поиск и просмотр — API
- **Scenario**: [grid-models-01] Поиск и просмотр
- **Level**: integration
- **Preconditions**: PostgreSQL, изолированная тестовая схема
- **Test data**: organizationId=ural, ownerId=ural, name=«Сеть Урал», region=«Урал»; objects=[{id:"ps-1",name:"ПС Урал",type:"substation",voltageKv:220,links:[]}]
- **Steps**:
  1. Получить реестр, найти «Урал», открыть карточку
- **Expected result**: Модели и версии доступны; пустой поиск возвращает пустой результат
- **Automation**: sdd-backend/tests/integration/GridModelsTests.cs

### [grid-models-01.2] Поиск и просмотр — интерфейс
- **Scenario**: [grid-models-01] Поиск и просмотр
- **Level**: e2e
- **Preconditions**: API замокан по контракту
- **Test data**: organizationId=ural, ownerId=ural, name=«Сеть Урал», region=«Урал»; objects=[{id:"ps-1",name:"ПС Урал",type:"substation",voltageKv:220,links:[]}]
- **Steps**:
  1. Получить реестр, найти «Урал», открыть карточку
- **Expected result**: Модели и версии доступны; пустой поиск возвращает пустой результат
- **Automation**: sdd-frontend/tests/e2e/grid-models.spec.ts

### [grid-models-02.1] Новая модель — API
- **Scenario**: [grid-models-02] Новая модель
- **Level**: integration
- **Preconditions**: PostgreSQL, изолированная тестовая схема
- **Test data**: organizationId=ural, ownerId=ural, name=«Сеть Урал», region=«Урал»; objects=[{id:"ps-1",name:"ПС Урал",type:"substation",voltageKv:220,links:[]}]
- **Steps**:
  1. Создать «Сеть Урал», регион «Урал», ownerId=ural; повторить с пустым именем
- **Expected result**: 201 и модель без версии; пустое имя отклонено с 400
- **Automation**: sdd-backend/tests/integration/GridModelsTests.cs

### [grid-models-02.2] Новая модель — интерфейс
- **Scenario**: [grid-models-02] Новая модель
- **Level**: e2e
- **Preconditions**: API замокан по контракту
- **Test data**: organizationId=ural, ownerId=ural, name=«Сеть Урал», region=«Урал»; objects=[{id:"ps-1",name:"ПС Урал",type:"substation",voltageKv:220,links:[]}]
- **Steps**:
  1. Создать «Сеть Урал», регион «Урал», ownerId=ural; повторить с пустым именем
- **Expected result**: 201 и модель без версии; пустое имя отклонено с 400
- **Automation**: sdd-frontend/tests/e2e/grid-models.spec.ts

### [grid-models-03.1] Загрузка версии — API
- **Scenario**: [grid-models-03] Загрузка версии
- **Level**: integration
- **Preconditions**: PostgreSQL, изолированная тестовая схема
- **Test data**: organizationId=ural, ownerId=ural, name=«Сеть Урал», region=«Урал»; objects=[{id:"ps-1",name:"ПС Урал",type:"substation",voltageKv:220,links:[]}]
- **Steps**:
  1. Создать версию с объектом ps-1 220 кВ; затем версию с повторным ID и ссылкой missing
- **Expected result**: Черновик, список изменений; ошибки проверки показаны, submit запрещён
- **Automation**: sdd-backend/tests/integration/GridModelsTests.cs

### [grid-models-03.2] Загрузка версии — интерфейс
- **Scenario**: [grid-models-03] Загрузка версии
- **Level**: e2e
- **Preconditions**: API замокан по контракту
- **Test data**: organizationId=ural, ownerId=ural, name=«Сеть Урал», region=«Урал»; objects=[{id:"ps-1",name:"ПС Урал",type:"substation",voltageKv:220,links:[]}]
- **Steps**:
  1. Создать версию с объектом ps-1 220 кВ; затем версию с повторным ID и ссылкой missing
- **Expected result**: Черновик, список изменений; ошибки проверки показаны, submit запрещён
- **Automation**: sdd-frontend/tests/e2e/grid-models.spec.ts

### [grid-models-04.1] Прохождение согласования — API
- **Scenario**: [grid-models-04] Прохождение согласования
- **Level**: integration
- **Preconditions**: PostgreSQL, изолированная тестовая схема
- **Test data**: organizationId=ural, ownerId=ural, name=«Сеть Урал», region=«Урал»; objects=[{id:"ps-1",name:"ПС Урал",type:"substation",voltageKv:220,links:[]}]
- **Steps**:
  1. Выполнить submit, approve, publish; другую версию вернуть с комментарием; проверить недопустимые переходы
- **Expected result**: Опубликованная версия актуальна, возврат с комментарием сохранён, неверный переход даёт 409
- **Automation**: sdd-backend/tests/integration/GridModelsTests.cs

### [grid-models-04.2] Прохождение согласования — интерфейс
- **Scenario**: [grid-models-04] Прохождение согласования
- **Level**: e2e
- **Preconditions**: API замокан по контракту
- **Test data**: organizationId=ural, ownerId=ural, name=«Сеть Урал», region=«Урал»; objects=[{id:"ps-1",name:"ПС Урал",type:"substation",voltageKv:220,links:[]}]
- **Steps**:
  1. Выполнить submit, approve, publish; другую версию вернуть с комментарием; проверить недопустимые переходы
- **Expected result**: Опубликованная версия актуальна, возврат с комментарием сохранён, неверный переход даёт 409
- **Automation**: sdd-frontend/tests/e2e/grid-models.spec.ts

### [grid-models-05.1] Конфликт версий — API
- **Scenario**: [grid-models-05] Конфликт версий
- **Level**: integration
- **Preconditions**: PostgreSQL, изолированная тестовая схема
- **Test data**: organizationId=ural, ownerId=ural, name=«Сеть Урал», region=«Урал»; objects=[{id:"ps-1",name:"ПС Урал",type:"substation",voltageKv:220,links:[]}]
- **Steps**:
  1. Создать две версии от одной базы, опубликовать первую, попытаться согласовать вторую; отправить устаревшую revision
- **Expected result**: 409, текст «Данные изменились. Обновите карточку и повторите действие.»
- **Automation**: sdd-backend/tests/integration/GridModelsTests.cs

### [grid-models-05.2] Конфликт версий — интерфейс
- **Scenario**: [grid-models-05] Конфликт версий
- **Level**: e2e
- **Preconditions**: API замокан по контракту
- **Test data**: organizationId=ural, ownerId=ural, name=«Сеть Урал», region=«Урал»; objects=[{id:"ps-1",name:"ПС Урал",type:"substation",voltageKv:220,links:[]}]
- **Steps**:
  1. Создать две версии от одной базы, опубликовать первую, попытаться согласовать вторую; отправить устаревшую revision
- **Expected result**: 409, текст «Данные изменились. Обновите карточку и повторите действие.»
- **Automation**: sdd-frontend/tests/e2e/grid-models.spec.ts

### [grid-models-06.1] Скачивание — API
- **Scenario**: [grid-models-06] Скачивание
- **Level**: integration
- **Preconditions**: PostgreSQL, изолированная тестовая схема
- **Test data**: organizationId=ural, ownerId=ural, name=«Сеть Урал», region=«Урал»; objects=[{id:"ps-1",name:"ПС Урал",type:"substation",voltageKv:220,links:[]}]
- **Steps**:
  1. Скачать опубликованную версию; попытаться скачать черновик
- **Expected result**: 200 с исходным JSON; черновик недоступен для обмена (409)
- **Automation**: sdd-backend/tests/integration/GridModelsTests.cs

### [grid-models-06.2] Скачивание — интерфейс
- **Scenario**: [grid-models-06] Скачивание
- **Level**: e2e
- **Preconditions**: API замокан по контракту
- **Test data**: organizationId=ural, ownerId=ural, name=«Сеть Урал», region=«Урал»; objects=[{id:"ps-1",name:"ПС Урал",type:"substation",voltageKv:220,links:[]}]
- **Steps**:
  1. Скачать опубликованную версию; попытаться скачать черновик
- **Expected result**: 200 с исходным JSON; черновик недоступен для обмена (409)
- **Automation**: sdd-frontend/tests/e2e/grid-models.spec.ts

### [grid-models-07.1] История действий — API
- **Scenario**: [grid-models-07] История действий
- **Level**: integration
- **Preconditions**: PostgreSQL, изолированная тестовая схема
- **Test data**: organizationId=ural, ownerId=ural, name=«Сеть Урал», region=«Урал»; objects=[{id:"ps-1",name:"ПС Урал",type:"substation",voltageKv:220,links:[]}]
- **Steps**:
  1. Создать модель, загрузить версию и выполнить submit; перечитать через новый экземпляр хранилища
- **Expected result**: Версии и журнал сохранены с временем, комментарием и организацией
- **Automation**: sdd-backend/tests/integration/GridModelsTests.cs

### [grid-models-07.2] История действий — интерфейс
- **Scenario**: [grid-models-07] История действий
- **Level**: e2e
- **Preconditions**: API замокан по контракту
- **Test data**: organizationId=ural, ownerId=ural, name=«Сеть Урал», region=«Урал»; objects=[{id:"ps-1",name:"ПС Урал",type:"substation",voltageKv:220,links:[]}]
- **Steps**:
  1. Создать модель, загрузить версию и выполнить submit; перечитать через новый экземпляр хранилища
- **Expected result**: Версии и журнал сохранены с временем, комментарием и организацией
- **Automation**: sdd-frontend/tests/e2e/grid-models.spec.ts

### [grid-models-08.1] Недоступность API — API
- **Scenario**: [grid-models-08] Недоступность API
- **Level**: integration
- **Preconditions**: PostgreSQL, изолированная тестовая схема
- **Test data**: organizationId=ural, ownerId=ural, name=«Сеть Урал», region=«Урал»; objects=[{id:"ps-1",name:"ПС Урал",type:"substation",voltageKv:220,links:[]}]
- **Steps**:
  1. Вызвать API с неизвестной организацией; для UI вернуть 503 при загрузке реестра и затем повторить успешно
- **Expected result**: API 400 без изменения данных; UI показывает ошибку и повтор, демонстрационный режим обозначен
- **Automation**: sdd-backend/tests/integration/GridModelsTests.cs

### [grid-models-08.2] Недоступность API — интерфейс
- **Scenario**: [grid-models-08] Недоступность API
- **Level**: e2e
- **Preconditions**: API замокан по контракту
- **Test data**: organizationId=ural, ownerId=ural, name=«Сеть Урал», region=«Урал»; objects=[{id:"ps-1",name:"ПС Урал",type:"substation",voltageKv:220,links:[]}]
- **Steps**:
  1. Вызвать API с неизвестной организацией; для UI вернуть 503 при загрузке реестра и затем повторить успешно
- **Expected result**: API 400 без изменения данных; UI показывает ошибку и повтор, демонстрационный режим обозначен
- **Automation**: sdd-frontend/tests/e2e/grid-models.spec.ts

## Gaps

None

## Coverage

| Scenario | Test cases |
|---|---|
| [grid-models-01] Поиск и просмотр | grid-models-01.1, grid-models-01.2 |
| [grid-models-02] Новая модель | grid-models-02.1, grid-models-02.2 |
| [grid-models-03] Загрузка версии | grid-models-03.1, grid-models-03.2 |
| [grid-models-04] Прохождение согласования | grid-models-04.1, grid-models-04.2 |
| [grid-models-05] Конфликт версий | grid-models-05.1, grid-models-05.2 |
| [grid-models-06] Скачивание | grid-models-06.1, grid-models-06.2 |
| [grid-models-07] История действий | grid-models-07.1, grid-models-07.2 |
| [grid-models-08] Недоступность API | grid-models-08.1, grid-models-08.2 |
