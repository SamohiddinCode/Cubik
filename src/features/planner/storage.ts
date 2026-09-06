import {
  createInitialLists,
  createInitialPlannerState,
  PlannerState,
  Task,
  TaskAttachment,
  TaskList,
  TaskPriority,
  TaskRecurrence,
  Subtask,
  OccurrenceOverride,
} from "./model";
import { isDateKey } from "./calendar-recurrence";
import { minutes } from "./calendar-model";

const STORAGE_KEY = "cubik.planner.v3";
const LEGACY_PLANNER_KEY = "cubik.planner.v2";
const LEGACY_TASKS_KEY = "cubik.planner.tasks.v1";

type StoredPlanner = PlannerState & {
  version: 3;
};

type LegacyPlannerV2 = PlannerState & { version: 2 };

type LegacyStoredPlanner = {
  version: 1;
  tasks: unknown[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizePriority(value: unknown): TaskPriority {
  return value === "P1" || value === "P2" || value === "P3" || value === "P4" ? value : "P4";
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

function normalizeTask(value: unknown, fallbackOrder = 0): Task | null {
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
    favorite: value.favorite === true,
    done: value.done === true,
    order: typeof value.order === "number" && Number.isFinite(value.order) ? value.order : fallbackOrder,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now,
    completedAt: nullableString(value.completedAt),
    occurrenceOverrides: normalizeOverrides(value.occurrenceOverrides),
  };
}

function normalizeOverrides(value: unknown): Record<string, OccurrenceOverride> {
  if (!isRecord(value)) return {};
  const result: Record<string, OccurrenceOverride> = {};
  for (const [date, raw] of Object.entries(value)) {
    if (!isDateKey(date) || !isRecord(raw)) continue;
    const item: OccurrenceOverride = {};
    if (typeof raw.title === "string" && raw.title.trim()) item.title = raw.title;
    if (isDateKey(raw.dueDate)) item.dueDate = raw.dueDate;
    for (const key of ["startTime", "endTime"] as const) {
      if (raw[key] === null || (typeof raw[key] === "string" && minutes(raw[key]) !== null)) item[key] = raw[key];
    }
    if (raw.durationMinutes === null || (typeof raw.durationMinutes === "number" && Number.isFinite(raw.durationMinutes) && raw.durationMinutes > 0 && raw.durationMinutes <= 1440)) item.durationMinutes = raw.durationMinutes;
    if (typeof raw.done === "boolean") item.done = raw.done;
    if (raw.completedAt === null || (typeof raw.completedAt === "string" && Number.isFinite(Date.parse(raw.completedAt)))) item.completedAt = raw.completedAt;
    if (typeof raw.cancelled === "boolean") item.cancelled = raw.cancelled;
    result[date] = item;
  }
  return result;
}

function normalizeList(value: unknown): TaskList | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") return null;
  const color = typeof value.color === "string" && /^#[0-9a-f]{6}$/i.test(value.color) ? value.color : "#3c70ff";
  return {
    id: value.id,
    name: value.name.trim() || "Без названия",
    color,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
  };
}

function normalizeTasks(value: unknown) {
  if (!Array.isArray(value)) return { tasks: [] as Task[], invalidCount: 0 };
  const tasks = value.flatMap((task, index) => {
    const normalized = normalizeTask(task, index);
    return normalized ? [normalized] : [];
  });
  return { tasks, invalidCount: value.length - tasks.length };
}

function normalizeLists(value: unknown) {
  if (!Array.isArray(value)) return { lists: [] as TaskList[], invalidCount: 0 };
  const lists = value.flatMap((list) => {
    const normalized = normalizeList(list);
    return normalized ? [normalized] : [];
  });
  return { lists, invalidCount: value.length - lists.length };
}

function saveRawPlanner(state: PlannerState) {
  const payload: StoredPlanner = { version: 3, ...state };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function migratePlannerV2(): { state: PlannerState; warning: string | null } | null {
  const raw = window.localStorage.getItem(LEGACY_PLANNER_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<LegacyPlannerV2>;
    if (parsed.version !== 2 || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.lists)) return null;
    const { tasks, invalidCount: invalidTasks } = normalizeTasks(parsed.tasks);
    const { lists, invalidCount: invalidLists } = normalizeLists(parsed.lists);
    const state = { tasks, lists };
    saveRawPlanner(state);
    const issues = invalidTasks + invalidLists;
    return {
      state,
      warning: issues > 0
        ? `Planner обновлён до версии 3. Пропущено повреждённых записей: ${issues}.`
        : "Planner обновлён: добавлены избранное и ручной порядок задач.",
    };
  } catch {
    return null;
  }
}

function migrateLegacy(): { state: PlannerState; warning: string | null } | null {
  const raw = window.localStorage.getItem(LEGACY_TASKS_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<LegacyStoredPlanner>;
    if (parsed.version !== 1 || !Array.isArray(parsed.tasks)) return null;
    const { tasks, invalidCount } = normalizeTasks(parsed.tasks);
    const state = { tasks, lists: createInitialLists() };
    saveRawPlanner(state);
    return {
      state,
      warning: invalidCount > 0
        ? `Данные Planner обновлены. Пропущено повреждённых задач: ${invalidCount}.`
        : "Данные Planner автоматически обновлены до нового формата.",
    };
  } catch {
    return null;
  }
}

export function loadPlanner(): { state: PlannerState; error: string | null } {
  const fallback = () => createInitialPlannerState();

  if (typeof window === "undefined") {
    return { state: fallback(), error: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const migratedV2 = migratePlannerV2();
      if (migratedV2) return { state: migratedV2.state, error: migratedV2.warning };
      const migrated = migrateLegacy();
      if (migrated) return { state: migrated.state, error: migrated.warning };
      return { state: fallback(), error: null };
    }

    const parsed = JSON.parse(raw) as Partial<StoredPlanner>;
    if (parsed.version !== 3 || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.lists)) {
      return { state: fallback(), error: "Формат локальных данных Planner повреждён. Загружены безопасные демонстрационные данные." };
    }

    const { tasks, invalidCount: invalidTasks } = normalizeTasks(parsed.tasks);
    const { lists, invalidCount: invalidLists } = normalizeLists(parsed.lists);
    const issues = invalidTasks + invalidLists;

    return {
      state: { tasks, lists },
      error: issues > 0 ? `Пропущено повреждённых записей Planner: ${issues}. Остальные данные загружены.` : null,
    };
  } catch {
    return { state: fallback(), error: "Не удалось прочитать локальное хранилище Planner. Загружены безопасные демонстрационные данные." };
  }
}

export function savePlanner(state: PlannerState): string | null {
  if (typeof window === "undefined") return null;

  try {
    saveRawPlanner(state);
    return null;
  } catch {
    return "Не удалось сохранить изменения Planner в браузере.";
  }
}
