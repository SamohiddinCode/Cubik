import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const modules = new Map();
function moduleUrl(file) {
  const absolute = path.resolve(file);
  if (modules.has(absolute)) return modules.get(absolute);
  let code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  code = code.replace(/from\s+["'](\.[^"']+)["']/g, (_, specifier) => `from ${JSON.stringify(moduleUrl(path.resolve(path.dirname(absolute), `${specifier}.ts`)))}`);
  const url = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
  modules.set(absolute, url);
  return url;
}

const model = await import(moduleUrl("src/features/planner/model.ts"));
const matrix = await import(moduleUrl("src/features/planner/eisenhower-model.ts"));
const now = new Date(2026, 8, 6, 12);
const tasks = model.createInitialTasks(now).map((task, index) => ({ ...task, id: `task-${index}`, order: 2 - index }));
tasks[0] = { ...tasks[0], dueDate: "2026-09-05", priority: "P1", tags: ["Launch"] };
tasks[1] = { ...tasks[1], dueDate: "2026-09-06", priority: "P2", listId: "work" };
tasks[2] = { ...tasks[2], dueDate: null, priority: "P3", title: "English practice" };

assert.deepEqual(matrix.eisenhowerQuadrants.map((item) => item.priority), ["P1", "P2", "P3", "P4"]);
assert.equal(matrix.filterMatrixTasks(tasks, { query: "launch", listId: "", scope: "all", showCompleted: false, now }).length, 1);
assert.equal(matrix.filterMatrixTasks(tasks, { query: "", listId: "work", scope: "today", showCompleted: false, now }).length, 1);
assert.equal(matrix.filterMatrixTasks(tasks, { query: "", listId: "", scope: "overdue", showCompleted: false, now })[0].priority, "P1");
assert.equal(matrix.filterMatrixTasks(tasks, { query: "", listId: "", scope: "undated", showCompleted: false, now })[0].priority, "P3");
assert.deepEqual(matrix.sortMatrixTasks(tasks, "manual").map((task) => task.order), [0, 1, 2]);
assert.deepEqual(matrix.sortMatrixTasks(tasks, "name").map((task) => task.title), [...tasks].map((task) => task.title).sort((a, b) => a.localeCompare(b, "ru")));
tasks[0].done = true;
assert.equal(matrix.filterMatrixTasks(tasks, { query: "", listId: "", scope: "all", showCompleted: false, now }).length, 2);
assert.equal(matrix.filterMatrixTasks(tasks, { query: "", listId: "", scope: "all", showCompleted: true, now }).length, 3);

console.log("Eisenhower checks passed: quadrants, search, list/date scopes, sorting and completed visibility.");
