import { Task, localDateKey } from "./model";

export function minutes(value: string | null) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(":").map(Number);
  return h < 24 && m < 60 ? h * 60 + m : null;
}
export function timeLabel(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
export function duration(task: Task) {
  const start = minutes(task.startTime);
  const end = minutes(task.endTime);
  return Math.max(15, end !== null && start !== null && end > start ? end - start : task.durationMinutes || 60);
}
export function schedulePatch(date: string, start: number | null, length = 60): Partial<Task> {
  if (start === null) return { dueDate: date, startTime: null, endTime: null, durationMinutes: null, inbox: false };
  const end = Math.min(1440, start + Math.max(15, length));
  return { dueDate: date, startTime: timeLabel(start), endTime: end === 1440 ? null : timeLabel(end), durationMinutes: end - start, inbox: false };
}
export function calendarDays(anchor: Date, mode: "day" | "week" | "month") {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), mode === "month" ? 1 : anchor.getDate(), 12);
  if (mode !== "day") first.setDate(first.getDate() - (first.getDay() + 6) % 7);
  return Array.from({ length: mode === "month" ? 42 : mode === "week" ? 7 : 1 }, (_, i) => {
    const date = new Date(first); date.setDate(date.getDate() + i);
    return { date, key: localDateKey(date) };
  });
}
export function eventLayout(tasks: Task[]) {
  const sorted = tasks.filter((task) => minutes(task.startTime) !== null).sort((a, b) => minutes(a.startTime)! - minutes(b.startTime)!);
  const result: { task: Task; start: number; end: number; lane: number; lanes: number }[] = [];
  let cluster: typeof result = [];
  let clusterEnd = -1;
  const finish = () => { const lanes = Math.max(1, ...cluster.map((event) => event.lane + 1)); cluster.forEach((event) => { event.lanes = lanes; }); cluster = []; };
  for (const task of sorted) {
    const start = minutes(task.startTime)!;
    if (start >= clusterEnd) finish();
    const occupied = new Set(cluster.filter((event) => event.end > start).map((event) => event.lane));
    let lane = 0; while (occupied.has(lane)) lane++;
    const event = { task, start, end: Math.min(1440, start + duration(task)), lane, lanes: 1 };
    cluster.push(event); result.push(event); clusterEnd = Math.max(...cluster.map((item) => item.end));
  }
  finish(); return result;
}
