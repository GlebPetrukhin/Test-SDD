// Сверка прослеживаемости: сценарии спецификаций ↔ тест-кейсы ↔ автотесты.
//
// Действующие спецификации (openspec/specs/**/spec.md + test-cases.md рядом — каталог):
//   - у каждого сценария есть ID [<capability>-<NN>] и хотя бы один кейс в каталоге;
//   - каждый кейс каталога ссылается на существующий сценарий;
//   - у каждого кейса уровня unit/integration/e2e есть автотест с его ID в коде.
// Изменения в работе (openspec/changes/<имя>/, кроме archive):
//   - у каждого ADDED/MODIFIED-сценария дельты есть кейс в test-cases.md изменения (когда файл уже написан);
//   - автотесты кейсов изменения: в работе — предупреждение, с strict — ошибка;
//   - нумерация задач в tasks.md (как в OpenSpec для spec-driven): предупреждение, с strict — ошибка.
// Локальные изменения в репозиториях приложений (openspec/changes/<имя> у бэка и фронта):
//   - ID кейсов в их proposal.md и tasks.md существуют в хранилище; нумерация задач в tasks.md;
//   - у каждого автоматизируемого кейса изменения хранилища есть ссылка из локального изменения репозитория,
//     в котором живёт его автотест (первый сегмент поля Automation): в работе — предупреждение, с strict — ошибка.
// Код (репозитории из openspec-sdd.json в корне хранилища):
//   - каждый ID кейса в названии теста ([<capability>-<NN>.<n>]) есть в каталоге или в изменении в работе.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { LEVELS, caseIdsIn, ownerRepo, parseCases, parseSpec, readText, walk } from './model.mjs';
import { findTaskNumberingIssues } from './task-numbering.mjs';

export const CONFIG_FILE = 'openspec-sdd.json';

export function loadProjectConfig(storeRoot) {
  const file = join(storeRoot, CONFIG_FILE);
  if (!existsSync(file)) return { codeRepos: [], file: null };
  const cfg = JSON.parse(readText(file));
  return { codeRepos: cfg.traceCheck?.codeRepos ?? [], file };
}

