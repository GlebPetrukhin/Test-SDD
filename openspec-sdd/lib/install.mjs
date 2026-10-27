// install / doctor: схемы дополнения в пользовательской папке OpenSpec и проверка окружения.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { platform } from 'node:os';
import { BUNDLED_SCHEMAS, PKG, findStoreRoot, readConfigValue, readReferences, userSchemasDir } from './paths.mjs';
import { walk } from './model.mjs';

export const MARKER = '.openspec-sdd.json';

export function bundledSchemaNames() {
  return readdirSync(BUNDLED_SCHEMAS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
}

/** Хеш содержимого папки схемы (без маркера), устойчивый к переводам строк. */
export function schemaHash(dir) {
  const h = createHash('sha256');
  for (const f of walk(dir, (p) => !p.endsWith(MARKER)).map((p) => relative(dir, p).split('\\').join('/')).sort()) {
    h.update(f + '\0' + readFileSync(join(dir, f), 'utf8').replace(/\r\n/g, '\n') + '\0');
  }
  return h.digest('hex');
}

export function install({ log = console.log, target = userSchemasDir() } = {}) {
  mkdirSync(target, { recursive: true });
  for (const name of bundledSchemaNames()) {
    const src = join(BUNDLED_SCHEMAS, name);
    const dst = join(target, name);
    const staging = join(target, `.openspec-sdd-staging-${name}`);
    rmSync(staging, { recursive: true, force: true });
    cpSync(src, staging, { recursive: true });
    writeFileSync(join(staging, MARKER), JSON.stringify({ package: PKG.name, version: PKG.version, hash: schemaHash(src) }, null, 2) + '\n');
    rmSync(dst, { recursive: true, force: true });
    renameSync(staging, dst);
    log(`  схема ${name} → ${dst}`);
  }
  log(`${PKG.name} ${PKG.version}: схемы установлены. OpenSpec берёт их из пользовательской папки: ${target}`);
}

function openspecVersion() {
  try {
    return execFileSync('openspec', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], shell: platform() === 'win32' }).trim();
  } catch {
    return null;
  }
}

function cmpVersion(a, b) {
  const pa = a.split(/[.-]/).slice(0, 3).map(Number);
  const pb = b.split(/[.-]/).slice(0, 3).map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

export function versionCompatible(v, range = PKG.openspec.compatible) {
  const [, min, max] = range.match(/>=\s*([\d.]+)\s*<\s*([\d.]+)/);
  return cmpVersion(v, min) >= 0 && cmpVersion(v, max) < 0;
}

/** Возвращает { ok, lines }: ok=false, если есть проблемы, которые сломают процесс. */
export function doctor({ cwd = process.cwd(), store = null, target = userSchemasDir() } = {}) {
  const lines = [];
  let ok = true;
  const bad = (m) => { ok = false; lines.push(`  ✗ ${m}`); };
  const good = (m) => lines.push(`  ✓ ${m}`);
  const note = (m) => lines.push(`  • ${m}`);

  lines.push(`${PKG.name} ${PKG.version} (совместим с OpenSpec ${PKG.openspec.compatible})`);
  const v = openspecVersion();
  if (!v) bad('openspec не найден в PATH — установите стандартный OpenSpec (setup сделает это сам)');
  else if (!versionCompatible(v)) bad(`OpenSpec ${v} вне поддерживаемого диапазона ${PKG.openspec.compatible} — нужна новая версия дополнения или другая версия OpenSpec`);
  else good(`OpenSpec ${v}`);

  for (const name of bundledSchemaNames()) {
    const dir = join(target, name);
    if (!existsSync(join(dir, 'schema.yaml'))) { bad(`схема ${name} не установлена в ${target} — выполните: openspec-sdd install`); continue; }
    let marker = null;
    try { marker = JSON.parse(readFileSync(join(dir, MARKER), 'utf8')); } catch { /* нет маркера */ }
    const expected = schemaHash(join(BUNDLED_SCHEMAS, name));
    if (schemaHash(dir) !== expected) bad(`схема ${name} в ${dir} отличается от версии дополнения ${PKG.version}${marker ? ` (установлена ${marker.version})` : ''} — выполните: openspec-sdd install`);
    else good(`схема ${name} установлена и актуальна (${dir})`);
  }

  // Текущий репозиторий (может быть репозиторием приложения со схемой sdd-app).
  for (let dir = cwd; ; dir = dirname(dir)) {
    const cfg = join(dir, 'openspec', 'config.yaml');
    if (existsSync(cfg)) {
      const s = readConfigValue(cfg, 'schema');
      if (s === 'sdd-app') good(`репозиторий ${dir} — приложение на схеме sdd-app${readReferences(cfg).length ? `, хранилище: ${readReferences(cfg).join(', ')}` : ''}`);
      break;
    }
    if (dirname(dir) === dir) break;
  }
  let root = null;
  try { root = findStoreRoot(cwd, store); } catch { /* вне проекта */ }
  if (root) {
    const schema = readConfigValue(join(root, 'openspec', 'config.yaml'), 'schema');
    if (schema && bundledSchemaNames().includes(schema)) {
      if (existsSync(join(root, 'openspec', 'schemas', schema))) bad(`в проекте лежит своя копия схемы ${schema} (openspec/schemas/${schema}) — она перекрывает схему дополнения; удалите её`);
      else good(`проект ${root} использует схему ${schema} из дополнения`);
    } else note(`проект ${root} использует схему «${schema ?? 'по умолчанию'}», не из дополнения`);
  } else note('текущая папка не внутри проекта OpenSpec — проверка проекта пропущена');
  return { ok, lines };
}
