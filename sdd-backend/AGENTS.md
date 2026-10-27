# sdd-backend — API и бизнес-логика

Стек: C# / ASP.NET Core (.NET 10), Minimal API. Тесты: xUnit. Работает в Kubernetes в Linux-контейнере.

Репозиторий работает по SDD через OpenSpec. Здесь свой `openspec/` (схема `sdd-app`): **локальные изменения** этого
приложения — указатель на фичу, внутренний design, чек-лист. Поведение, стык с фронтом, контракт API и тест-кейсы живут в
хранилище `sdd-specs`; оно подключено **только для чтения** (`references: [sdd-specs]` в `openspec/config.yaml`).

## Правила для агента
1. Перед работой: `openspec doctor` (хранилище `sdd-specs` — ok) и `openspec-sdd doctor`.
2. Фича из хранилища → здесь локальное изменение `<изменение>-back`: `/opsx:new <изменение>-back`, затем `/opsx:continue`
   (proposal-указатель → design → tasks). Хранилище читать: `openspec show <изменение> --type change --store sdd-specs`,
   `openspec show <spec> --type spec --store sdd-specs`; контракт — `../sdd-specs/contracts/*.yaml` (только чтение).
3. Свои тест-кейсы: `openspec-sdd cases --repo sdd-backend --change <изменение>` — у них поле Automation начинается с `sdd-backend/`.
   На каждый — задача в `tasks.md` с его ID.
4. В `sdd-specs` ничего не пишешь. Требование неверно или неполно, контракт мешает — останавливаешься и предлагаешь
   `/opsx:update` в `sdd-specs` (это делает владелец хранилища).
5. Порядок в `/opsx:apply`: автотест по ID тест-кейса (красный) → реализация (зелёный) → `[x]` в `tasks.md` этого репозитория.
6. Автотест реализует тест-кейс из `test-cases.md` изменения: `[Fact(DisplayName = "[<scenario>.<n>] …")]` +
   `[Trait("Scenario", "<scenario>")]` + `[Trait("TestCase", "<scenario>.<n>")]`. Технический тест без кейса — `[tech]` в DisplayName.
7. Контракт API — `sdd-specs/contracts/*.yaml` и общий design.md изменения; отклоняться нельзя.
8. Конфигурация — только через переменные окружения; новые переменные/порты/тома → правка `deploy/k8s/` в той же задаче.
9. После своих задач — `openspec-sdd trace-check` (перед `/opsx:verify` — `openspec-sdd trace-check --strict`): у каждого кейса есть автотест,
   у каждого автотеста — кейс, у каждого своего кейса — задача. Ошибок быть не должно.
10. Всё готово → `/opsx:archive <изменение>-back`; группу бэка в `tasks.md` хранилища отмечает владелец хранилища.

## Структура
- `openspec/changes/<изменение>-back/` — локальные изменения (схема `sdd-app`), `openspec/changes/archive/` — завершённые
- `src/Sdd.Api/` — приложение; `Features/<Capability>/` — по папке на capability из sdd-specs, подключение в `Program.cs` через `app.Map<Capability>()`
- `tests/unit/` — модульные тесты (Sdd.Api.UnitTests)
- `tests/integration/` — интеграционные тесты API через `WebApplicationFactory<Program>` (Sdd.Api.IntegrationTests)
- `deploy/k8s/` — Deployment + Service (kustomize), `Dockerfile` — образ

## Команды
| Что | Команда |
|---|---|
| Все тесты | `dotnet test` |
| Тесты одного сценария | `dotnet test --filter Scenario=system-status-01` |
| Тест одного тест-кейса | `dotnet test --filter TestCase=system-status-02.1` |
| Запуск локально | `dotnet run --project src/Sdd.Api` → http://localhost:5080 |
| Образ | `docker build -t sdd-backend:dev .` |
| Манифесты | `kubectl kustomize deploy/k8s` |
| Развернуть весь стек | `../sdd-specs/workspace/deploy.ps1` (Windows) / `deploy.sh` (Linux) |
