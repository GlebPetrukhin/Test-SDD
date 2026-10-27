# sdd-frontend

## Пилот «Сеть»

Локальный стенд с постоянной базой без Kubernetes, из корня SDD:

```powershell
docker compose -p sdd-grid-demo -f sdd-backend/deploy/compose.demo.yaml up --build -d
```

Адрес: http://localhost:8081. Данные в Docker volume `sdd-grid-demo_grid-data` сохраняются при перезапуске.
Остановка: `docker compose -p sdd-grid-demo -f sdd-backend/deploy/compose.demo.yaml stop`.

Главная страница содержит реестр моделей, очередь согласования, журнал и справочник организаций.
Выберите модель → загрузите JSON-версию → проверьте объекты и различия → отправьте на согласование →
согласуйте → опубликуйте → скачайте JSON. Для возврата обязателен комментарий, исправления создают новую версию.
Форма импорта по умолчанию содержит текущую опубликованную модель; пример — `public/examples/grid-model.json`.

Данные поступают из .NET API и хранятся в PostgreSQL. Стек разворачивается через `../deploy.cmd`,
открывается через `../open.cmd` по адресу http://localhost:8080. Локальная разработка — `npm start`
(API на http://localhost:5080, `proxy.conf.json`).

Проверки: `npm run build`, `npm run test:ci`, `npm run e2e -- --grep-invert @smoke`.
Без локального Node/npm можно использовать контейнер с браузером:

```powershell
docker build -f tests/Dockerfile -t sdd-grid-frontend-tests .
docker run --rm --ipc=host sdd-grid-frontend-tests
```

Тесты пользовательских сценариев мокают `/api/*` по контракту 1.0.0. Проверка развёрнутого стека:
`E2E_BASE_URL=http://localhost:8080 npm run e2e:smoke` (PowerShell: сначала `$env:E2E_BASE_URL='http://localhost:8080'`).
Демонстрационный выбор организации не заменяет вход в систему. Импорт JSON не проверяет электрическую корректность модели.

веб-клиент (frontend). Работа ведётся по SDD: требования — в репозитории `sdd-specs`, здесь — код и автотесты.
Порядок работы и правила — в [AGENTS.md](AGENTS.md) и [../README.md](../README.md).
