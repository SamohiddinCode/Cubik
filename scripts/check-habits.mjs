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

const habits = await import(moduleUrl("src/features/planner/habit-model.ts"));
const initial = habits.createHabitTrackingState();
assert.deepEqual(initial, { version: 1, checkins: {} });

const checked = habits.toggleHabitPeriod(initial, "read", "2026-09-06", "daily");
assert.equal(habits.habitIsComplete(checked.checkins.read, "2026-09-06", "daily"), true);
assert.deepEqual(habits.toggleHabitPeriod(checked, "read", "2026-09-06", "daily").checkins.read, []);

const weekly = habits.toggleHabitPeriod(initial, "review", "2026-09-03", "weekly");
assert.equal(habits.habitIsComplete(weekly.checkins.review, "2026-09-06", "weekly"), true);
assert.deepEqual(habits.toggleHabitPeriod(weekly, "review", "2026-09-06", "weekly").checkins.review, []);

assert.equal(habits.habitCurrentStreak(["2026-09-04", "2026-09-05", "2026-09-06"], "2026-09-06", "daily"), 3);
assert.equal(habits.habitCurrentStreak(["2026-09-03", "2026-08-27"], "2026-09-06", "weekly"), 2);
assert.equal(habits.habitConsistency(["2026-09-04", "2026-09-05", "2026-09-06"], "2026-09-06", "daily"), 43);
assert.deepEqual(habits.recentDateKeys(new Date(2026, 8, 6, 12)), ["2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06"]);

const normalized = habits.normalizeHabitTrackingState({ checkins: { read: ["bad", "2026-09-06", "2026-09-06"], broken: "no" } });
assert.deepEqual(normalized.checkins.read, ["2026-09-06"]);
assert.equal(normalized.checkins.broken, undefined);

console.log("Habit checks passed: daily/weekly periods, toggle, streaks, consistency, recent dates and storage normalization.");
