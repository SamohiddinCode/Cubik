export type TaskPriority = "P1" | "P2" | "P3" | "P4";
export type TaskRecurrence = "none" | "daily" | "weekly" | "monthly";
export type PlannerView = "today" | "tomorrow" | "next7" | "inbox" | "all";
export type TaskSort = "manual" | "time" | "priority" | "created";
export type TaskGroup = "none" | "list" | "priority" | "status";

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
  favorite: boolean;
  done: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type TaskList = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
};

export type PlannerState = {
  tasks: Task[];
  lists: TaskList[];
};

export const listColorPalette = [
  "#3c70ff",
  "#8c65e8",
  "#48b58a",
  "#ef8d32",
  "#df5c7a",
  "#3ca0b8",
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

export function createEntityId(prefix = "item") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createTaskId() {
  return createEntityId("task");
}

export function createInitialLists(date = new Date()): TaskList[] {
  const createdAt = date.toISOString();
  return [
    { id: "work", name: "Работа", color: "#3c70ff", createdAt },
    { id: "personal", name: "Личное", color: "#8c65e8", createdAt },
    { id: "study", name: "Учёба", color: "#48b58a", createdAt },
  ];
}

export function createInitialTasks(date = new Date()): Task[] {
  const now = date.toISOString();
  const today = localDateKey(date);

  return [
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
      favorite: true,
      done: false,
      order: 0,
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
      favorite: false,
      done: false,
      order: 1,
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
      favorite: false,
      done: false,
      order: 2,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    },
  ];
}

export function createInitialPlannerState(date = new Date()): PlannerState {
  return {
    tasks: createInitialTasks(date),
    lists: createInitialLists(date),
  };
}
