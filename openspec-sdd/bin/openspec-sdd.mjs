#!/usr/bin/env node
// openspec-sdd — дополнение к стандартному OpenSpec для процесса SDD команды.
import { PKG, findStoreRoot, userSchemasDir } from '../lib/paths.mjs';
import { doctor, install } from '../lib/install.mjs';
import { traceCheck } from '../lib/trace-check.mjs';
import { applyMerge, planMerge } from '../lib/merge.mjs';
import { listCases } from '../lib/cases.mjs';

const HELP = `${PKG.name} ${PKG.version} — дополнение к OpenSpec (${PKG.openspec.compatible}) для процесса SDD

Команды:
  install                       положить схемы дополнения (sdd) в пользовательскую папку OpenSpec
                                (${userSchemasDir()})
  doctor [--store <путь>]       проверить OpenSpec, установленную схему и проект
  trace-check [--strict] [--store <путь>]
                                сверка: сценарии ↔ тест-кейсы ↔ автотесты и нумерация задач в tasks.md
                                (--strict — перед verify/archive)
  merge-test-cases <изменение> [--dry-run] [--store <путь>]
                                влить test-cases.md заархивированного изменения в каталоги
                                openspec/specs/<capability>/test-cases.md (после openspec archive)
  cases [--repo <имя>] [--change <изменение>] [--store <путь>]
                                тест-кейсы хранилища, чьи автотесты живут в репозитории <имя>
                                (по полю Automation); без --change — каталоги и изменения в работе
  version                       версия дополнения

Хранилище спецификаций ищется от текущей папки (или кодового репозитория со строкой store:), либо --store.`;

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

function printResult({ errors, warnings, summary }) {
  console.log(summary);
  for (const w of warnings) console.log(`  предупреждение: ${w}`);
  for (const e of errors) console.log(`  ОШИБКА: ${e}`);
  console.log(errors.length ? `Итог: ошибок ${errors.length}` : 'Итог: прослеживаемость в порядке');
}

try {
  switch (cmd) {
    case 'install':
      install();
      break;
    case 'doctor': {
      const { ok, lines } = doctor({ store: opt('--store') });
      console.log(lines.join('\n'));
      process.exitCode = ok ? 0 : 1;
      break;
    }
    case 'trace-check': {
      const root = findStoreRoot(process.cwd(), opt('--store'));
      const r = traceCheck(root, { strict: flag('--strict') });
      printResult(r);
      process.exitCode = r.errors.length ? 1 : 0;
      break;
    }
    case 'merge-test-cases': {
      const name = args.slice(1).find((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--store');
      if (!name) throw new Error('укажите изменение: openspec-sdd merge-test-cases <имя>');
      const root = findStoreRoot(process.cwd(), opt('--store'));
      const { archiveName, plans } = planMerge(root, name);
      console.log(`${archiveName} → каталоги тест-кейсов${flag('--dry-run') ? ' (dry-run, ничего не записано)' : ''}:`);
      for (const p of plans) {
        console.log(`  ${p.cap}: ${p.created ? 'каталог создан, ' : ''}новых ${p.added.length}, обновлено ${p.updated.length}, удалено ${p.removed.length}` +
          (p.removed.length ? ` (${p.removed.map((c) => c.id).join(', ')})` : '') + (p.gapsAdded ? `, в Gaps добавлено ${p.gapsAdded}` : ''));
      }
      console.log('  Проверьте раздел Gaps каталога: закрытые этим изменением пробелы снимаются вручную.');
      if (flag('--dry-run')) break;
      applyMerge(plans);
      const r = traceCheck(root);
      printResult(r);
      process.exitCode = r.errors.length ? 1 : 0;
      break;
    }
    case 'cases': {
      const root = findStoreRoot(process.cwd(), opt('--store'));
      const rows = listCases(root, { repo: opt('--repo'), change: opt('--change') });
      if (!rows.length) { console.log('кейсов не найдено'); break; }
      for (const r of rows) console.log(`[${r.id}] ${r.title}\n    ${r.level ?? '?'} · ${r.automation ?? 'Automation не указан'} · ${r.source} (${r.file}:${r.line})`);
      console.log(`всего: ${rows.length}`);
      break;
    }
    case 'version':
    case '--version':
    case '-v':
      console.log(PKG.version);
      break;
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      console.log(HELP);
      break;
    default:
      console.error(`неизвестная команда «${cmd}»\n\n${HELP}`);
      process.exitCode = 2;
  }
} catch (e) {
  console.error(`ОШИБКА: ${e.message}`);
  process.exitCode = 1;
}
