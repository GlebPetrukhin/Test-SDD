// Разбор spec.md (сценарии с ID) и test-cases.md (тест-кейсы) — общий для trace-check и merge-test-cases.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const SCENARIO_ID = /^[a-z0-9][a-z0-9-]*-\d+$/i;
export const LEVELS = new Set(['unit', 'integration', 'e2e', 'manual']);
const SKIP_DIRS = new Set(['node_modules', 'bin', 'obj', 'dist', '.angular', '.git', 'test-results', 'playwright-report']);

export function walk(dir, filter, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

/** Сценарии spec.md: { id, title, section (MAIN|ADDED|MODIFIED|REMOVED|RENAMED), line }. */
export function parseSpec(text) {
  const scenarios = [];
  let section = 'MAIN';
  text.split(/\r?\n/).forEach((line, i) => {
    const sec = line.match(/^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements/i);
    if (sec) section = sec[1].toUpperCase();
    else if (/^##\s+(Purpose|Requirements)\b/i.test(line)) section = 'MAIN';
    const m = line.match(/^####\s+Scenario:\s*(.*)$/);
    if (!m) return;
    const id = m[1].match(/^\[([a-z0-9][a-z0-9-]*-\d+)\]\s*(.*)$/i);
    scenarios.push({ id: id ? id[1] : null, title: id ? id[2].trim() : m[1].trim(), section, line: i + 1 });
  });
  return scenarios;
}

/**
 * test-cases.md: шапка до первого раздела capability, разделы `## <capability>` с кейсами `### [<сценарий>.<n>] ...`,
 * служебные разделы Gaps и Coverage.
 * Возвращает { head, capabilities: Map<cap, cases[]>, gaps: string[], cases[] }; case = { id, scenario, n, title, level, line, block, cap }.
 */
export function parseCases(text) {
  const lines = text.split(/\r?\n/);
  const capabilities = new Map();
  const cases = [];
  const gaps = [];
  const headLines = [];
  let cap = null;
  let mode = 'head';
  let cur = null;
  const close = () => {
    if (cur) {
      cur.block = cur.lines.join('\n').replace(/\s+$/, '');
      delete cur.lines;
      cur = null;
    }
  };
  lines.forEach((line, i) => {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2 && !line.startsWith('###')) {
      close();
      const name = h2[1].replace(/<!--.*?-->/g, '').trim();
      if (/^gaps$/i.test(name)) mode = 'gaps';
      else if (/^coverage$/i.test(name)) mode = 'coverage';
      else {
        mode = 'cases';
        cap = name;
        if (!capabilities.has(cap)) capabilities.set(cap, []);
      }
      return;
    }
    if (mode === 'head') { headLines.push(line); return; }
    if (mode === 'gaps') { if (line.trim()) gaps.push(line); return; }
    if (mode === 'coverage') return;
    const h3 = line.match(/^###\s+\[([a-z0-9][a-z0-9-]*-\d+)\.(\d+)\]\s*(.*)$/i);
    if (h3) {
      close();
      cur = { id: `${h3[1]}.${h3[2]}`, scenario: h3[1], n: Number(h3[2]), title: h3[3].trim(), level: null, automation: null, line: i + 1, cap, lines: [line] };
      cases.push(cur);
      capabilities.get(cap).push(cur);
      return;
    }
    if (cur) {
      cur.lines.push(line);
      const lv = line.match(/^-\s+\*\*Level\*\*:\s*`?([a-z0-9-]+)/i);
      if (lv && !cur.level) cur.level = lv[1].toLowerCase();
      const au = line.match(/^-\s+\*\*Automation\*\*:\s*(.+)$/i);
      if (au && !cur.automation) cur.automation = au[1].trim();
    }
  });
  close();
  return { head: headLines.join('\n').replace(/\s+$/, ''), capabilities, cases, gaps };
}

export const scenarioOrder = (id) => Number(id.slice(id.lastIndexOf('-') + 1));
export const byScenarioThenCase = (a, b) => scenarioOrder(a.scenario) - scenarioOrder(b.scenario) || a.n - b.n;

export const readText = (p) => readFileSync(p, 'utf8');

/** Репозиторий, в котором живёт автотест кейса: первый сегмент пути в поле Automation («sdd-backend/tests/...»). */
export function ownerRepo(c) {
  const m = c.automation?.replace(/`/g, '').match(/^([A-Za-z0-9._-]+)\//);
  return m ? m[1] : null;
}

/** ID тест-кейсов, упомянутых в тексте ([<capability>-<NN>.<n>]). */
export const caseIdsIn = (text) => [...new Set([...text.matchAll(/\[([a-z][a-z0-9-]*-\d+\.\d+)\]/gi)].map((m) => m[1]))];
