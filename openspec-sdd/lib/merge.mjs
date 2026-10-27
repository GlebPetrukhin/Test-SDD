// merge-test-cases: вливает test-cases.md заархивированного изменения в каталоги openspec/specs/<capability>/test-cases.md.
//
// Правила (детерминированно, без участия агента):
//   - для каждого сценария, у которого есть кейсы в изменении, кейсы каталога заменяются кейсами изменения целиком;
//   - кейсы сценариев, которых больше нет в spec.md (REMOVED/RENAMED), из каталога удаляются;
//   - Coverage пересобирается по сценариям spec.md; Gaps изменения (кроме «None») дописываются с пометкой архива;
//   - в строку «История» добавляется имя архива и список кейсов.
// Каталог пишется атомарно (временный файл + rename) и только после всех проверок.
import { existsSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { byScenarioThenCase, parseCases, parseSpec, readText } from './model.mjs';

export function findArchivedChange(storeRoot, name) {
  const changes = join(storeRoot, 'openspec', 'changes');
  if (existsSync(join(changes, name)) && name !== 'archive')
    throw new Error(`изменение ${name} ещё не заархивировано: сначала openspec archive ${name}, потом merge-test-cases`);
  const archive = join(changes, 'archive');
  const hits = existsSync(archive) ? readdirSync(archive).filter((d) => d === name || d.replace(/^\d{4}-\d{2}-\d{2}-/, '') === name) : [];
  if (hits.length === 0) throw new Error(`в ${archive} нет изменения «${name}»`);
  if (hits.length > 1) throw new Error(`несколько архивов подходят под «${name}»: ${hits.join(', ')} — укажите полное имя`);
  return { archiveName: hits[0], dir: join(archive, hits[0]) };
}

function catalogHead(cap, archiveName) {
  return [
    `# ${cap} — каталог тест-кейсов`,
    '',
    `Действующий набор проверок capability \`${cap}\`: по каждому сценарию из [spec.md](spec.md) — тест-кейсы`,
    'с уровнем, данными, шагами, ожидаемым результатом и местом автотеста.',
    '',
    '- Обновляется только через изменения: кейсы пишутся в `test-cases.md` изменения и вливаются сюда командой',
    '  `openspec-sdd merge-test-cases <изменение>` после `openspec archive`. Руками в обход изменения не править.',
    '- Сверка «сценарии ↔ кейсы ↔ автотесты»: `openspec-sdd trace-check`.',
    `- История: \`${archiveName}\` (создан).`,
  ].join('\n');
}

const shortId = (c) => c.id.slice(c.id.lastIndexOf('-') + 1);
function historyEntry(archiveName, added, updated, removed) {
  const parts = [];
  if (added.length) parts.push(`новые ${added.map(shortId).join(', ')}`);
  if (updated.length) parts.push(`обновлены ${updated.map(shortId).join(', ')}`);
  if (removed.length) parts.push(`удалены ${removed.map(shortId).join(', ')}`);
  return `\`${archiveName}\` (${parts.join('; ') || 'без изменений кейсов'})`;
}

/** Возвращает [{ cap, file, text, added, replaced, removed, gapsAdded }] — ничего не пишет. */
export function planMerge(storeRoot, name) {
  const { archiveName, dir } = findArchivedChange(storeRoot, name);
  const tcFile = join(dir, 'test-cases.md');
  if (!existsSync(tcFile)) throw new Error(`в ${dir} нет test-cases.md — сливать нечего`);
  const change = parseCases(readText(tcFile));
  if (change.capabilities.size === 0) throw new Error(`${tcFile}: нет разделов «## <capability>» с кейсами`);
  const changeGaps = change.gaps.filter((l) => !/^\s*(none|нет)\.?\s*$/i.test(l));

  const plans = [];
  for (const [cap, newCases] of change.capabilities) {
    const capDir = join(storeRoot, 'openspec', 'specs', ...cap.split('/'));
    const specFile = join(capDir, 'spec.md');
    if (!existsSync(specFile)) throw new Error(`нет ${specFile}: capability «${cap}» из test-cases.md не найдена среди спецификаций (openspec archive уже выполнен?)`);
    const scenarios = parseSpec(readText(specFile)).filter((s) => s.id);
    const scenarioIds = new Set(scenarios.map((s) => s.id));
    for (const c of newCases)
      if (!scenarioIds.has(c.scenario)) throw new Error(`${tcFile}:${c.line}: кейс [${c.id}] ссылается на сценарий [${c.scenario}], которого нет в ${cap}/spec.md`);
    const dup = newCases.find((c, i) => newCases.findIndex((d) => d.id === c.id) !== i);
    if (dup) throw new Error(`${tcFile}: кейс [${dup.id}] описан дважды`);

    const file = join(capDir, 'test-cases.md');
    const exists = existsSync(file);
    const old = exists ? parseCases(readText(file)) : { head: catalogHead(cap, archiveName), cases: [], gaps: [] };
    const touched = new Set(newCases.map((c) => c.scenario));
    const kept = old.cases.filter((c) => !touched.has(c.scenario) && scenarioIds.has(c.scenario));
    const removed = old.cases.filter((c) => !scenarioIds.has(c.scenario));
    const replaced = old.cases.filter((c) => touched.has(c.scenario));
    const merged = [...kept, ...newCases].sort(byScenarioThenCase);

    const added = newCases.filter((c) => !old.cases.some((o) => o.id === c.id));
    // «Обновлён» — только если текст кейса изменился; перенесённые без правок кейсы в историю не попадают.
    const norm = (b) => b.replace(/\r\n/g, '\n').trim();
    const updated = newCases.filter((c) => old.cases.some((o) => o.id === c.id && norm(o.block) !== norm(c.block)));
    const dropped = [...removed, ...replaced.filter((c) => !newCases.some((n) => n.id === c.id))];
    let head = old.head;
    if (exists) {
      const entry = historyEntry(archiveName, added, updated, dropped);
      head = /^- История:.*$/m.test(head)
        ? head.replace(/^(- История:.*?)\.?\s*$/m, `$1; ${entry}.`)
        : `${head}\n- История: ${entry}.`;
    }
    const gaps = [...old.gaps, ...changeGaps.map((l) => (l.startsWith('- ') ? `${l} _(из ${archiveName})_` : l))]
      .filter((l) => !/^\s*(none|нет)\.?\s*$/i.test(l));
    const coverage = scenarios.map((s) => {
      const ids = merged.filter((c) => c.scenario === s.id).map((c) => c.id);
      return `| [${s.id}] ${s.title} | ${ids.join(', ') || '— нет кейсов —'} |`;
    });
    const text = [
      head,
      '',
      `## ${cap}`,
      '',
      merged.map((c) => c.block).join('\n\n'),
      '',
      '## Gaps',
      '',
      gaps.length ? gaps.join('\n') : 'None',
      '',
      '## Coverage',
      '',
      '| Scenario | Test cases |',
      '|---|---|',
      ...coverage,
      '',
    ].join('\n');
    plans.push({ cap, file, text, created: !exists, added, updated, removed: dropped, gapsAdded: changeGaps.length });
  }
  return { archiveName, plans };
}

export function applyMerge(plans) {
  for (const p of plans) {
    const tmp = `${p.file}.openspec-sdd-tmp`;
    writeFileSync(tmp, p.text, 'utf8');
    renameSync(tmp, p.file);
  }
}
