# Автотесты sdd-backend

| Папка | Проект | Что проверяем |
|---|---|---|
| `unit/` | Sdd.Api.UnitTests | Логику без HTTP и инфраструктуры |
| `integration/` | Sdd.Api.IntegrationTests | API целиком: запрос → ответ, через `WebApplicationFactory<Program>` |

## Связь со спецификацией
Сценарий спецификации (`sdd-specs/openspec/specs/<capability>/spec.md`) раскладывается на тест-кейсы в
`test-cases.md` изменения. Автотест реализует один тест-кейс и помечается его ID и ID сценария:

```csharp
[Fact(DisplayName = "[system-status-01.1] Статус бэкенда по API")]
[Trait("Scenario", "system-status-01")]
[Trait("TestCase", "system-status-01.1")]
```

- `dotnet test --filter Scenario=system-status-01` — все тесты сценария (и unit, и integration)
- `dotnet test --filter TestCase=system-status-02.1` — тест конкретного тест-кейса
- Сценарий без тестов = непокрытое требование; это ловит `/opsx:verify`.
