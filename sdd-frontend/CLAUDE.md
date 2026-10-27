# sdd-frontend — веб-клиент

Стек: Angular 22 (standalone, zoneless, signals), unit-тесты Vitest, E2E Playwright. В Kubernetes — nginx в Linux-контейнере,
который отдаёт статику и проксирует `/api/` на Service `sdd-backend`.

Репозиторий работает по SDD через OpenSpec. Здесь свой `openspec/` (схема `sdd-app`): **локальные изменения** этого
приложения — указатель на фичу, внутренний design, чек-лист. Поведение, стык с бэком, контракт API и тест-кейсы живут в
хранилище `sdd-specs`; оно подключено **только для чтения** (`references: [sdd-specs]` в `openspec/config.yaml`).

## Правила для агента
1. Перед работой: `openspec doctor` (хранилище `sdd-specs` — ok) и `openspec-sdd doctor`.
2. Фича из хранилища → здесь локальное изменение `<изменение>-front`: `/opsx:new <изменение>-front`, затем `/opsx:continue`
   (proposal-указатель → design → tasks). Хранилище читать: `openspec show <изменение> --type change --store sdd-specs`,
   `openspec show <spec> --type spec --store sdd-specs`; контракт — `../sdd-specs/contracts/*.yaml` (только чтение).
3. Свои тест-кейсы: `openspec-sdd cases --repo sdd-frontend --change <изменение>` — у них поле Automation начинается с `sdd-frontend/`.
   На каждый — задача в `tasks.md` с его ID.
4. В `sdd-specs` ничего не пишешь. Требование неверно или неполно, контракт мешает — останавливаешься и предлагаешь
   `/opsx:update` в `sdd-specs` (это делает владелец хранилища).
5. Порядок в `/opsx:apply`: автотест по ID тест-кейса (красный) → реализация (зелёный) → `[x]` в `tasks.md` этого репозитория.
6. Автотест реализует тест-кейс из `test-cases.md` изменения; его ID — в начале названия теста:
   `it('[system-status-03.1] …')`, `test('[system-status-03.2] …')`. Технический тест — `[tech]`.
7. E2E по сценариям мокают `/api/*` через `page.route` по контракту `sdd-specs/contracts/*.yaml`, чтобы не зависеть от бэка.
   Сквозные проверки на стенде — отдельные тесты с тегом `@smoke`.
8. В бэк — только относительные пути `/api/...`; никаких адресов и настроек, зависящих от ОС или окружения.
9. После своих задач — `openspec-sdd trace-check` (перед `/opsx:verify` — `openspec-sdd trace-check --strict`): у каждого кейса есть автотест,
   у каждого автотеста — кейс, у каждого своего кейса — задача. Ошибок быть не должно.
10. Всё готово → `/opsx:archive <изменение>-front`; группу фронта в `tasks.md` хранилища отмечает владелец хранилища.

## Структура
- `openspec/changes/<изменение>-front/` — локальные изменения (схема `sdd-app`), `openspec/changes/archive/` — завершённые
- `src/app/features/<capability>/` — по папке на capability из sdd-specs; unit-тесты `*.spec.ts` рядом с кодом
- `tests/e2e/` — Playwright
- `deploy/nginx/` — конфиг nginx (шаблон, `API_UPSTREAM`), `deploy/k8s/` — Deployment + Service, `Dockerfile` — образ
- `proxy.conf.json` — проксирование `/api` на локальный бэкенд (http://localhost:5080) при `npm start`

## Команды
| Что | Команда |
|---|---|
| Dev-сервер | `npm start` → http://localhost:4200 (бэк поднять отдельно: `dotnet run` в sdd-backend) |
| Unit-тесты | `npm run test:ci` (в режиме наблюдения — `npm test`) |
| E2E | `npm run e2e` (сам поднимет dev-сервер; браузер один раз: `npm run e2e:install`) |
| E2E одного сценария | `npx playwright test --grep "system-status-03"` |
| E2E одного тест-кейса | `npx playwright test --grep "system-status-03.2"` |
| Smoke против стенда | `E2E_BASE_URL=http://localhost:8080 npm run e2e:smoke` |
| Образ | `docker build -t sdd-frontend:dev .` |

## Angular: правила кода (от Angular CLI)

### TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

### Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

### Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- Do NOT import `CommonModule`, import only the directives and pipes the template uses, such as `AsyncPipe` or `DatePipe`
- When using external templates/styles, use paths relative to the component TS file.

### State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

### Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

### Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection
