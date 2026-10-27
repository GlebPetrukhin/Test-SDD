// Feasibility experiment for interface review; not application code or QA acceptance tests.
import { performance } from 'node:perf_hooks';
import { cpus } from 'node:os';

const emptyId = /^\p{White_Space}*$/u;
const fields = ['name', 'type', 'voltageKv', 'links'];

function index(objects) {
  const unique = new Map();
  const duplicates = new Set();
  let emptyCount = 0;
  for (const object of objects) {
    if (emptyId.test(object.id)) {
      emptyCount++;
    } else if (unique.has(object.id)) {
      duplicates.add(object.id);
    } else {
      unique.set(object.id, object);
    }
  }
  return { unique, duplicates, emptyCount };
}

function compare(before, after) {
  const left = index(before.objects);
  const right = index(after.objects);
  const excludedIds = new Set([...left.duplicates, ...right.duplicates]);
  const changes = [];
  for (const [id, previous] of left.unique) {
    if (excludedIds.has(id)) continue;
    const next = right.unique.get(id);
    if (!next) {
      changes.push({ id, kind: 'removed', before: previous });
      continue;
    }
    const changedFields = [];
    for (const field of fields) {
      const a = previous[field];
      const b = next[field];
      const same = field === 'links'
        ? a.length === b.length && a.every((value, position) => value === b[position])
        : a === b;
      if (!same) changedFields.push({ field, before: a, after: b });
    }
    if (changedFields.length) changes.push({ id, kind: 'modified', fields: changedFields });
  }
  for (const [id, next] of right.unique) {
    if (!excludedIds.has(id) && !left.unique.has(id)) {
      changes.push({ id, kind: 'added', after: next });
    }
  }
  return {
    changes,
    excludedIds: [...excludedIds],
    emptyBefore: left.emptyCount,
    emptyAfter: right.emptyCount,
  };
}

function document(objectCount, linkCount, changed) {
  return {
    objects: Array.from({ length: objectCount }, (_, i) => ({
      id: `object-${i}`,
      name: `Object ${i}${changed ? ' changed' : ''}`,
      type: changed ? 'transformer' : 'line',
      voltageKv: changed ? 220 : 110,
      // The final position changes so sequence comparison traverses the entire array.
      links: Array.from({ length: linkCount }, (_, k) =>
        `object-${changed && k === linkCount - 1 ? (k + 1) % objectCount : k % objectCount}`),
    })),
  };
}

function percentile(values, ratio) {
  return values[Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1)];
}

const results = [];
for (const linkCount of [8, 100, 1000]) {
  for (const changed of [false, true]) {
    const before = document(1000, linkCount, false);
    const after = document(1000, linkCount, changed);
    const serialized = JSON.stringify({ before, after });
    const parseTimes = [];
    let loaded;
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      const decoded = JSON.parse(serialized);
      parseTimes.push(performance.now() - start);
      if (decoded.after.objects.length !== 1000) throw new Error('Invalid fixture');
      loaded = decoded;
    }
    // Warm-up is excluded from the measurements.
    for (let i = 0; i < 10; i++) compare(loaded.before, loaded.after);
    const durations = [];
    let observedChanges = 0;
    for (let i = 0; i < 40; i++) {
      const start = performance.now();
      const result = compare(loaded.before, loaded.after);
      durations.push(performance.now() - start);
      observedChanges = result.changes.length;
    }
    if (observedChanges !== (changed ? 1000 : 0)) throw new Error('Unexpected comparison result');
    durations.sort((a, b) => a - b);
    parseTimes.sort((a, b) => a - b);
    results.push({
      objectsPerVersion: 1000,
      linksPerObject: linkCount,
      case: changed ? 'all-four-fields-changed' : 'identical',
      pairJsonBytes: Buffer.byteLength(serialized),
      samples: durations.length,
      medianMs: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95),
      maxMs: durations.at(-1),
      pairParseMedianMs: percentile(parseTimes, 0.5),
      observedChanges,
    });
  }
}

console.log(JSON.stringify({
  purpose: 'CPU feasibility estimate only; excludes browser rendering, network, full Model history and production implementation',
  runtime: process.version,
  platform: process.platform,
  cpu: cpus()[0]?.model,
  results,
}, null, 2));
