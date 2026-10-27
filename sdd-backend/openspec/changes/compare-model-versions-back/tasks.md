# Tasks

План только для sdd-backend. Выполнение ещё не начато. Источники — [proposal.md](proposal.md), [design.md](design.md) и кейсы QA по ссылкам в proposal. Сначала автотест, затем исправление только при выявленном отклонении; прохождение теста на существующем коде не требует искусственного изменения реализации.

Для кейса grid-models-28.1 пользователь подтвердил `409 invalid_transition`; решение записано в [BACK-01](review-notes.md). Уточнение завершено, реализация и тесты ещё не выполнены. Отметка выполнения ставится только после фактической проверки, а не после написания плана.

## 1. Подготовка проверок

- [x] 1.1 Зафиксировать решение по BACK-01 и сверить ожидание с хранилищем: пользователь подтвердил 409 invalid_transition, кейс grid-models-28.1 уже содержит это ожидание; изменение sdd-specs не требуется.
- [ ] 1.2 Подготовить изолированную PostgreSQL для интеграционных тестов через существующий GRID_TEST_CONNECTION или tests/compose.yaml; проверка — успешное создание и освобождение схемы GridFixture без изменения демонстрационной БД.
- [ ] 1.3 Подготовить tests/integration/GridComparisonData.cs и использование GridFixture в tests/integration/CompareModelVersionsTests.cs: собственная модель для каждого теста, сохранённые документы и метаданные, снимки состояния, отдельный источник отказа подключения; проверка — сборка проекта интеграционных тестов и отсутствие зависимости данных между тестами.

## 2. Выдача исходных документов

- [ ] 2.1 Автотест [grid-models-09.1] в tests/integration/CompareModelVersionsTests.cs: выдача всех статусов, исходных идентификаторов, баз и полных документов; проверка — dotnet test --filter TestCase=grid-models-09.1.
- [ ] 2.2 Автотест [grid-models-10.1] в tests/integration/CompareModelVersionsTests.cs: два черновика без опубликованной версии; проверка — dotnet test --filter TestCase=grid-models-10.1.
- [ ] 2.3 Автотест [grid-models-11.1] в tests/integration/CompareModelVersionsTests.cs: точные поля двух версий и неизменность документов, статусов, revision, events и changes при двух GET, в ответах и БД; проверка — dotnet test --filter TestCase=grid-models-11.1.
- [ ] 2.4 Автотест [grid-models-12.1] в tests/integration/CompareModelVersionsTests.cs: объекты только одной стороны выдаются без объединения документов; проверка — dotnet test --filter TestCase=grid-models-12.1.
- [ ] 2.5 Автотест [grid-models-15.1] в tests/integration/CompareModelVersionsTests.cs: сохранённые дубли ID, порядок объектов и issues доступны целиком; проверка — dotnet test --filter TestCase=grid-models-15.1.
- [ ] 2.6 Автотест [grid-models-17.1] в tests/integration/CompareModelVersionsTests.cs: исходный порядок links в обеих версиях; проверка — dotnet test --filter TestCase=grid-models-17.1.
- [ ] 2.7 Автотест [grid-models-18.1] в tests/integration/CompareModelVersionsTests.cs: сохранённые значения типа объекта; проверка — dotnet test --filter TestCase=grid-models-18.1.
- [ ] 2.8 Автотест [grid-models-19.1] в tests/integration/CompareModelVersionsTests.cs: состав, длина, повторы и порядок links; проверка — dotnet test --filter TestCase=grid-models-19.1.
- [ ] 2.9 Автотест [grid-models-20.1] в tests/integration/CompareModelVersionsTests.cs: точные метаданные и порядок objects без нормализации ответа; проверка — dotnet test --filter TestCase=grid-models-20.1.
- [ ] 2.10 Автотест [grid-models-21.1] в tests/integration/CompareModelVersionsTests.cs: ID со сменой значения, регистра и окружающими пробелами выдаются точно; проверка — dotnet test --filter TestCase=grid-models-21.1.
- [ ] 2.11 Автотест [grid-models-22.1] в tests/integration/CompareModelVersionsTests.cs: пустые и пробельные ID не удаляются и не исправляются, issues сохраняются; проверка — dotnet test --filter TestCase=grid-models-22.1.
- [ ] 2.12 Автотест [grid-models-23.1] в tests/integration/CompareModelVersionsTests.cs: документы со всеми проблемными ID выдаются целиком как 200 Model; проверка — dotnet test --filter TestCase=grid-models-23.1.
- [ ] 2.13 При выявленном отклонении исправить выдачу или сохранение данных в src/Sdd.Api/Features/GridModels в пределах контракта 1.0.0; проверка — тесты группы проходят. Если существующая реализация достаточна, подтвердить это результатом тестов без изменения production-кода.

## 3. Ошибки API и запрет согласования

- [ ] 3.1 Автотест [grid-models-29.1] в tests/integration/CompareModelVersionsTests.cs: 404 not_found для отсутствующей модели и 503 unavailable для изолированного отказа БД, строковое message, отсутствие подмены ошибочного ответа успешным; проверка — dotnet test --filter TestCase=grid-models-29.1.
- [ ] 3.2 Автотест [grid-models-28.1] в tests/integration/CompareModelVersionsTests.cs: точная выдача ошибочных значений, issues и отказ submit с 409 invalid_transition при сохранении статусов и документов; проверка — dotnet test --filter TestCase=grid-models-28.1. До исправления подтвердить падение из-за текущего 400 validation.
- [ ] 3.3 Исправить отказ submit ошибочного draft в GridRules.Act на 409 invalid_transition по BACK-01; сохранить состояние модели, форму Error, коды других ошибок и поведение остальных действий. Проверка — тесты группы и существующий регресс согласования проходят после исправления.

## 4. Регресс прежнего сравнения при загрузке

- [ ] 4.1 Автотест [grid-models-31.1] в tests/integration/CompareModelVersionsTests.cs: POST версии с перестановкой links не создаёт modified, последующий GET сохраняет документы и changes; проверка — dotnet test --filter TestCase=grid-models-31.1.
- [ ] 4.2 Автотест [grid-models-32.1] в tests/integration/CompareModelVersionsTests.cs: POST сохраняет оба объекта с повторяющимся ID, прежнее сравнение использует первый, issues и changes сохраняются при GET; проверка — dotnet test --filter TestCase=grid-models-32.1.
- [ ] 4.3 При выявленной регрессии исправить прежнее сравнение в GridRules.Diff, не добавляя алгоритм нового сравнения и не меняя согласованный стык; проверка — оба новых регрессионных теста и прежние тесты загрузки проходят. Если изменения не нужны, подтвердить это результатами тестов.

## 5. Проверка завершения бэкенд-части

- [ ] 5.1 Проверить оформление локального изменения и соответствие актуальным артефактам хранилища; проверка — openspec validate compare-model-versions-back --strict и openspec status --change compare-model-versions-back, BACK-01 разрешён, все 16 собственных кейсов имеют корректные ID и атрибуты в тестах.
- [ ] 5.2 Все тесты репозитория зелёные при доступной тестовой PostgreSQL; проверка — dotnet test либо существующий контейнерный запуск всех тестов, без пропуска новых кейсов и подмены результата одной сборкой.
- [ ] 5.3 openspec-sdd trace-check --strict без ошибок; при общих пробелах, относящихся к другой стороне, передать их владельцу и не отмечать проверку пройденной до фактического успешного результата. Задачи и тесты фронта в этом репозитории не создавать.
