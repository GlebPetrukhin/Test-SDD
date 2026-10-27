// cases: тест-кейсы из хранилища, отфильтрованные по репозиторию, где живёт их автотест.
// Для агентов и разработчиков приложений: «что из кейсов фичи — моё», без чтения чужих файлов.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ownerRepo, parseCases, readText, walk } from './model.mjs';

export function listCases(storeRoot, { repo = null, change = null } = {}) {
  const openspec = join(storeRoot, 'openspec');
  const sources = [];
  if (change) {
    const active = join(openspec, 'changes', change, 'test-cases.md');
    if (!existsSync(active)) throw new Error(`нет ${active} — изменение не найдено или кейсы ещё не написаны`);
    sources.push({ file: active, kind: `изменение ${change}` });
  } else {
    for (const f of walk(join(openspec, 'specs'), (p) => p.endsWith('test-cases.md'))) sources.push({ file: f, kind: 'каталог' });
    const ch = join(openspec, 'changes');
    if (existsSync(ch))
      for (const n of readdirSync(ch).filter((d) => d !== 'archive' && statSync(join(ch, d)).isDirectory()))
        if (existsSync(join(ch, n, 'test-cases.md'))) sources.push({ file: join(ch, n, 'test-cases.md'), kind: `изменение ${n}` });
  }
  const rows = [];
  for (const s of sources)
    for (const c of parseCases(readText(s.file)).cases)
      if (!repo || ownerRepo(c) === repo || (c.level === 'manual' && repo === 'manual'))
        rows.push({ ...c, source: s.kind, file: relative(storeRoot, s.file).split('\\').join('/') });
  return rows;
}
