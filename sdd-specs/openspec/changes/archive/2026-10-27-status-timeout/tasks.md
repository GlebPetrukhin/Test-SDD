# Tasks

## 1. Спецификация и контракт

- [x] 1.1 Уточнение пройдено: срок 5 с принят PO, фронт подтвердил, что таймаут уже 5 с
- [x] 1.2 Общий design.md согласован: срок обеспечивает фронт, контракт без изменений (версия 1.0.0)
- [x] 1.3 Тест-кейсы на ревью QA: изменены [system-status-04.2], [system-status-04.4], остальные кейсы 03.x и 04.x перенесены без правок

## 2. Фронт (sdd-frontend)

- [x] 2.1 Локальное изменение sdd-frontend/openspec/changes/status-timeout-front закрыто и заархивировано
- [x] 2.2 Автотесты кейсов [system-status-04.2], [system-status-04.4] зелёные; кейсы [system-status-03.1], [system-status-03.2], [system-status-03.3], [system-status-04.1], [system-status-04.3] остались зелёными

## 3. Приёмка и архивация

- [x] 3.1 PO принял по сценарию [system-status-04] (в модели — по прогону e2e [system-status-04.4]; на стенде — smoke [system-status-03.3] после deploy)
- [x] 3.2 openspec-sdd trace-check --strict без ошибок
- [x] 3.3 openspec archive status-timeout
- [x] 3.4 openspec-sdd merge-test-cases status-timeout; пробел про таймаут снят из Gaps каталога
