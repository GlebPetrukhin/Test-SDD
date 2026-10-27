import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { install, doctor, MARKER } from '../lib/install.mjs';
import { planMerge, applyMerge } from '../lib/merge.mjs';
import { traceCheck } from '../lib/trace-check.mjs';
import { findStoreRoot, userSchemasDir, PKG_ROOT } from '../lib/paths.mjs';

const CLI = join(PKG_ROOT, 'bin', 'openspec-sdd.mjs');
const tmp = (p) => mkdtempSync(join(tmpdir(), `openspec-sdd-${p}-`));
const put = (root, rel, text) => {
  const f = join(root, rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, text);
  return f;
};
const scenario = (id, title) => `#### Scenario: [${id}] ${title}\n- **WHEN** a\n- **THEN** b\n`;
const tc = (id, title, level = 'unit') => `### [${id}] ${title}\n- **Scenario**: [${id.split('.')[0]}]\n- **Level**: ${level}\n- **Steps**:\n  1. step\n- **Expected result**: ok\n`;
const hasOpenspec = (() => { try { execFileSync('openspec', ['--version'], { stdio: 'ignore' }); return true; } catch { return false; } })();

function store() {
  const base = tmp('store');
  const root = join(base, 'specs-repo');
  put(root, 'openspec/config.yaml', 'schema: sdd\n');
  put(root, 'openspec/specs/auth/spec.md', `# auth\n\n## Purpose\nAuth.\n\n## Requirements\n\n### Requirement: Login\nSHALL.\n\n${scenario('auth-01', 'Вход')}\n${scenario('auth-02', 'Выход')}\n${scenario('auth-04', 'Новый')}`);
  put(root, 'openspec/specs/auth/test-cases.md', `# auth — каталог тест-кейсов\n\n- История: \`2026-01-01-init\` (создан).\n\n## auth\n\n${tc('auth-01.1', 'вход старый')}\n${tc('auth-02.1', 'выход')}\n${tc('auth-03.1', 'удалённый сценарий')}\n## Gaps\n\nNone\n\n## Coverage\n\n| Scenario | Test cases |\n|---|---|\n`);
  put(root, 'openspec/changes/archive/2026-02-02-rework/test-cases.md', `# Test Cases\n\n## auth\n\n${tc('auth-01.1', 'вход новый')}\n${tc('auth-01.2', 'вход неверный пароль')}\n${tc('auth-04.1', 'новый', 'manual')}\n## Gaps\n\n- Нет сценария на блокировку\n\n## Coverage\n`);
  return { base, root };
}

test('install кладёт схемы в пользовательскую папку OpenSpec с маркером версии', () => {
  const data = tmp('data');
  const target = userSchemasDir({ XDG_DATA_HOME: data });
  install({ target, log: () => {} });
  assert.ok(existsSync(join(target, 'sdd', 'schema.yaml')));
  assert.match(readFileSync(join(target, 'sdd', 'schema.yaml'), 'utf8'), /^name: sdd$/m);
  assert.equal(JSON.parse(readFileSync(join(target, 'sdd', MARKER), 'utf8')).package, 'openspec-sdd');
});

test('doctor замечает изменённую вручную схему', () => {
  const data = tmp('data');
  const target = userSchemasDir({ XDG_DATA_HOME: data });
  install({ target, log: () => {} });
  assert.ok(doctor({ target, cwd: data }).lines.some((l) => l.includes('схема sdd установлена и актуальна')));
  appendFileSync(join(target, 'sdd', 'schema.yaml'), '\n# local edit\n');
  const r = doctor({ target, cwd: data });
  assert.equal(r.ok, false);
  assert.ok(r.lines.some((l) => l.includes('отличается от версии дополнения')));
});

