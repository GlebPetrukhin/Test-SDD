// Проверка нумерации задач в tasks.md — та же, что OpenSpec выполняет только для встроенной схемы spec-driven.
// Перенесено из OpenSpec 1.15.0: src/core/validation/task-numbering.ts и src/utils/task-progress.ts
// (Copyright (c) Fission AI, лицензия MIT). Правила и регулярные выражения не менялись, сообщения — на русском.
//
// Нумерация учитывается только внутри групп `## N.`; ненумерованные разделы, задачи без номера
// и файлы без нумерованных групп пропускаются.

const TASK_LINE_PATTERN = /^\s*(?:[-*+]|\d{1,9}[.)])\s*\[(?:\s*([^\]\s]?)\s*\](?![([])|\s+\])\s*(.*)/;
const LEVEL_TWO_HEADING = /^ {0,3}##(?!#)(?:[ \t]+|[ \t]*\r?$)/;
const NUMBERED_GROUP_HEADING = /^ {0,3}##[ \t]+(\d+)\.(?:[ \t]|\r?$)/;
const TASK_ID = /^(\d+(?:\.\d+)+(?:[A-Za-z]+)?)(?=\s|$)/;

/** documents: [{ path, content }] → [{ path, line, message }] */
export function findTaskNumberingIssues(documents) {
  const issues = [];
  const firstLocationById = new Map();

  for (const document of documents) {
    const lines = document.content.split('\n');
    if (!lines.some((line) => NUMBERED_GROUP_HEADING.test(line))) continue;

    let currentGroup;
    lines.forEach((line, index) => {
      if (LEVEL_TWO_HEADING.test(line)) currentGroup = line.match(NUMBERED_GROUP_HEADING)?.[1];
      if (currentGroup === undefined) return;

      const task = line.match(TASK_LINE_PATTERN);
      const id = task?.[2].trim().match(TASK_ID)?.[1];
      if (!id) return;

      const lineNumber = index + 1;
      const taskGroup = id.split('.')[0];
      if (taskGroup.replace(/^0+(?=\d)/, '') !== currentGroup.replace(/^0+(?=\d)/, '')) {
        issues.push({
          path: document.path,
          line: lineNumber,
          message: `задача «${id}» стоит в группе ${currentGroup}, а её номер указывает на группу ${taskGroup} — перенесите её в группу ${taskGroup} или перенумеруйте`,
        });
      }

      const first = firstLocationById.get(id);
      if (first !== undefined) {
        const where = first.path === document.path ? `в строке ${first.line}` : `в ${first.path}, строка ${first.line}`;
        issues.push({ path: document.path, line: lineNumber, message: `ID задачи «${id}» повторяется; впервые объявлен ${where}` });
      } else {
        firstLocationById.set(id, { path: document.path, line: lineNumber });
      }
    });
  }
  return issues;
}
