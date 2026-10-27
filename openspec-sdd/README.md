# openspec-sdd — дополнение к OpenSpec для процесса SDD

Ставится **поверх стандартного OpenSpec** и ничего в нём не меняет: сам OpenSpec устанавливается и обновляется как обычно,
а дополнение кладёт нашу схему процесса в штатную папку пользовательских схем OpenSpec и добавляет инструменты.

| Что | Где |
|---|---|
| Схема **`sdd`** — для хранилища спецификаций: стандартная `spec-driven` (OpenSpec 1.15.0) + артефакт **test-cases** между design и tasks | `schemas/sdd/` |
| Схема **`sdd-app`** — для репозиториев приложений (бэк, фронт): локальное изменение «указатель на фичу в хранилище → внутренний design → чек-лист», без дельты спеки | `schemas/sdd-app/` |
| `openspec-sdd install` — положить схемы в пользовательскую папку OpenSpec | Windows: `%LOCALAPPDATA%\openspec\schemas`, Linux/macOS: `~/.local/share/openspec/schemas` |
| `openspec-sdd doctor` — OpenSpec подходящей версии? схемы установлены и актуальны? проект на них? | |
| `openspec-sdd trace-check [--strict]` — сверка «сценарии ↔ тест-кейсы ↔ автотесты», кейсы ↔ локальные изменения приложений, нумерация задач | `lib/trace-check.mjs`, `lib/task-numbering.mjs` |
| `openspec-sdd cases --repo <имя> [--change <изм.>]` — какие кейсы хранилища автоматизирует этот репозиторий | `lib/cases.mjs` |
| `openspec-sdd merge-test-cases <изменение>` — после `openspec archive` влить кейсы изменения в каталог `openspec/specs/<capability>/test-cases.md` | `lib/merge.mjs` |

## Схема репозиториев

```
<хранилище>/            schema: sdd       — общее для всех: поведение, стык, контракт, тест-кейсы
  openspec/specs/<cap>/spec.md            как продукт работает сейчас
  openspec/specs/<cap>/test-cases.md      каталог тест-кейсов (регресс для QA)
  openspec/changes/<фича>/                proposal · specs (дельта) · design (только стык) · test-cases · tasks (карта по репозиториям)
  contracts/<имя>-api.yaml                контракт API (OpenAPI), версия в info.version
<бэк>/, <фронт>/        schema: sdd-app, references: [<хранилище>] — хранилище только для чтения
  openspec/changes/<фича>-back/           proposal (указатель) · design (внутренности) · tasks (чек-лист, ID кейсов)
  tests/ …                                автотесты кейсов, у которых Automation начинается с имени этого репозитория
```

Какой кейс чей, решает поле **Automation** кейса: первый сегмент пути — имя репозитория (`sdd-backend/tests/...`).
`trace-check` проверяет, что каждый автоматизируемый кейс изменения хранилища упомянут в локальном изменении своего
репозитория (активном или уже заархивированном `<дата>-<изменение>-back|-front` — локальные изменения архивируются
раньше изменения хранилища) и что все ID кейсов, упомянутые в активных локальных изменениях, существуют в хранилище.
Репозиторий приложения узнаётся по схеме `sdd-app` в `openspec/config.yaml`, даже если OpenSpec создал в нём пустую `openspec/specs`.

Совместимость: OpenSpec `>=1.15.0 <2.0.0` (поле `openspec.compatible` в `package.json`), Node.js 20.19+ для команд.
Зависимостей нет.

## Установка

Обычно всё делает `setup` команды (`sdd-specs/workspace/setup.cmd` / `setup.sh`). Вручную:

```bash
npm install -g ./openspec-sdd      # команда openspec-sdd в PATH
openspec-sdd install               # схема sdd -> пользовательская папка OpenSpec
openspec-sdd doctor
```

Без Node.js (только схема, без команд): `openspec-sdd\install.ps1` (Windows) или `openspec-sdd/install.sh`.

Проверка, что OpenSpec видит схему: `openspec schema which sdd` → `Source: user`.

## Подключение проекта

- `openspec/config.yaml` хранилища спецификаций: `schema: sdd`; репозиториев приложений: `schema: sdd-app` и
  `references: [<id хранилища>]`. Свою копию схемы в `openspec/schemas/` не держать — она перекроет
  дополнение (`doctor` об этом предупредит).
- `openspec-sdd.json` в корне хранилища — где искать автотесты для `trace-check`:

```json
{ "traceCheck": { "codeRepos": [
  { "path": "../sdd-backend",  "dirs": ["tests"],        "exts": [".cs"] },
  { "path": "../sdd-frontend", "dirs": ["src", "tests"], "exts": [".ts"] }
] } }
```

