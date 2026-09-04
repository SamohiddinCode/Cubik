export type TaskPriority = "P1" | "P2" | "P3";
export type TaskRecurrence = "none" | "daily" | "weekly" | "monthly";
export type PlannerView = "today" | "tomorrow" | "next7" | "inbox" | "all";

export type Subtask = {
  id: string;
  title: string;
  done: boolean;
};

export type TaskAttachment = {
  id: string;
  name: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  priority: TaskPriority;
  listId: string | null;
  tags: string[];
  goalId: string | null;
  recurrence: TaskRecurrence;
  subtasks: Subtask[];
  attachments: TaskAttachment[];
  habit: boolean;
  inbox: boolean;
  done: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type TaskList = {
  id: string;
  name: string;
  color: string;
};

export const taskLists: TaskList[] = [
  { id: "work", name: "Работа", color: "#3c70ff" },
  { id: "personal", name: "Личное", color: "#8c65e8" },
  { id: "study", name: "Учёба", color: "#48b58a" },
];

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysKey(days: number, base = new Date()) {
  const date = new Date(base);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function createTaskId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const now = new Date().toISOString();
const today = localDateKey();

export const initialTasks: Task[] = [
  {
    id: "seed-presentation",
    title: "Подготовить презентацию",
    description: "Собрать сильную структуру презентации и подготовить примеры для демонстрации.",
    dueDate: today,
    startTime: "10:00",
    endTime: "11:30",
    durationMinutes: 90,
    priority: "P1",
    listId: "work",
    tags: ["MVP"],
    goalId: "launch-mvp",
    recurrence: "none",
    subtasks: [
      { id: "s1", title: "Собрать данные", done: true },
      { id: "s2", title: "Структура слайдов", done: true },
      { id: "s3", title: "Дизайн и примеры", done: false },
      { id: "s4", title: "Репетиция выступления", done: false },
    ],
    attachments: [],
    habit: false,
    inbox: false,
    done: false,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  },
  {
    id: "seed-prototype",
    title: "Проверить прототип планнера",
    description: "Пройти ключевые сценарии Today и отметить UX-проблемы.",
    dueDate: today,
    startTime: "13:00",
    endTime: "14:00",
    durationMinutes: 60,
    priority: "P2",
    listId: "work",
    tags: ["Planner"],
    goalId: "launch-mvp",
    recurrence: "none",
    subtasks: [],
    attachments: [],
    habit: false,
    inbox: false,
    done: false,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  },
  {
    id: "seed-english",
    title: "30 минут английского",
    description: "Короткая ежедневная практика.",
    dueDate: today,
    startTime: null,
    endTime: null,
    durationMinutes: 30,
    priority: "P3",
    listId: "study",
    tags: ["English"],
    goalId: null,
    recurrence: "daily",
    subtasks: [],
    attachments: [],
    habit: true,
    inbox: false,
    done: false,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  },
];
