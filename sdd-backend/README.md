# sdd-backend

API и бизнес-логика (backend). Работа ведётся по SDD: требования — в репозитории `sdd-specs`, здесь — код и автотесты.
Порядок работы и правила — в [AGENTS.md](AGENTS.md) и [../README.md](../README.md).

## Пилот «Сеть»: реестр и согласование моделей

Локальный стенд без Kubernetes (из корня SDD):

```powershell
docker compose -p sdd-grid-demo -f sdd-backend/deploy/compose.demo.yaml up --build -d
```

Адрес: http://localhost:8081; БД в постоянном Docker volume `sdd-grid-demo_grid-data`.
Для остановки используйте ту же команду с `stop` вместо `up --build -d`.

Контракт: `../sdd-specs/contracts/grid-models-api.yaml` 1.0.0. Требования и тест-кейсы:
`../sdd-specs/openspec/changes/archive/2026-10-27-add-grid-model-workflow/`.

API использует PostgreSQL 17. В Kubernetes Secret, Service и PVC включены в `deploy/k8s`;
`../deploy.cmd` собирает и разворачивает весь стек. Данные сохраняются в PVC `sdd-grid-data`.
Демонстрационные модели создаются только при первом обращении к пустому хранилищу.

Для локального `dotnet run --project src/Sdd.Api` задайте переменную
`ConnectionStrings__GridModels=Host=localhost;Database=sdd;Username=sdd;Password=<пароль>;Timeout=5`.
`/healthz/ready` проверяет БД, `/healthz/live` — процесс.

Все xUnit-тесты с настоящей PostgreSQL, без локального SDK:

```powershell
docker compose -p sdd-grid-qa -f tests/compose.yaml up --build --abort-on-container-exit --exit-code-from tests
```

Каждый запуск интеграционных тестов создаёт свою схему БД и удаляет её после тестов.
При использовании локального SDK задайте `GRID_TEST_CONNECTION` и выполните `dotnet test`.
Временное окружение можно остановить командой `docker compose -p sdd-grid-qa -f tests/compose.yaml down`.

Пилот не проверяет личность: `organizationId` — демонстрационная атрибуция, все участники могут выполнять действия.
До внешнего использования нужны SSO, проверка полномочий и замена демонстрационного пароля Secret.
Проверяются структура и ссылки объектов, а не электрические режимы или профиль CIM.
Хранилище малого пилота — одна транзакционная JSONB-запись; для большого реестра нужна нормализация.
