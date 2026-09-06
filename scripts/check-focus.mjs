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

const focus = await import(moduleUrl("src/features/planner/focus-model.ts"));
const initial = focus.createFocusTimerState();
assert.equal(initial.remainingSeconds, 25 * 60);
assert.equal(focus.nextFocusMode("focus", 1, initial.settings), "shortBreak");
assert.equal(focus.nextFocusMode("focus", 4, initial.settings), "longBreak");
assert.equal(focus.nextFocusMode("shortBreak", 1, initial.settings), "focus");

const started = focus.startFocusTimer({ ...initial, selectedTaskId: "task-1" }, 1_000);
assert.equal(started.endsAt, 1_501_000);
assert.equal(focus.pauseFocusTimer(started, 2_000).remainingSeconds, 1_499);
const completed = focus.tickFocusTimer(started, 1_501_000);
assert.equal(completed.mode, "shortBreak");
assert.equal(completed.completedFocuses, 1);
assert.equal(completed.sessions.length, 1);
assert.equal(completed.sessions[0].taskId, "task-1");
assert.equal(completed.isRunning, false);

const auto = { ...started, settings: { ...started.settings, autoStartBreak: true } };
const autoCompleted = focus.tickFocusTimer(auto, 1_501_000);
assert.equal(autoCompleted.isRunning, true);
assert.equal(autoCompleted.endsAt, 1_501_000 + 5 * 60_000);

const malformed = focus.normalizeFocusTimerState({ mode: "bad", remainingSeconds: -4, settings: { focusMinutes: 999, shortBreakMinutes: 10 }, sessions: [{ id: 1 }] });
assert.equal(malformed.mode, "focus");
assert.equal(malformed.settings.focusMinutes, 25);
assert.equal(malformed.settings.shortBreakMinutes, 10);
assert.equal(malformed.remainingSeconds, 25 * 60);
assert.deepEqual(malformed.sessions, []);

console.log("Focus checks passed: cycle transitions, precise pause, completion log, auto-start and storage normalization.");