Без установленного дополнения стандартный OpenSpec на таком проекте не тихо работает «по-старому», а сразу сообщает,
что схемы `sdd` нет — это защита от рассинхрона версий в команде.

## Как дорабатывать и раздавать команде

1. Правка: схема — `schemas/sdd/` (правки относительно оригинальной `spec-driven` помечать `SDD-PATCH(<тема>)`),
   команды — `lib/`, `bin/`.
2. `npm test` — тесты дополнения, в том числе прогон на настоящем OpenSpec (если он установлен).
3. Поднять `version` в `package.json` (0.1.0 → 0.2.0), коммит, push.
4. У участников: `git pull` в `openspec-sdd` и `setup` (или `openspec-sdd install`). Команда `openspec-sdd` после
   `npm install -g ./openspec-sdd` указывает на папку репозитория, поэтому новый код подхватывается сразу; схему нужно
   переустановить — `doctor` покажет, у кого она устарела.

Сгенерированные навыки агентов (`.claude/`, `.agents/` в проектах) создаёт стандартный `openspec init/update` —
дополнение их не трогает. Схемы OpenSpec читает при каждом вызове, поэтому новая версия схемы действует сразу после установки.

## Отличия от оригинального OpenSpec

Найти все наши правки схемы: `git grep -n "SDD-PATCH"`.

| Метка | Что | Как устроено |
|---|---|---|
| `SDD-PATCH(test-cases)` | Артефакт `test-cases` (кейсы по каждому сценарию: ID, уровень, данные, шаги, ожидаемый результат, где автотест, Coverage, Gaps); `tasks` зависит от него | Схема `schemas/sdd`; патч для оригинала — [patches/0001-spec-driven-test-cases.patch](patches/0001-spec-driven-test-cases.patch) |
| — | Каталог тест-кейсов рядом со `spec.md` и его слияние при архивации | OpenSpec терпит лишний файл рядом со `spec.md` (validate/list/show работают, `archive` его не трогает — проверено на 1.15.0); слияние — `openspec-sdd merge-test-cases` |
| — | Сверка прослеживаемости | `openspec-sdd trace-check` |
| — | Нумерация задач для схемы `sdd` (OpenSpec проверяет её только для `spec-driven`) | `openspec-sdd trace-check`, код из OpenSpec 1.15.0 |

История репозитория: первый коммит — схема `spec-driven` из OpenSpec 1.15.0 байт в байт (только имя `sdd`), следующий —
`SDD-PATCH(test-cases)`. Разница между ними и есть патч.

**Нумерация задач.** Валидатор OpenSpec проверяет нумерацию задач в `tasks.md` только для своей встроенной схемы
`spec-driven`, для `sdd` — молчит. Поэтому та же проверка встроена в `openspec-sdd trace-check`: задача не из своей группы
(`1.3` в группе `## 2.`) и повторяющийся ID задачи. Код перенесён из OpenSpec 1.15.0 без изменения правил
(`lib/task-numbering.mjs`, MIT) и сверен с оригиналом на 5000 случайных `tasks.md`. Как и в OpenSpec, это предупреждения;
с `--strict` — ошибки. При обновлении OpenSpec сверить `lib/task-numbering.mjs` с `src/core/validation/task-numbering.ts`.

## Новая версия OpenSpec

1. Обновить OpenSpec, `openspec-sdd doctor` покажет, входит ли версия в `openspec.compatible`.
2. Сравнить новую `spec-driven` с той, от которой сделана `sdd`, и перенести изменения:
   ```bash
   SRC="$(npm root -g)/@fission-ai/openspec/schemas/spec-driven"     # или путь из: openspec schema which spec-driven
   PATCH="$PWD/patches/0001-spec-driven-test-cases.patch"
   rm -rf /tmp/sdd && mkdir -p /tmp/sdd && cp -r "$SRC" /tmp/sdd/sdd
   sed -i '1s/^name: spec-driven$/name: sdd/' /tmp/sdd/sdd/schema.yaml
   (cd /tmp/sdd && git apply -C1 -p3 --directory=sdd "$PATCH")     # не легло — переносить вручную по меткам SDD-PATCH
   ```
   затем заменить `schemas/sdd` результатом (строки `description` схемы — наши, вернуть), проверить `npm test`,
   расширить `openspec.compatible`, поднять версию.

## Как предложить правку в оригинальный OpenSpec

В клоне https://github.com/Fission-AI/OpenSpec из корня: `git apply patches/0001-spec-driven-test-cases.patch` — патч
добавляет артефакт в стандартную `spec-driven`. Тексты инструкций в схеме на английском, как в оригинале; специфика команды
(русский язык, формат ID, пути автотестов) живёт в `config.yaml` проектов и в патч не входит.
