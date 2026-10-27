# Tasks

## 1. Спецификация и контракт
- [x] 1.1 Уточнение процесса и JSON пройдено с пользователем; спецификация и контракт 1.0.0 оформлены.
- [ ] 1.2 Общий design и 16 тест-кейсов приняты на ревью QA; openspec validate --strict проходит.

## 2. Бэк (sdd-backend)
- [x] 2.1 Автотесты кейсов [grid-models-01.1, grid-models-02.1, grid-models-03.1, grid-models-04.1, grid-models-05.1, grid-models-06.1, grid-models-07.1, grid-models-08.1] зелёные.
- [x] 2.2 Локальное изменение sdd-backend/openspec/changes/add-grid-model-workflow-back закрыто и заархивировано.

## 3. Фронт (sdd-frontend)
- [x] 3.1 Автотесты кейсов [grid-models-01.2, grid-models-02.2, grid-models-03.2, grid-models-04.2, grid-models-05.2, grid-models-06.2, grid-models-07.2, grid-models-08.2] зелёные.
- [x] 3.2 Локальное изменение sdd-frontend/openspec/changes/add-grid-model-workflow-front закрыто и заархивировано.

## 4. Приёмка и архивация
- [x] 4.1 PO принял сквозной процесс по сценариям на работающем приложении.
- [x] 4.2 openspec-sdd trace-check --strict проходит без ошибок.

## Workflow follow-up
- После приёмки заархивировать локальные изменения приложений.
- openspec archive add-grid-model-workflow --store sdd-specs.
- openspec-sdd merge-test-cases add-grid-model-workflow, затем просмотреть Gaps.

## Запись о приёмке

27.10.2026 пользователь подтвердил готовность пилота и прямо поручил перенести изменение в архив. Приёмка PO зафиксирована этим поручением. Отдельное ревью QA не выполнялось: пункт 1.2 сохранён незавершённым, чтобы не приписывать ему несуществующую проверку. Архивация выполняется с этим явно зафиксированным исключением.
