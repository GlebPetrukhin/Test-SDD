# Proposal

## Why

Локальная часть изменения `compare-model-versions` хранилища sdd-specs в приложении sdd-frontend. Основание — согласованный общий стык и тест-кейсы QA.

## What Changes

- Изменение: [compare-model-versions](../../../../sdd-specs/openspec/changes/compare-model-versions/proposal.md).
- Поведение: [дельта grid-models](../../../../sdd-specs/openspec/changes/compare-model-versions/specs/grid-models/spec.md).
- Общие решения: [design.md](../../../../sdd-specs/openspec/changes/compare-model-versions/design.md).
- Контракт: [grid-models-api.yaml](../../../../sdd-specs/contracts/grid-models-api.yaml), версия **1.0.0**.
- Свои unit-кейсы: [test-cases.md](../../../../sdd-specs/openspec/changes/compare-model-versions/test-cases.md) — [grid-models-09.3], [grid-models-11.2], [grid-models-12.2], [grid-models-13.1], [grid-models-15.2], [grid-models-19.2], [grid-models-21.2], [grid-models-22.3], [grid-models-27.2], [grid-models-30.2], [grid-models-30.3].
- Свои e2e-кейсы: [test-cases.md](../../../../sdd-specs/openspec/changes/compare-model-versions/test-cases.md) — [grid-models-09.2], [grid-models-10.2], [grid-models-11.3], [grid-models-13.2], [grid-models-14.1], [grid-models-15.3], [grid-models-16.1], [grid-models-17.2], [grid-models-18.2], [grid-models-19.3], [grid-models-20.2], [grid-models-22.2], [grid-models-23.2], [grid-models-24.1], [grid-models-25.1], [grid-models-26.1], [grid-models-27.1], [grid-models-28.2], [grid-models-29.2], [grid-models-29.3], [grid-models-30.1], [grid-models-31.2], [grid-models-32.2].

## Impact

Изменяется только sdd-frontend: модуль `src/app/features/grid-models/`, метод чтения карточки в `GridModelsService`, компонент сравнения и его состояние, отдельная чистая функция сравнения, unit-тесты рядом с кодом и новый набор Playwright в `tests/e2e/compare-model-versions.spec.ts`. Существующий компонент карточки подключает новый компонент. Конфигурация развёртывания не меняется.
