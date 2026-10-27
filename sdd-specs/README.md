# sdd-specs

Хранилище спецификаций продукта (OpenSpec **store**): поведение, стык бэка и фронта, контракты API и тест-кейсы —
общее для всех приложений. `sdd-backend` и `sdd-frontend` подключают его только для чтения (`references: [sdd-specs]`)
и ведут реализацию в своих локальных изменениях (схема `sdd-app`).

- `openspec/specs/` — действующие спецификации (как система работает сейчас): `spec.md` и каталог тест-кейсов `test-cases.md`
- `openspec/changes/` — предлагаемые изменения (proposal → specs → design → tasks)
- `openspec/changes/archive/` — завершённые изменения
- `openspec/config.yaml` — правила команды для всех артефактов (язык, ID сценариев, разбиение задач по репозиториям, стек, Kubernetes)
- `contracts/` — контракты API (OpenAPI 3.1)
- `openspec-sdd.json` — настройки дополнения `openspec-sdd` (где искать автотесты для сверки)
- `workspace/` — скрипты команды: настройка рабочего места и развёртывание стека в Kubernetes (Windows и Linux);
  `workspace/root/` — README и запускалки для корня SDD, их раскладывает `setup`

Ожидаемая раскладка на диске — три репозитория рядом:

```
SDD/
  sdd-specs/     ← этот репозиторий
  sdd-backend/
  sdd-frontend/
```

Новый участник: клонирует три репозитория в одну папку и запускает
`sdd-specs\workspace\setup.cmd` (Windows) или `sdd-specs/workspace/setup.sh` (Linux) —
скрипт разложит в корень README и запускалки и настроит всё остальное.

## Зависимость: дополнение openspec-sdd

`openspec/config.yaml` использует схему **`sdd`** из дополнения `../openspec-sdd` (ставится поверх стандартного OpenSpec,
см. его README). Без дополнения OpenSpec сообщит, что схемы `sdd` нет: запустите `setup` или `openspec-sdd install`.
