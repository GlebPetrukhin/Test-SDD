# Proposal

## Why

Реализует во фронте изменение хранилища `status-timeout`: срок 5 с для сообщения «Система недоступна» в сценарии `[system-status-04]`.

## What Changes

- Behavior: `sdd-specs/openspec/changes/status-timeout/specs/system-status/spec.md`
- Shared decisions: `sdd-specs/openspec/changes/status-timeout/design.md`
- Contract: `sdd-specs/contracts/system-status-api.yaml`, version 1.0.0 (без изменений)
- Test cases owned by this repository: [system-status-03.1], [system-status-03.2], [system-status-03.3], [system-status-04.1], [system-status-04.2], [system-status-04.3], [system-status-04.4]
  (изменены 04.2 и 04.4, остальные перенесены без правок)

## Impact

- `src/app/features/system-status/` — сервис статуса: таймаут уже 5 с (`STATUS_TIMEOUT_MS`), код не меняется, если тесты не покажут иного.
- `src/app/features/system-status/system-status.service.spec.ts`, `tests/e2e/system-status.spec.ts` — проверки по времени.
- Конфигурация и развёртывание — без изменений.
