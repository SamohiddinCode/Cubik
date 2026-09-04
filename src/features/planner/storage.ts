import { initialTasks, Task } from "./model";

const STORAGE_KEY = "cubik.planner.tasks.v1";

type StoredPlanner = {
  version: 1;
  tasks: Task[];
};

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<Task>;
  return typeof task.id === "string" && typeof task.title === "string" && typeof task.done === "boolean";
}

export function loadTasks(): { tasks: Task[]; error: string | null } {
  if (typeof window === "undefined") {
    return { tasks: initialTasks, error: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tasks: initialTasks, error: null };

    const parsed = JSON.parse(raw) as Partial<StoredPlanner>;
    if (parsed.version !== 1 || !Array.isArray(parsed.tasks)) {
      return { tasks: initialTasks, error: "Формат локальных данных устарел. Загружены безопасные демонстрационные данные." };
    }

    const tasks = parsed.tasks.filter(isTask);
    return { tasks: tasks.length > 0 ? tasks : initialTasks, error: null };
  } catch {
    return { tasks: initialTasks, error: "Не удалось прочитать локальное хранилище. Данные текущей сессии останутся доступны." };
  }
}

export function saveTasks(tasks: Task[]): string | null {
  if (typeof window === "undefined") return null;

  try {
    const payload: StoredPlanner = { version: 1, tasks };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return null;
  } catch {
    return "Не удалось сохранить изменения в браузере.";
  }
}
