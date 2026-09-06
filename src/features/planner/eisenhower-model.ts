import { addDaysKey, localDateKey, Task, TaskPriority } from "./model";

export type MatrixScope = "all" | "today" | "week" | "overdue" | "undated";
export type MatrixSort = "manual" | "date" | "name";

export type EisenhowerQuadrant = {
  priority: TaskPriority;
  index: number;
  title: string;
  action: string;
  description: string;
  tone: "red" | "blue" | "amber" | "slate";
};

export const eisenhowerQuadrants: readonly EisenhowerQuadrant[] = [
  { priority: "P1", index: 1, title: "Важно и срочно", action: "Сделать сейчас", description: "Критичные задачи с близким сроком", tone: "red" },
  { priority: "P2", index: 2, title: "Важно, не срочно", action: "Запланировать", description: "Развитие, цели и важная системная работа", tone: "blue" },
  { priority: "P3", index: 3, title: "Срочно, не важно", action: "Делегировать", description: "Передать, упростить или закрыть быстро", tone: "amber" },
  { priority: "P4", index: 4, title: "Не срочно и не важно", action: "Сократить", description: "Убрать лишнее и защитить своё внимание", tone: "slate" },
] as const;

type MatrixFilter = {
  query: string;
  listId: string;
  scope: MatrixScope;
  showCompleted: boolean;
  now?: Date;
};

export function filterMatrixTasks(tasks: Task[], filter: MatrixFilter) {
  const today = localDateKey(filter.now);
  const weekEnd = addDaysKey(6, filter.now);
  const query = filter.query.trim().toLocaleLowerCase("ru-RU");

  return tasks.filter((task) => {
    if (!filter.showCompleted && task.done) return false;
    if (filter.listId && task.listId !== filter.listId) return false;
    if (query) {
      const haystack = [task.title, task.description, ...task.tags].join(" ").toLocaleLowerCase("ru-RU");
      if (!haystack.includes(query)) return false;
    }

    if (filter.scope === "today") return task.dueDate === today;
    if (filter.scope === "week") return task.dueDate !== null && task.dueDate >= today && task.dueDate <= weekEnd;
    if (filter.scope === "overdue") return !task.done && task.dueDate !== null && task.dueDate < today;
    if (filter.scope === "undated") return task.dueDate === null;
    return true;
  });
}

export function sortMatrixTasks(tasks: Task[], sort: MatrixSort) {
  return [...tasks].sort((left, right) => {
    if (sort === "name") return left.title.localeCompare(right.title, "ru");
    if (sort === "date") {
      return (left.dueDate ?? "9999-12-31").localeCompare(right.dueDate ?? "9999-12-31")
        || (left.startTime ?? "99:99").localeCompare(right.startTime ?? "99:99")
        || left.order - right.order;
    }
    return left.order - right.order;
  });
}
