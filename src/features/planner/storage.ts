import {
  createInitialTasks,
  Task,
  TaskAttachment,
  TaskPriority,
  TaskRecurrence,
  Subtask,
} from "./model";

const STORAGE_KEY = "cubik.planner.tasks.v1";

type StoredPlanner = {
  version: 1;
  tasks: Task[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizePriority(value: unknown): TaskPriority {
  return value === "P1" || value === "P2" || value === "P3" ? value : "P3";
}

function normalizeRecurrence(value: unknown): TaskRecurrence {
  return value === "daily" || value === "weekly" || value === "monthly" ? value : "none";
}

function normalizeSubtasks(value: unknown): Subtask[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.title !== "string") return [];
    return [{ id: item.id, title: item.title, done: item.done === true }];
  });
}

function normalizeAttachments(value: unknown): TaskAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.name !== "string") return [];
    return [{ id: item.id, name: item.name }];
  });
}

function normalizeTask(value: unknown): Task | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string") return null;

  const now = new Date().toISOString();
  const duration = typeof value.durationMinutes === "number" && Number.isFinite(value.durationMinutes)
    ? Math.max(0, value.durationMinutes)
    : null;

  return {
    id: value.id,
    title: value.title,
    description: typeof value.description === "string" ? value.description : "",
    dueDate: nullableString(value.dueDate),
    startTime: nullableString(value.startTime),
    endTime: nullableString(value.endTime),
    durationMinutes: duration,
    priority: normalizePriority(value.priority),
    listId: nullableString(value.listId),
    tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === "string") : [],
    goalId: nullableString(value.goalId),
    recurrence: normalizeRecurrence(value.recurrence),
    subtasks: normalizeSubtasks(value.subtasks),
    attachments: normalizeAttachments(value.attachments),
    habit: value.habit === true,
    inbox: value.inbox === true,
    done: value.done === true,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now,
    completedAt: nullableString(value.completedAt),
  };
}

export function loadTasks(): { tasks: Task[]; error: string | null } {
  const fallback = () => createInitialTasks();

  if (typeof window === "undefined") {
    return { tasks: fallback(), error: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tasks: fallback(), error: null };

    const parsed = JSON.parse(raw) as Partial<StoredPlanner>;
    if (parsed.version !== 1 || !Array.isArray(parsed.tasks)) {
      return { tasks: fallback(), error: "Формат локальных данных устарел. Загружены безопасные демонстрационные данные." };
    }

    const tasks = parsed.tasks.flatMap((task) => {
      const normalized = normalizeTask(task);
      return normalized ? [normalized] : [];
    });
    const invalidCount = parsed.tasks.length - tasks.length;

    return {
      tasks,
      error: invalidCount > 0 ? `Пропущено повреждённых задач: ${invalidCount}. Остальные данные загружены.` : null,
    };
  } catch {
    return { tasks: fallback(), error: "Не удалось прочитать локальное хранилище. Загружены безопасные демонстрационные данные." };
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
