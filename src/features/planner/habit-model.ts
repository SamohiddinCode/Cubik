import { localDateKey, TaskRecurrence } from "./model";

export type HabitTrackingState = {
  version: 1;
  checkins: Record<string, string[]>;
};

export const HABIT_STORAGE_KEY = "cubik.planner.habits.v1";

export function createHabitTrackingState(): HabitTrackingState {
  return { version: 1, checkins: {} };
}

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(`${value}T12:00:00`).getTime());
}

function dateFromKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function normalizeHabitTrackingState(value: unknown): HabitTrackingState {
  if (!value || typeof value !== "object") return createHabitTrackingState();
  const candidate = value as Record<string, unknown>;
  if (!candidate.checkins || typeof candidate.checkins !== "object" || Array.isArray(candidate.checkins)) return createHabitTrackingState();

  const checkins: Record<string, string[]> = {};
  for (const [habitId, rawDates] of Object.entries(candidate.checkins as Record<string, unknown>)) {
    if (!habitId || !Array.isArray(rawDates)) continue;
    checkins[habitId] = [...new Set(rawDates.filter(isDateKey))].sort().slice(-500);
  }
  return { version: 1, checkins };
}

export function periodKey(dateKey: string, recurrence: TaskRecurrence) {
  if (recurrence === "monthly") return dateKey.slice(0, 7);
  if (recurrence !== "weekly") return dateKey;
  const date = dateFromKey(dateKey);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return localDateKey(date);
}

export function shiftPeriod(dateKey: string, recurrence: TaskRecurrence, amount: number) {
  const date = dateFromKey(dateKey);
  if (recurrence === "monthly") {
    date.setDate(1);
    date.setMonth(date.getMonth() + amount);
  } else if (recurrence === "weekly") {
    date.setDate(date.getDate() + amount * 7);
  } else {
    date.setDate(date.getDate() + amount);
  }
  return periodKey(localDateKey(date), recurrence);
}

export function habitIsComplete(dates: string[], dateKey: string, recurrence: TaskRecurrence) {
  const expected = periodKey(dateKey, recurrence);
  return dates.some((date) => periodKey(date, recurrence) === expected);
}

export function toggleHabitPeriod(state: HabitTrackingState, habitId: string, dateKey: string, recurrence: TaskRecurrence): HabitTrackingState {
  const dates = state.checkins[habitId] ?? [];
  const targetPeriod = periodKey(dateKey, recurrence);
  const completed = dates.some((date) => periodKey(date, recurrence) === targetPeriod);
  const nextDates = completed
    ? dates.filter((date) => periodKey(date, recurrence) !== targetPeriod)
    : [...dates, dateKey].sort().slice(-500);
  return { ...state, checkins: { ...state.checkins, [habitId]: nextDates } };
}

export function habitCurrentStreak(dates: string[], todayKey: string, recurrence: TaskRecurrence) {
  const completedPeriods = new Set(dates.map((date) => periodKey(date, recurrence)));
  let cursor = periodKey(todayKey, recurrence);
  if (!completedPeriods.has(cursor)) cursor = shiftPeriod(cursor, recurrence, -1);
  let streak = 0;
  while (completedPeriods.has(cursor) && streak < 500) {
    streak += 1;
    cursor = shiftPeriod(cursor, recurrence, -1);
  }
  return streak;
}

export function habitConsistency(dates: string[], todayKey: string, recurrence: TaskRecurrence) {
  const windowSize = recurrence === "monthly" ? 3 : recurrence === "weekly" ? 4 : 7;
  const completedPeriods = new Set(dates.map((date) => periodKey(date, recurrence)));
  const current = periodKey(todayKey, recurrence);
  let completed = 0;
  for (let index = 0; index < windowSize; index += 1) {
    if (completedPeriods.has(shiftPeriod(current, recurrence, -index))) completed += 1;
  }
  return Math.round(completed / windowSize * 100);
}

export function recentDateKeys(today: Date, days = 7) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (days - index - 1));
    return localDateKey(date);
  });
}
