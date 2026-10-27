# Test-SDD — пилот «Сеть»

Песочница, в которой команда проходит SDD-процесс на OpenSpec на реальном стеке: требования → контракт API → бэк → фронт → автотесты → Kubernetes.

## Приложение «Сеть»

Рабочий демонстрационный пилот обмена моделями электрической сети: реестр → загрузка JSON-версии → проверка и сравнение → согласование или возврат → публикация → скачивание. Есть защита от конфликтов версий и журнал действий. Данные хранятся в PostgreSQL.

Организации демонстрационные, проверка личности и полномочий не реализована. Формат обмена — простой JSON; CIM/XML и расчёты электрических режимов не входят в пилот. Пароли в демонстрационных манифестах предназначены для локального стенда.

### Скачать и запустить

```sh
git clone https://github.com/GlebPetrukhin/Test-SDD.git
cd Test-SDD
docker compose -p sdd-grid-demo -f sdd-backend/deploy/compose.demo.yaml up --build -d
```

Открыть [приложение на localhost:8081](http://localhost:8081). Нужен Docker с Linux-контейнерами. Docker volume `sdd-grid-demo_grid-data` сохраняет данные при перезапуске.

Для Kubernetes используйте `deploy.cmd` на Windows или `./deploy.sh` на Linux, затем `open.cmd` / `./open.sh`; адрес — [localhost:8080](http://localhost:8080).

Актуальные требования и 16 тест-кейсов: [grid-models](sdd-specs/openspec/specs/grid-models/). История принятого изменения: [архив OpenSpec](sdd-specs/openspec/changes/archive/2026-10-27-add-grid-model-workflow/). Пример JSON: [grid-model.json](sdd-frontend/public/examples/grid-model.json).

### Проверки

Из корня проекта:

```sh
node openspec-sdd/bin/openspec-sdd.mjs trace-check --strict --store sdd-specs
docker compose -p sdd-grid-qa -f sdd-backend/tests/compose.yaml up --build --abort-on-container-exit --exit-code-from tests
```

Проверки фронтенда описаны в [sdd-frontend/README.md](sdd-frontend/README.md). Настройка OpenSpec и рабочего места — `setup.cmd` / `./setup.sh`.

### Пример процесса разработки

Папка [«Пример работы в GTP cowork»](<Пример работы в GTP cowork/>) содержит сохранённую переписку о разработке, включённую по просьбе владельца. Исторические логи переписки могут описывать промежуточные состояния; актуальное состояние отражено в исходниках и спецификациях.

## Состав

| Репозиторий | Стек | Автотесты | Владелец |
|---|---|---|---|
| `sdd-specs/` | Хранилище спецификаций (OpenSpec store, схема `sdd`): поведение, стык, контракты `contracts/`, тест-кейсы + `workspace/` со скриптами команды | — | PO, QA (кейсы), бэк и фронт (стык) |
| `sdd-backend/` | C# / ASP.NET Core (.NET 10), Minimal API; свой `openspec/` (схема `sdd-app`) | xUnit: `tests/unit`, `tests/integration` | Бэкенд |
| `sdd-frontend/` | Angular 22 (standalone, zoneless, signals); свой `openspec/` (схема `sdd-app`) | Vitest рядом с кодом, Playwright `tests/e2e` | Фронтенд |
| `openspec-sdd/` | Дополнение к OpenSpec: схемы `sdd` и `sdd-app`, команды `openspec-sdd` | `npm test` (node:test) | Владелец процесса |

Оба сервиса — Linux-контейнеры с манифестами Kubernetes (`deploy/k8s`, kustomize). Одинаково разворачиваются
в кластере на **Windows** (Docker Desktop / Rancher Desktop / minikube) и на **Linux** (kind / minikube / k3d / любой кластер).
Фронт (nginx) проксирует `/api/` на Service `sdd-backend`, поэтому наружу открывается только фронт.

## Схема хранения: у фичи три слоя

Спека поведения одна на всех и короткая, стык общий, реализация у каждого приложения своя — и агент одной стороны
не читает реализацию другой. Автотесты лежат в репозиториях бэка и фронта: это зона ответственности их владельцев.

| Слой | Где лежит | Кто пишет | Делится по приложениям? |
|---|---|---|---|
| Поведение | `sdd-specs`: дельта `spec.md` изменения | PO, на уточнении — QA, бэк, фронт | Нет, одно на фичу |
| Стык | `sdd-specs`: `design.md` изменения, `contracts/<cap>-api.yaml` | Бэк и фронт вместе, QA ревьюит | Нет, общий |
| Проверка: что проверяем | `sdd-specs`: `test-cases.md` изменения → каталог `specs/<cap>/test-cases.md` | QA, на ревью — бэк и фронт | Нет, по сценариям спеки; у кейса указан репозиторий-владелец (Automation) |
| Реализация | `sdd-backend` / `sdd-frontend`: `openspec/changes/<фича>-back\|-front/` — указатель, `design.md`, `tasks.md` | Владелец приложения | Да, у каждого свой |
| Проверка: автотесты | `sdd-backend/tests`, `sdd-frontend/src/**/*.spec.ts`, `sdd-frontend/tests/e2e` — по ID кейсов | Владелец приложения | Да, у каждого свои |

Куда писать — спросите себя, кто может это увидеть или проверить:

| Если это… | Пишем в | Пример |
|---|---|---|
| Видно пользователю, проверяемо без кода | Спека (`sdd-specs`) | «Если бэкенд не ответил — „Система недоступна“» |
| Договорённость бэка и фронта | Общий `design.md`, контракт (`sdd-specs`) | Формат `GET /api/status`, кто проверяет таймаут |
| Видно только внутри одного приложения | `design.md` локального изменения приложения | Класс `SystemStatusEndpoints`, rxjs `timeout` в сервисе |

```
sdd-specs/                     schema: sdd
  openspec/specs/<cap>/        spec.md (как работает сейчас) · test-cases.md (каталог кейсов)
  openspec/changes/<фича>/     proposal · specs (дельта) · design (стык) · test-cases · tasks (карта по репозиториям)
  contracts/<cap>-api.yaml     контракт API (OpenAPI 3.1, версия в info.version)
sdd-backend/, sdd-frontend/    schema: sdd-app, references: [sdd-specs] — хранилище только для чтения
  openspec/changes/<фича>-back|-front/   proposal (указатель) · design (внутренности) · tasks (чек-лист с ID кейсов)
```

> Этот GitHub-репозиторий объединяет четыре каталога: `sdd-specs`, `sdd-backend`, `sdd-frontend` и `openspec-sdd`.
> Они сохраняют отдельные области ответственности и свои OpenSpec-конфигурации. Для работы достаточно одного клонирования; вложенных Git-репозиториев и submodule здесь нет.

## Что нужно установить

| Инструмент | Windows | Linux |
|---|---|---|
| Git | `winget install Git.Git` | пакетный менеджер |
| Node.js 22.22.3+ или 24.15+ | `winget install OpenJS.NodeJS.LTS` | nodejs.org / nvm |
| .NET SDK 10 | `winget install Microsoft.DotNet.SDK.10` | learn.microsoft.com/dotnet/core/install/linux |
| Docker + Kubernetes | Docker Desktop (Settings → Kubernetes → Enable) или Rancher Desktop | Docker Engine + kind / minikube / k3d |
| kubectl | идёт с Docker Desktop / Rancher Desktop | kubernetes.io/docs/tasks/tools |

## Первые шаги

1. **Настройка** — двойной клик по `setup.cmd` (Windows) или `./setup.sh` (Linux). Скрипт проверит инструменты, поставит OpenSpec,
   зарегистрирует store `sdd-specs`, включит расширенный набор команд, выполнит `npm ci`, `dotnet restore` и установит браузер для Playwright.
2. **Открыть** `SDD.code-workspace` в VS Code / Cursor — хранилище, бэк, фронт и дополнение в одном окне (удобно PO, QA и владельцу процесса). Разработчику достаточно открыть свой репозиторий.
3. **Агент в репозитории приложения пишет только в свой репозиторий.** Спеки и изменения хранилища он читает командами
   `openspec show ... --store sdd-specs`, свои кейсы — `openspec-sdd cases --repo <репозиторий>`. Чтобы читать файлы контракта
   (`../sdd-specs/contracts`), в Claude Code запускайте `claude --add-dir ../sdd-specs` — только для чтения, правила это закрепляют.
4. **Развернуть стек** — двойной клик по `deploy.cmd` (Windows) или `./deploy.sh 0.1.0` (Linux).
   Открыть приложение — `open.cmd` / `./open.sh` (поднимает `kubectl port-forward` и открывает http://localhost:8080).
   Логи всех запусков и сборок — в `SDD/.logs`.
5. **Закрыть демо-изменение** (см. ниже) — это первое упражнение команды.

## Демо-изменение `add-system-status` (закрыто)

Первая фича, прошедшая весь цикл SDD (ещё по прежней схеме, когда всё лежало в хранилище): на главной странице
показывается «Система доступна / недоступна» и версия бэкенда.
Действующая спецификация — `sdd-specs/openspec/specs/system-status/spec.md`, история изменения —
`sdd-specs/openspec/changes/archive/2026-10-27-add-system-status/`.

| Шаг | Где | Итог |
|---|---|---|
| proposal, spec (4 сценария с ID), design с контрактом `GET /api/status` и разделом про k8s, tasks | sdd-specs | ✅ `openspec validate --strict` |
| Backend 1.1–1.4: тесты `[system-status-01..02]` → реализация → `APP_VERSION` в манифесте | sdd-backend | ✅ 8 тестов |
| Frontend 2.1–2.4: unit + E2E `[system-status-03..04]` → реализация | sdd-frontend | ✅ 4 unit + 3 E2E |
| 3.1 Проверка на стенде в Kubernetes (Docker Desktop, Windows) | кластер | ✅ вручную в браузере; `npm run e2e:smoke` — после установки Node.js |
| verify → archive | sdd-specs | ✅ все сценарии покрыты тестами, спецификация влита в `openspec/specs` |
| test-cases.md — 11 тест-кейсов, добавлены задним числом при введении артефакта; автотесты переименованы под ID кейсов | все три | ✅ каждый кейс = один автотест |

Сквозная проверка нашла пробел: при «зависшем» бэкенде страница бесконечно показывала «Проверяем…», хотя сценарий
`[system-status-04]` требует «Система недоступна». Добавили тест и таймаут — хорошая иллюстрация того, зачем сценариям ID и тесты.

Следующая фича начинается с `/opsx:explore` или `/opsx:new <фича>` в `sdd-specs` (см. «Как проходит одна фича»).

## Как проходит одна фича

```
 sdd-specs (хранилище)                           sdd-backend               sdd-frontend
 ─────────────────────                           ───────────               ────────────
 1. Черновик: PO — /opsx:new <фича> → proposal, дельта spec.md
 2. Уточнение: PO + QA + бэк + фронт доводят сценарии (ID [cap-NN])
 3. Стык: бэк + фронт — design.md (только стык) и contracts/*.yaml;
    QA — test-cases.md (кейсы, Automation = репозиторий-владелец)
 4. Планирование: tasks.md — карта по репозиториям; ревью (PR в sdd-specs)
                                                  5. /opsx:new <фича>-back  5. /opsx:new <фича>-front
                                                     указатель → design →      (параллельно, фронт
                                                     tasks; /opsx:apply:        на моках по контракту)
                                                     автотест по ID → код
 6. deploy + smoke на стенде; openspec-sdd trace-check --strict (всё ↔ всё)
                                                  7. /opsx:archive          7. /opsx:archive
                                                     <фича>-back               <фича>-front
 8. Приёмка PO по сценариям → openspec archive <фича> → openspec-sdd merge-test-cases <фича>
    (дельта → specs/<cap>/spec.md, кейсы → specs/<cap>/test-cases.md)
```

Договорённости зашиты в `openspec/config.yaml` каждого репозитория, агент получает их автоматически:

- **Язык**: артефакты на русском, служебные маркеры OpenSpec (`### Requirement:`, `#### Scenario:`, `WHEN/THEN`) не переводятся.
- **ID**: сценарий `[auth-01]`, тест-кейс `[auth-01.1]`, автотест называется по ID кейса. Поиск:
  `dotnet test --filter Scenario=auth-01` / `TestCase=auth-01.1`, `npx playwright test --grep "auth-01"`.
- **Хранилище только для чтения из приложений**: бэк и фронт подключают `sdd-specs` через `references`; неверное требование —
  `/opsx:update` в `sdd-specs`, не правка у себя.
- **Контракт** — файл `sdd-specs/contracts/<cap>-api.yaml`; изменение контракта = новая `info.version` и запись в общем `design.md`.
- **Тест-кейсы** (артефакт схемы `sdd` из дополнения): по каждому сценарию — уровень, данные, шаги, ожидаемый результат и
  репозиторий-владелец; каталог `specs/<cap>/test-cases.md` — действующий регресс для QA, обновляется `merge-test-cases`.
- **Сверка** `trace-check.cmd` / `./trace-check.sh` (= `openspec-sdd trace-check`): сценарии ↔ кейсы ↔ автотесты,
  кейсы изменения ↔ локальные изменения приложений, нумерация задач; с `--strict` перед verify и archive.
- **Тест первым**: по каждому кейсу сначала автотест с его ID (красный), потом код.
- **Kubernetes**: конфигурация только через env, без привязки к ОС; новые переменные/порты/сервисы → раздел в design и задача на `deploy/k8s`.

## Наш OpenSpec: стандартный + дополнение openspec-sdd

OpenSpec ставится стандартный и обновляется как обычно. Поверх него — репозиторий `openspec-sdd`: он кладёт схему процесса
`sdd` (хранилище) и `sdd-app` (приложения) в штатную папку пользовательских схем OpenSpec и добавляет команды
`openspec-sdd` (`install`, `doctor`, `trace-check`, `cases`, `merge-test-cases`). Сам OpenSpec не меняется. Доработка процесса = правка в `openspec-sdd` + новая версия; у участников —
`git pull` и `setup`, `openspec-sdd doctor` покажет, у кого устарело. Подробно — `openspec-sdd/README.md`.

## Команды OpenSpec (Claude Code; в Codex — `$openspec-<имя>`)

| Команда | Где | Зачем |
|---|---|---|
| `/opsx:onboard` | любой репо | Обучение OpenSpec на реальной задаче |
| `/opsx:explore` | sdd-specs | Подумать над идеей без артефактов |
| `/opsx:new <фича>` → `/opsx:continue` | sdd-specs | Изменение в хранилище пошагово: proposal → specs → design → test-cases → tasks |
| `/opsx:propose <идея>`, `/opsx:ff` | sdd-specs | То же сразу / догенерировать оставшееся |
| `/opsx:update` | sdd-specs | Поправить артефакты изменения |
| `/opsx:new <фича>-back\|-front` → `/opsx:continue` | sdd-backend / sdd-frontend | Локальное изменение: указатель → design → tasks |
| `/opsx:apply`, `/opsx:verify` | sdd-backend / sdd-frontend | Реализовать свою часть по своим кейсам / сверить |
| `/opsx:archive` | приложения, затем sdd-specs | Закрыть локальные изменения, потом изменение в хранилище (+ `openspec-sdd merge-test-cases`) |

CLI для людей: `openspec list`, `openspec view` (дашборд), `openspec show <change>`, `openspec validate --all`, `openspec doctor`.

## Работа с GitHub

Все четыре каталога версионируются в этом репозитории. Обновления получать через `git pull` из корня `Test-SDD`; после обновления инструментов процесса повторить `setup`. OpenSpec сам не делает pull/push.
Для общего кластера опубликуйте образы в реестр и задайте их через `kustomize edit set image` в `deploy/k8s`.
