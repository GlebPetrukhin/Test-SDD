// Пути: пакет дополнения, пользовательская папка схем OpenSpec, корень хранилища спецификаций.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join, posix, resolve, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

export const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PKG = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'));
export const BUNDLED_SCHEMAS = join(PKG_ROOT, 'schemas');

/**
 * Папка пользовательских схем OpenSpec — та же логика, что getGlobalDataDir() в OpenSpec 1.15:
 * XDG_DATA_HOME > %LOCALAPPDATA% (Windows) > ~/.local/share; внутри openspec/schemas.
 */
export function userSchemasDir(env = process.env, os = platform(), home = homedir()) {
  const platformJoin = os === 'win32' ? win32.join : posix.join;
  if (env.XDG_DATA_HOME) return platformJoin(env.XDG_DATA_HOME, 'openspec', 'schemas');
  if (os === 'win32') {
    const base = env.LOCALAPPDATA || platformJoin(home, 'AppData', 'Local');
    return platformJoin(base, 'openspec', 'schemas');
  }
  return platformJoin(home, '.local', 'share', 'openspec', 'schemas');
}

/** Строка конфигурации `key: value` верхнего уровня из openspec/config.yaml (без YAML-парсера). */
export function readConfigValue(configFile, key) {
  if (!existsSync(configFile)) return null;
  const m = readFileSync(configFile, 'utf8').match(new RegExp(`^${key}:\\s*["']?([^"'#\\s]+)`, 'm'));
  return m ? m[1] : null;
}

/** Список references из openspec/config.yaml: «- id», «- { id: x, ... }» или «- store: x». */
export function readReferences(configFile) {
  if (!existsSync(configFile)) return [];
  const lines = readFileSync(configFile, 'utf8').split(/\r?\n/);
  const start = lines.findIndex((l) => /^references:\s*$/.test(l));
  if (start < 0) return [];
  const ids = [];
  for (const l of lines.slice(start + 1)) {
    if (/^\S/.test(l)) break;
    const m = l.match(/^\s*-\s*(?:\{\s*id:\s*["']?([\w.-]+)|store:\s*["']?([\w.-]+)|["']?([\w.-]+)["']?\s*$)/);
    if (m) ids.push(m[1] || m[2] || m[3]);
  }
  return ids;
}

function isStoreRoot(dir) {
  return existsSync(join(dir, 'openspec')) && (existsSync(join(dir, 'openspec', 'specs')) || existsSync(join(dir, 'openspec', 'changes')));
}

function storePathById(id) {
  try {
    const out = execFileSync('openspec', ['store', 'list', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], shell: platform() === 'win32' });
    const hit = JSON.parse(out).stores?.find((s) => s.id === id);
    return hit?.root ?? null;
  } catch {
    return null;
  }
}

/**
 * Корень, где лежат openspec/specs и openspec/changes:
 *  - явный --store <путь>;
 *  - текущая папка или выше, если там openspec/ со specs или changes;
 *  - кодовый репозиторий со строкой `store: <id>` в openspec/config.yaml — через `openspec store list`, иначе соседняя папка <id>;
 *  - папка, внутри которой лежит хранилище (например корень SDD с sdd-specs/).
 */
export function findStoreRoot(start = process.cwd(), explicit = null) {
  if (explicit) {
    const p = resolve(explicit);
    if (!isStoreRoot(p)) throw new Error(`в ${p} нет openspec/specs или openspec/changes`);
    return p;
  }
  for (let dir = resolve(start); ; dir = dirname(dir)) {
    const config = join(dir, 'openspec', 'config.yaml');
    // Репозиторий приложения (схема статьи): свой openspec/ на схеме sdd-app (или без specs/), хранилище подключено через references.
    // OpenSpec может сам создать пустую openspec/specs и в репозитории приложения, поэтому решает схема.
    const refs = readReferences(config);
    const isApp = readConfigValue(config, 'schema') === 'sdd-app' || !existsSync(join(dir, 'openspec', 'specs'));
    if (refs.length && isApp) {
      const byRegistry = storePathById(refs[0]);
      if (byRegistry && isStoreRoot(byRegistry)) return byRegistry;
      const sibling = join(dirname(dir), refs[0]);
      if (isStoreRoot(sibling)) return sibling;
      throw new Error(`хранилище «${refs[0]}» из references в ${config} не найдено (openspec store register <путь>)`);
    }
    if (isStoreRoot(dir)) return dir;
    const pointer = readConfigValue(config, 'store');
    if (pointer) {
      const byRegistry = storePathById(pointer);
      if (byRegistry && isStoreRoot(byRegistry)) return byRegistry;
      const sibling = join(dirname(dir), pointer);
      if (isStoreRoot(sibling)) return sibling;
      throw new Error(`хранилище «${pointer}» из ${join(dir, 'openspec', 'config.yaml')} не найдено (openspec store register <путь>)`);
    }
    if (existsSync(dir) && statSync(dir).isDirectory()) {
      const child = readdirSync(dir).find((n) => existsSync(join(dir, n, '.openspec-store', 'store.yaml')) && isStoreRoot(join(dir, n)));
      if (child) return join(dir, child);
    }
    if (dirname(dir) === dir) break;
  }
  throw new Error('не найдено хранилище спецификаций (openspec/specs) — запустите из него, из кодового репозитория со строкой store: или укажите --store <путь>');
}