export function traceCheck(storeRoot, { strict = false } = {}) {
  const errors = [];
  const warnings = [];
  const OPENSPEC = join(storeRoot, 'openspec');
  const base = dirname(storeRoot);
  const rel = (p) => relative(base, p).split('\\').join('/');
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  const checkCaseList = (cases, where) => {
    const seen = new Map();
    for (const c of cases) {
      if (seen.has(c.id)) err(`${where}: кейс [${c.id}] описан дважды (строки ${seen.get(c.id)} и ${c.line})`);
      seen.set(c.id, c.line);
      if (!c.level) err(`${where}:${c.line}: у кейса [${c.id}] не указан Level`);
      else if (!LEVELS.has(c.level)) err(`${where}:${c.line}: у кейса [${c.id}] неизвестный Level «${c.level}» (unit | integration | e2e | manual)`);
    }
  };

  // 1. автотесты в коде
  const { codeRepos, file: cfgFile } = loadProjectConfig(storeRoot);
  if (!cfgFile) warn(`нет ${CONFIG_FILE} в ${rel(storeRoot) || storeRoot} — автотесты не проверяются (см. README дополнения)`);
  const testIds = new Map();
  const scenarioOnlyRefs = [];
  for (const repo of codeRepos) {
    const repoRoot = resolve(storeRoot, repo.path);
    if (!existsSync(repoRoot)) { warn(`репозиторий ${repo.path} (из ${CONFIG_FILE}) не найден — его тесты не проверены`); continue; }
    for (const d of repo.dirs ?? ['.']) {
      for (const f of walk(join(repoRoot, d), (p) => (repo.exts ?? []).some((e) => p.endsWith(e)))) {
        const text = readText(f);
        for (const m of text.matchAll(/\[([a-z][a-z0-9-]*-\d+\.\d+)\]/gi)) {
          const list = testIds.get(m[1]) ?? [];
          if (!list.includes(f)) list.push(f);
          testIds.set(m[1], list);
        }
        for (const m of text.matchAll(/["'`]\[([a-z][a-z0-9-]*-\d+)\]/gi)) scenarioOnlyRefs.push({ id: m[1], file: f });
      }
    }
  }

  // 2. действующие спецификации и каталоги
  const mainScenarios = new Map();
  const knownCaseIds = new Set();
  let catalogCount = 0;
  for (const specFile of walk(join(OPENSPEC, 'specs'), (p) => p.endsWith('spec.md'))) {
    const capDir = dirname(specFile);
    const cap = relative(join(OPENSPEC, 'specs'), capDir).split('\\').join('/');
    const scenarios = parseSpec(readText(specFile));
    for (const s of scenarios) {
      if (!s.id) { err(`${rel(specFile)}:${s.line}: у сценария «${s.title}» нет ID вида [${cap}-NN]`); continue; }
      if (mainScenarios.has(s.id)) err(`${rel(specFile)}:${s.line}: ID сценария [${s.id}] уже используется`);
      mainScenarios.set(s.id, cap);
    }
    const catalogFile = join(capDir, 'test-cases.md');
    if (!existsSync(catalogFile)) {
      if (scenarios.length) err(`${cap}: нет каталога тест-кейсов ${rel(catalogFile)}`);
      continue;
    }
    catalogCount++;
    const { cases } = parseCases(readText(catalogFile));
    checkCaseList(cases, rel(catalogFile));
    const covered = new Set();
    for (const c of cases) {
      knownCaseIds.add(c.id);
      covered.add(c.scenario);
      if (!scenarios.some((s) => s.id === c.scenario))
        err(`${rel(catalogFile)}:${c.line}: кейс [${c.id}] ссылается на сценарий [${c.scenario}], которого нет в ${cap}/spec.md`);
      if (c.level && c.level !== 'manual' && cfgFile && !testIds.has(c.id))
        err(`${rel(catalogFile)}:${c.line}: у кейса [${c.id}] (${c.level}) нет автотеста с этим ID`);
    }
    for (const s of scenarios) if (s.id && !covered.has(s.id)) err(`${cap}: у сценария [${s.id}] нет тест-кейсов в каталоге`);
  }

  // 3. изменения в работе
  const changesRoot = join(OPENSPEC, 'changes');
  const active = existsSync(changesRoot)
    ? readdirSync(changesRoot).filter((n) => n !== 'archive' && statSync(join(changesRoot, n)).isDirectory())
    : [];
  const storeChanges = [];
  for (const name of active) {
    const dir = join(changesRoot, name);
    const tasksFile = join(dir, 'tasks.md');
    if (existsSync(tasksFile)) {
      for (const i of findTaskNumberingIssues([{ path: rel(tasksFile), content: readText(tasksFile) }])) {
        const msg = `${i.path}:${i.line}: ${i.message}`;
        strict ? err(msg) : warn(msg);
      }
    }
    const delta = [];
    for (const f of walk(join(dir, 'specs'), (p) => p.endsWith('spec.md'))) delta.push(...parseSpec(readText(f)).map((s) => ({ ...s, file: f })));
    const tcFile = join(dir, 'test-cases.md');
    if (!existsSync(tcFile)) {
      if (delta.some((s) => s.section === 'ADDED' || s.section === 'MODIFIED')) warn(`изменение ${name}: test-cases.md ещё не написан`);
      continue;
    }
    const { cases } = parseCases(readText(tcFile));
    checkCaseList(cases, rel(tcFile));
    storeChanges.push({ name, cases, file: tcFile });
    for (const c of cases) {
      knownCaseIds.add(c.id);
      if (!delta.some((s) => s.id === c.scenario && s.section !== 'REMOVED') && !mainScenarios.has(c.scenario))
        err(`${rel(tcFile)}:${c.line}: кейс [${c.id}] ссылается на сценарий [${c.scenario}], которого нет ни в дельте, ни в спецификациях`);
      if (c.level && c.level !== 'manual' && cfgFile && !testIds.has(c.id)) {
        const msg = `${rel(tcFile)}:${c.line}: у кейса [${c.id}] (${c.level}) пока нет автотеста`;
        strict ? err(msg) : warn(msg);
      }
    }
    for (const s of delta) {
      if (!s.id) { err(`${rel(s.file)}:${s.line}: у сценария «${s.title}» нет ID`); continue; }
      if ((s.section === 'ADDED' || s.section === 'MODIFIED') && !cases.some((c) => c.scenario === s.id))
        err(`изменение ${name}: у сценария [${s.id}] (${s.section}) нет тест-кейсов в test-cases.md`);
    }
  }

  // 3b. локальные изменения в репозиториях приложений
  const repoNames = new Map(codeRepos.map((r) => [r.name ?? basename(resolve(storeRoot, r.path)), resolve(storeRoot, r.path)]));
  const referenced = new Map(); // репозиторий -> Set ID кейсов из его активных локальных изменений
  const archivedLocal = new Map(); // репозиторий -> [{ name (без даты), ids }] — заархивированные локальные изменения
  let localCount = 0;
  for (const [repoName, repoRoot] of repoNames) {
    const chRoot = join(repoRoot, 'openspec', 'changes');
    const ids = new Set();
    referenced.set(repoName, ids);
    archivedLocal.set(repoName, []);
    if (!existsSync(chRoot)) continue;
    // Порядок архивации: сначала локальные изменения приложений, потом изменение хранилища, —
    // поэтому владение проверяется и по заархивированным локальным изменениям (<дата>-<изменение>-back|-front).
    const archRoot = join(chRoot, 'archive');
    if (existsSync(archRoot)) {
      for (const a of readdirSync(archRoot).filter((n) => statSync(join(archRoot, n)).isDirectory())) {
        const aIds = new Set();
        for (const f of ['proposal.md', 'tasks.md'].map((n) => join(archRoot, a, n)).filter((p) => existsSync(p)))
          for (const id of caseIdsIn(readText(f))) aIds.add(id);
        archivedLocal.get(repoName).push({ name: a.replace(/^\d{4}-\d{2}-\d{2}-/, ''), ids: aIds });
      }
    }
    for (const ch of readdirSync(chRoot).filter((n) => n !== 'archive' && statSync(join(chRoot, n)).isDirectory())) {
      localCount++;
      for (const f of ['proposal.md', 'tasks.md'].map((n) => join(chRoot, ch, n)).filter((p) => existsSync(p))) {
        for (const id of caseIdsIn(readText(f))) {
          ids.add(id);
          if (!knownCaseIds.has(id)) err(`${rel(f)}: кейс [${id}] не найден ни в каталоге, ни в изменениях хранилища`);
        }
      }
      const tasksFile = join(chRoot, ch, 'tasks.md');
      if (existsSync(tasksFile)) {
        for (const i of findTaskNumberingIssues([{ path: rel(tasksFile), content: readText(tasksFile) }])) {
          const msg = `${i.path}:${i.line}: ${i.message}`;
          strict ? err(msg) : warn(msg);
        }
      }
    }
  }
  for (const { name, cases, file } of storeChanges) {
    for (const c of cases) {
      if (!c.level || c.level === 'manual') continue;
      const owner = ownerRepo(c);
      if (!owner || !repoNames.has(owner)) {
        warn(`${rel(file)}:${c.line}: у кейса [${c.id}] в Automation не указан репозиторий из ${CONFIG_FILE} (путь вида ${[...repoNames.keys()][0] ?? '<репозиторий>'}/...)`);
        continue;
      }
      const inArchive = archivedLocal.get(owner).some((a) => a.name.startsWith(`${name}-`) && a.ids.has(c.id));
      if (!referenced.get(owner).has(c.id) && !inArchive) {
        const msg = `изменение ${name}: кейс [${c.id}] (${c.level}) — автотест в ${owner}, но ни одно локальное изменение ${owner} на него не ссылается`;
        strict ? err(msg) : warn(msg);
      }
    }
  }

  // 4. автотесты без кейса
  for (const [id, files] of testIds)
    if (!knownCaseIds.has(id)) err(`автотест с ID [${id}] не соответствует ни одному тест-кейсу: ${files.map(rel).join(', ')}`);
  for (const r of scenarioOnlyRefs) warn(`${rel(r.file)}: тест помечен ID сценария [${r.id}] без номера кейса — переименуйте в [${r.id}.<n>]`);

  const summary = `trace-check${strict ? ' --strict' : ''}: ${mainScenarios.size} сценариев, ${catalogCount} каталогов, ` +
    `${knownCaseIds.size} кейсов, ${testIds.size} ID в автотестах, изменений в работе: ${active.length} в хранилище, ${localCount} в приложениях`;
  return { errors, warnings, summary };
}
