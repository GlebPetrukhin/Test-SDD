# Proposal

## Why

Бэкенд-часть изменения [compare-model-versions](../../../../sdd-specs/openspec/changes/compare-model-versions/proposal.md): проверить совместимость существующей выдачи данных и прежнего поведения по назначенным QA кейсам.

## What Changes

- Behavior: [дельта grid-models](../../../../sdd-specs/openspec/changes/compare-model-versions/specs/grid-models/spec.md).
- Shared decisions: [общий design](../../../../sdd-specs/openspec/changes/compare-model-versions/design.md).
- Contract: [grid-models-api.yaml](../../../../sdd-specs/contracts/grid-models-api.yaml), версия 1.0.0.
- Test cases owned by this repository: [test-cases.md](../../../../sdd-specs/openspec/changes/compare-model-versions/test-cases.md): [grid-models-09.1], [grid-models-10.1], [grid-models-11.1], [grid-models-12.1], [grid-models-15.1], [grid-models-17.1], [grid-models-18.1], [grid-models-19.1], [grid-models-20.1], [grid-models-21.1], [grid-models-22.1], [grid-models-23.1], [grid-models-28.1], [grid-models-29.1], [grid-models-31.1], [grid-models-32.1].

## Impact

Новые интеграционные тесты в `tests/integration/CompareModelVersionsTests.cs` и вспомогательные данные в `tests/integration/GridComparisonData.cs`, с использованием изолированной PostgreSQL-фикстуры. В `GridRules.Act` запланировано изменение кода отказа submit ошибочного draft с `400 validation` на `409 invalid_transition`, подтверждённое пользователем и существующим кейсом QA. Прочие исправления `Features/GridModels` — только при выявленном тестами отклонении. Схема OpenAPI 1.0.0, БД и развёртывание не меняются.

Решение по ожиданию [grid-models-28.1] зафиксировано в [review-notes.md](review-notes.md); блокировка уточнения снята, тест и исправление выполняются по tasks.md.
