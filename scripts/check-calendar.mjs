import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

// Compile the actual local TypeScript modules without a separate test runtime.
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
const calendar = await import(moduleUrl("src/features/planner/calendar-model.ts"));
const recurrence = await import(moduleUrl("src/features/planner/calendar-recurrence.ts"));
const storage = await import(moduleUrl("src/features/planner/storage.ts"));
const initial = model.createInitialPlannerState();
const base = { ...initial.tasks[0], id: "series-test", dueDate: "2026-01-31", recurrence: "monthly", done: false, occurrenceOverrides: {} };
assert.equal(recurrence.isDateKey("2026-02-30"), false);
assert.equal(recurrence.isDateKey("2028-02-29"), true);
assert.equal(recurrence.occursOn(base, "2026-02-28"), true);
assert.equal(recurrence.occursOn(base, "2026-03-31"), true);
assert.equal(recurrence.occursOn(base, "2026-03-28"), false);
assert.equal(recurrence.occursOn(base, "2025-12-31"), false);
const daily = { ...base, dueDate: "2026-09-01", recurrence: "daily", occurrenceOverrides: {
  "2026-09-01": { dueDate: "2026-09-09", title: "Перенесённое событие" },
  "2026-09-02": { cancelled: true },
  "2026-09-03": { done: true, completedAt: "2026-09-03T10:00:00.000Z" },
} };
const week = recurrence.expandCalendarTasks([daily], "2026-09-01", "2026-09-07");
assert.equal(week.length, 5);
assert.equal(week.find((task) => task.occurrenceDate === "2026-09-03").done, true);
assert.equal(week.find((task) => task.occurrenceDate === "2026-09-04").done, false);
assert.equal(recurrence.expandCalendarTasks([daily], "2026-09-09", "2026-09-09").length, 2);
assert.equal(new Set(week.map((task) => task.id)).size, week.length);
assert.equal(recurrence.expandCalendarTasks([{ ...base, recurrence: "weekly", dueDate: "2026-09-01" }], "2026-09-01", "2026-09-14").length, 2);
assert.equal(calendar.calendarDays(new Date(2026, 8, 5), "week")[0].key, "2026-08-31");
assert.equal(calendar.calendarDays(new Date(2026, 1, 1), "month").length, 42);
assert.equal(calendar.minutes("25:00"), null);
assert.equal(calendar.schedulePatch("2026-09-05", 1425, 60).durationMinutes, 15);
assert.equal(calendar.schedulePatch("2026-09-05", 1425, 60).endTime, null);
assert.equal(calendar.schedulePatch("2026-09-05", null).durationMinutes, null);
const events = calendar.eventLayout([
  { ...base, id: "a", startTime: "09:00", endTime: "10:00" },
  { ...base, id: "b", startTime: "09:30", endTime: "10:30" },
  { ...base, id: "c", startTime: "10:30", endTime: "11:00" },
]);
assert.deepEqual(events.map((event) => event.lanes), [2, 2, 1]);
assert.notEqual(events[0].lane, events[1].lane);
const saved = new Map();
globalThis.window = { localStorage: { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) } };
assert.equal(storage.savePlanner({ ...initial, tasks: [daily] }), null);
const loaded = storage.loadPlanner();
assert.deepEqual(loaded.state.tasks[0].occurrenceOverrides, daily.occurrenceOverrides);
const malformed = { ...daily, occurrenceOverrides: { "not-a-date": { cancelled: true }, "2026-09-02": { startTime: "99:99", durationMinutes: -5, cancelled: true } } };
storage.savePlanner({ ...initial, tasks: [malformed] });
assert.deepEqual(storage.loadPlanner().state.tasks[0].occurrenceOverrides, { "2026-09-02": { cancelled: true } });
console.log("Calendar checks passed: recurrence, moved/completed/cancelled occurrences, storage round-trip, date boundaries, midnight and overlaps.");
