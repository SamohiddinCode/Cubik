import { Task, localDateKey } from "./model";

export type CalendarEntry = Task & { seriesId?: string; occurrenceDate?: string };

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && localDateKey(date) === value;
}

export function occursOn(task: Task, key: string) {
  if (!isDateKey(task.dueDate) || key < task.dueDate) return false;
  const start = new Date(`${task.dueDate}T12:00:00`);
  const day = new Date(`${key}T12:00:00`);
  if (task.recurrence === "daily") return true;
  if (task.recurrence === "weekly") return start.getDay() === day.getDay();
  if (task.recurrence === "monthly") {
    const last = new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate();
    return day.getDate() === Math.min(start.getDate(), last);
  }
  return key === task.dueDate;
}

export function expandCalendarTasks(tasks: Task[], first: string, last: string): CalendarEntry[] {
  if (!isDateKey(first) || !isDateKey(last) || last < first) return [];
  const days: string[] = [];
  const cursor = new Date(`${first}T12:00:00`);
  for (let count = 0; count < 366 && localDateKey(cursor) <= last; count++) {
    days.push(localDateKey(cursor)); cursor.setDate(cursor.getDate() + 1);
  }
  return tasks.flatMap((task): CalendarEntry[] => {
    if (task.recurrence === "none" || !isDateKey(task.dueDate)) return [task];
    const candidates = new Set([...days, ...Object.keys(task.occurrenceOverrides ?? {})]);
    return [...candidates].flatMap((date) => {
      if (!isDateKey(date) || !occursOn(task, date)) return [];
      const override = task.occurrenceOverrides?.[date];
      if (override?.cancelled) return [];
      const dueDate = override?.dueDate ?? date;
      if (dueDate < first || dueDate > last) return [];
      const original = date === task.dueDate;
      return [{ ...task, done: original ? task.done : false, completedAt: original ? task.completedAt : null, ...override,
        id: `occurrence:${encodeURIComponent(task.id)}:${date}`, dueDate, seriesId: task.id, occurrenceDate: date }];
    });
  });
}