test('userSchemasDir повторяет логику OpenSpec на Windows и Linux', () => {
  assert.equal(userSchemasDir({ LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local' }, 'win32', 'C:\\Users\\u').replace(/\//g, '\\'), 'C:\\Users\\u\\AppData\\Local\\openspec\\schemas');
  assert.equal(userSchemasDir({}, 'linux', '/home/u'), '/home/u/.local/share/openspec/schemas');
  assert.equal(userSchemasDir({ XDG_DATA_HOME: '/x' }, 'linux', '/home/u'), '/x/openspec/schemas');
});

test('merge-test-cases заменяет кейсы затронутых сценариев, удаляет кейсы удалённых, пересобирает Coverage и историю', () => {
  const { root } = store();
  const { plans } = planMerge(root, 'rework');
  applyMerge(plans);
  const text = readFileSync(join(root, 'openspec/specs/auth/test-cases.md'), 'utf8');
  assert.match(text, /\[auth-01\.1\] вход новый/);
  assert.doesNotMatch(text, /вход старый/);
  assert.match(text, /\[auth-01\.2\]/);
  assert.match(text, /\[auth-02\.1\] выход/, 'кейсы незатронутого сценария сохраняются');
  assert.doesNotMatch(text, /auth-03\.1/, 'кейсы сценария, которого нет в spec.md, удаляются');
  assert.match(text, /\| \[auth-04\] Новый \| auth-04\.1 \|/);
  assert.match(text, /- Нет сценария на блокировку _\(из 2026-02-02-rework\)_/);
  assert.match(text, /`2026-02-02-rework` \(новые 01\.2, 04\.1; обновлены 01\.1; удалены 03\.1\)/);
  const order = [...text.matchAll(/^### \[(auth-\d+\.\d+)\]/gm)].map((m) => m[1]);
  assert.deepEqual(order, ['auth-01.1', 'auth-01.2', 'auth-02.1', 'auth-04.1']);
  // Повторное слияние того же изменения: кейсы перенесены без правок — «обновлены» в историю не попадают.
  const again = planMerge(root, 'rework').plans[0];
  assert.deepEqual(again.updated, []);
});

test('merge-test-cases создаёт каталог для новой capability', () => {
  const { root } = store();
  put(root, 'openspec/specs/billing/spec.md', `# billing\n\n## Requirements\n\n### Requirement: Pay\nSHALL.\n\n${scenario('billing-01', 'Оплата')}`);
  put(root, 'openspec/changes/archive/2026-03-03-add-billing/test-cases.md', `# Test Cases\n\n## billing\n\n${tc('billing-01.1', 'оплата картой', 'e2e')}\n## Gaps\n\nNone\n`);
  const { plans } = planMerge(root, 'add-billing');
  assert.equal(plans[0].created, true);
  applyMerge(plans);
  const text = readFileSync(join(root, 'openspec/specs/billing/test-cases.md'), 'utf8');
  assert.match(text, /^# billing — каталог тест-кейсов/);
  assert.match(text, /История: `2026-03-03-add-billing` \(создан\)/);
  assert.match(text, /## Gaps\n\nNone/);
});

test('merge-test-cases отказывает без записи: незаархивированное изменение и кейс на несуществующий сценарий', () => {
  const { root } = store();
  const catalog = join(root, 'openspec/specs/auth/test-cases.md');
  const before = readFileSync(catalog, 'utf8');
  put(root, 'openspec/changes/in-progress/test-cases.md', '# Test Cases\n');
  assert.throws(() => planMerge(root, 'in-progress'), /ещё не заархивировано/);
  put(root, 'openspec/changes/archive/2026-04-04-bad/test-cases.md', `# Test Cases\n\n## auth\n\n${tc('auth-09.1', 'нет такого сценария')}`);
  assert.throws(() => planMerge(root, 'bad'), /auth-09/);
  assert.equal(readFileSync(catalog, 'utf8'), before);
});

test('trace-check ловит кейс без автотеста и автотест без кейса', () => {
  const { base, root } = store();
  const { plans } = planMerge(root, 'rework');
  applyMerge(plans);
  put(root, 'openspec-sdd.json', JSON.stringify({ traceCheck: { codeRepos: [{ path: '../app', dirs: ['tests'], exts: ['.ts'] }] } }));
  put(base, 'app/tests/a.test.ts', "test('[auth-01.1] ok', () => {});\ntest('[auth-02.1] ok', () => {});\ntest('[auth-07.1] сирота', () => {});\n");
  const r = traceCheck(root);
  assert.ok(r.errors.some((e) => e.includes('[auth-01.2]') && e.includes('нет автотеста')));
  assert.ok(r.errors.some((e) => e.includes('[auth-07.1]') && e.includes('не соответствует')));
  assert.ok(!r.errors.some((e) => e.includes('auth-04.1')), 'manual-кейсу автотест не нужен');
});

test('хранилище находится из кодового репозитория по строке store: (соседняя папка)', () => {
  const base = tmp('ptr');
  put(base, 'team-specs/openspec/specs/.gitkeep', '');
  put(base, 'web/openspec/config.yaml', 'store: team-specs\n');
  mkdirSync(join(base, 'web', 'src'), { recursive: true });
  assert.equal(findStoreRoot(join(base, 'web', 'src')), join(base, 'team-specs'));
});

test('стандартный OpenSpec подхватывает установленную схему sdd', { skip: !hasOpenspec && 'openspec не установлен' }, () => {
  const data = tmp('data');
  execFileSync('node', [CLI, 'install'], { env: { ...process.env, XDG_DATA_HOME: data } });
  const env = { ...process.env, XDG_DATA_HOME: data, OPENSPEC_TELEMETRY: '0' };
  const which = execFileSync('openspec', ['schema', 'which', 'sdd'], { env, encoding: 'utf8' });
  assert.match(which, /Source: user/);
  const proj = tmp('proj');
  put(proj, 'openspec/config.yaml', 'schema: sdd\n');
  put(proj, 'openspec/specs/.gitkeep', '');
  execFileSync('openspec', ['new', 'change', 'x'], { cwd: proj, env, stdio: 'ignore' });
  const status = JSON.parse(execFileSync('openspec', ['status', '--change', 'x', '--json'], { cwd: proj, env, encoding: 'utf8' }));
  assert.equal(status.schemaName, 'sdd');
  assert.deepEqual(status.artifacts.map((a) => a.id), ['proposal', 'specs', 'design', 'test-cases', 'tasks']);
});

test('нумерация задач: те же правила, что у OpenSpec для spec-driven', async () => {
  const { findTaskNumberingIssues } = await import('../lib/task-numbering.mjs');
  const issues = findTaskNumberingIssues([{ path: 'tasks.md', content: [
    '# Tasks', '- [ ] без номера', '', '## 1. Backend', '- [ ] 1.1 ok', '- [ ] 2.1 чужая группа', '- [x] 1.1 дубль',
    '  - [ ] 1.1.1 вложенная', '- [ ] 1.2a вставка', '', '## Notes', '- [ ] 9.9 вне нумерованной группы', '',
  ].join('\n') }]);
  assert.deepEqual(issues.map((i) => i.line), [6, 7]);
  assert.match(issues[0].message, /группе 1.*группу 2/);
  assert.match(issues[1].message, /«1\.1» повторяется; впервые объявлен в строке 5/);
});

test('trace-check: ошибки нумерации задач — предупреждение, с --strict — ошибка', () => {
  const { root } = store();
  applyMerge(planMerge(root, 'rework').plans);
  put(root, 'openspec/changes/next/tasks.md', '## 1. Backend\n\n- [ ] 1.1 ok\n- [ ] 2.1 не та группа\n');
  const soft = traceCheck(root);
  assert.ok(soft.warnings.some((w) => w.includes('next/tasks.md:4') && w.includes('2.1')));
  assert.ok(!soft.errors.some((e) => e.includes('tasks.md')));
  assert.ok(traceCheck(root, { strict: true }).errors.some((e) => e.includes('next/tasks.md:4')));
});

test('trace-check: кейс изменения хранилища должен быть в локальном изменении своего репозитория', async () => {
  const { base, root } = store();
  applyMerge(planMerge(root, 'rework').plans);
  put(root, 'openspec-sdd.json', JSON.stringify({ traceCheck: { codeRepos: [
    { path: '../back', dirs: ['tests'], exts: ['.cs'] }, { path: '../front', dirs: ['tests'], exts: ['.ts'] },
  ] } }));
  put(root, 'openspec/changes/f1/specs/auth/spec.md', `## MODIFIED Requirements\n\n### Requirement: Login\nSHALL.\n\n${scenario('auth-02', 'Выход')}`);
  put(root, 'openspec/changes/f1/test-cases.md', `# Test Cases\n\n## auth\n\n${tc('auth-02.1', 'выход API', 'integration')}- **Automation**: back/tests/AuthTests.cs\n\n${tc('auth-02.2', 'выход в UI', 'e2e')}- **Automation**: front/tests/auth.spec.ts\n`);
  put(base, 'back/tests/AuthTests.cs', '// [auth-01.1] [auth-01.2] [auth-02.1]\n');
  put(base, 'front/tests/auth.spec.ts', "test('[auth-02.2] выход', () => {});\n");
  let r = traceCheck(root);
  assert.ok(r.warnings.some((w) => w.includes('[auth-02.1]') && w.includes('ни одно локальное изменение back')));
  assert.ok(traceCheck(root, { strict: true }).errors.some((e) => e.includes('[auth-02.2]') && e.includes('front')));
  put(base, 'back/openspec/changes/f1-back/tasks.md', '## 1. API\n\n- [ ] 1.1 Автотест [auth-02.1]\n- [ ] 2.1 не та группа\n');
  put(base, 'front/openspec/changes/f1-front/tasks.md', '## 1. UI\n\n- [ ] 1.1 Автотест [auth-02.2], заодно [auth-77.1]\n');
  r = traceCheck(root, { strict: true });
  assert.ok(!r.errors.some((e) => e.includes('ни одно локальное изменение')));
  assert.ok(r.errors.some((e) => e.includes('f1-front/tasks.md') && e.includes('[auth-77.1]')), 'неизвестный ID кейса в локальном изменении');
  assert.ok(r.errors.some((e) => e.includes('f1-back/tasks.md:4')), 'нумерация задач в репозитории приложения');
  // Локальное изменение уже заархивировано (так и положено перед архивом хранилища) — владение засчитывается.
  mkdirSync(join(base, 'front/openspec/changes/archive'), { recursive: true });
  renameSync(join(base, 'front/openspec/changes/f1-front'), join(base, 'front/openspec/changes/archive/2026-10-27-f1-front'));
  assert.ok(!traceCheck(root, { strict: true }).errors.some((e) => e.includes('[auth-02.2]') && e.includes('ни одно локальное изменение')));
  // Архив чужого изменения не засчитывается.
  renameSync(join(base, 'front/openspec/changes/archive/2026-10-27-f1-front'), join(base, 'front/openspec/changes/archive/2026-10-27-f10-front'));
  assert.ok(traceCheck(root, { strict: true }).errors.some((e) => e.includes('[auth-02.2]') && e.includes('ни одно локальное изменение')));
});

test('cases --repo отдаёт только кейсы, чьи автотесты живут в этом репозитории', async () => {
  const { listCases } = await import('../lib/cases.mjs');
  const { root } = store();
  put(root, 'openspec/changes/f1/test-cases.md', `# Test Cases\n\n## auth\n\n${tc('auth-02.1', 'API', 'integration')}- **Automation**: back/tests/A.cs\n\n${tc('auth-02.2', 'UI', 'e2e')}- **Automation**: front/tests/a.spec.ts\n`);
  assert.deepEqual(listCases(root, { repo: 'back', change: 'f1' }).map((c) => c.id), ['auth-02.1']);
  assert.deepEqual(listCases(root, { repo: 'front' }).map((c) => c.id), ['auth-02.2']);
});

test('схема sdd-app: указатель → дизайн → задачи, без дельты спеки проходит строгую валидацию', { skip: !hasOpenspec && 'openspec не установлен' }, () => {
  const data = tmp('data');
  const env = { ...process.env, XDG_DATA_HOME: data, OPENSPEC_TELEMETRY: '0' };
  execFileSync('node', [CLI, 'install'], { env });
  const app = tmp('app');
  put(app, 'openspec/config.yaml', 'schema: sdd-app\n');
  put(app, 'openspec/changes/archive/.gitkeep', '');
  execFileSync('openspec', ['new', 'change', 'f1-back'], { cwd: app, env, stdio: 'ignore' });
  const status = JSON.parse(execFileSync('openspec', ['status', '--change', 'f1-back', '--json'], { cwd: app, env, encoding: 'utf8' }));
  assert.equal(status.schemaName, 'sdd-app');
  assert.deepEqual(status.artifacts.map((a) => a.id), ['proposal', 'design', 'tasks']);
  put(app, 'openspec/changes/f1-back/proposal.md', '# Proposal\n\n## Why\nРеализация фичи f1 из хранилища на стороне бэка, задача трекера 1.\n\n## What Changes\n- Behavior: store/openspec/changes/f1/specs/auth/spec.md\n\n## Impact\n- API\n');
  put(app, 'openspec/changes/f1-back/design.md', '# Design\n\n## Context\nСм. хранилище.\n');
  put(app, 'openspec/changes/f1-back/tasks.md', '## 1. API\n\n- [x] 1.1 сделано\n');
  const out = execFileSync('openspec', ['validate', 'f1-back', '--strict'], { cwd: app, env, encoding: 'utf8' });
  assert.match(out, /is valid/);
});

test('хранилище находится из репозитория приложения по references, даже когда у него есть свой openspec/changes', () => {
  const base = tmp('refs');
  put(base, 'team-specs/openspec/specs/.gitkeep', '');
  put(base, 'back/openspec/config.yaml', 'schema: sdd-app\n\nreferences:\n  - team-specs\n\ncontext: |\n  x\n');
  put(base, 'back/openspec/changes/f1-back/proposal.md', '# P\n');
  assert.equal(findStoreRoot(join(base, 'back', 'openspec', 'changes')), join(base, 'team-specs'));
  // OpenSpec может сам создать пустую openspec/specs в репозитории приложения — решает схема sdd-app.
  put(base, 'back/openspec/specs/.keep', '');
  assert.equal(findStoreRoot(join(base, 'back')), join(base, 'team-specs'));
});
