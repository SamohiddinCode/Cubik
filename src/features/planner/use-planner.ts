"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDaysKey,
  createEntityId,
  createTaskId,
  listColorPalette,
  localDateKey,
  PlannerView,
  Task,
  TaskList,
  TaskSort,
  TaskGroup,
} from "./model";
import { loadPlanner, savePlanner } from "./storage";

type CreateTaskOptions = {
  view?: PlannerView;
  listId?: string | null;
};

const priorityOrder = { P1: 1, P2: 2, P3: 3 } as const;

export function usePlanner() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<TaskList[]>([]);
  const [view, setView] = useState<PlannerView>("today");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<TaskSort>("time");
  const [group, setGroup] = useState<TaskGroup>("none");
  const [hydrated, setHydrated] = useState(false);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = loadPlanner();
      setTasks(result.state.tasks);
      setLists(result.state.lists);
      setSelectedId(result.state.tasks[0]?.id ?? null);
      setLoadWarning(result.error);
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const selected = useMemo(
    () => tasks.find((task) => task.id === selectedId) ?? null,
    [selectedId, tasks],
  );

  const filteredTasks = useMemo(() => {
    const today = localDateKey();
    const tomorrow = addDaysKey(1);
    const nextWeek = addDaysKey(6);
    const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");

    const visible = tasks.filter((task) => {
      const matchesView = view === "all"
        || (view === "inbox" && (task.inbox || task.dueDate === null))
        || (view === "today" && task.dueDate === today)
        || (view === "tomorrow" && task.dueDate === tomorrow)
        || (view === "next7" && task.dueDate !== null && task.dueDate >= today && task.dueDate <= nextWeek);

      if (!matchesView) return false;
      if (!normalizedQuery) return true;

      const haystack = [task.title, task.description, ...task.tags]
        .join(" ")
        .toLocaleLowerCase("ru-RU");
      return haystack.includes(normalizedQuery);
    });

    return [...visible].sort((a, b) => {
      if (sort === "priority") {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
          || (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99");
      }
      if (sort === "created") {
        return b.createdAt.localeCompare(a.createdAt);
      }
      return (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99")
        || priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [query, sort, tasks, view]);

  const summary = useMemo(() => {
    const today = localDateKey();
    const todayTasks = tasks.filter((task) => task.dueDate === today);
    const completed = todayTasks.filter((task) => task.done).length;
    const totalMinutes = todayTasks.reduce((total, task) => total + (task.durationMinutes ?? 0), 0);
    const progress = todayTasks.length === 0 ? 0 : Math.round((completed / todayTasks.length) * 100);
    const important = todayTasks.filter((task) => !task.done && (task.priority === "P1" || task.priority === "P2")).length;
    const inbox = tasks.filter((task) => task.inbox || task.dueDate === null).length;

    return { completed, important, inbox, progress, todayTotal: todayTasks.length, totalMinutes };
  }, [tasks]);

  const allTags = useMemo(() => {
    return [...new Set(tasks.flatMap((task) => task.tags.map((tag) => tag.trim()).filter(Boolean)))]
      .sort((a, b) => a.localeCompare(b, "ru"));
  }, [tasks]);

  function commitState(nextTasks: Task[], nextLists: TaskList[]) {
    setTasks(nextTasks);
    setLists(nextLists);
    setSaveError(savePlanner({ tasks: nextTasks, lists: nextLists }));
  }

  function commitTasks(nextTasks: Task[]) {
    commitState(nextTasks, lists);
  }

  function addTask(title: string, options: CreateTaskOptions = {}) {
    const trimmed = title.trim();
    if (!trimmed) return null;

    const activeView = options.view ?? view;
    const now = new Date().toISOString();
    const dueDate = activeView === "tomorrow"
      ? addDaysKey(1)
      : activeView === "inbox"
        ? null
        : localDateKey();

    const task: Task = {
      id: createTaskId(),
      title: trimmed,
      description: "",
      dueDate,
      startTime: null,
      endTime: null,
      durationMinutes: null,
      priority: "P3",
      listId: options.listId ?? null,
      tags: [],
      goalId: null,
      recurrence: "none",
      subtasks: [],
      attachments: [],
      habit: false,
      inbox: activeView === "inbox",
      done: false,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };

    commitTasks([task, ...tasks]);
    setSelectedId(task.id);
    return task;
  }

  function updateTask(id: string, patch: Partial<Task>) {
    const nextTasks = tasks.map((task) => task.id === id
      ? { ...task, ...patch, id: task.id, updatedAt: new Date().toISOString() }
      : task);
    commitTasks(nextTasks);
  }

  function toggleTask(id: string) {
    const nextTasks = tasks.map((task) => {
      if (task.id !== id) return task;
      const done = !task.done;
      return {
        ...task,
        done,
        completedAt: done ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      };
    });
    commitTasks(nextTasks);
  }

  function deleteTask(id: string) {
    commitTasks(tasks.filter((task) => task.id !== id));
    setSelectedId((current) => current === id ? null : current);
  }

  function toggleSubtask(taskId: string, subtaskId: string) {
    const nextTasks = tasks.map((task) => task.id === taskId
      ? {
          ...task,
          subtasks: task.subtasks.map((subtask) => subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask),
          updatedAt: new Date().toISOString(),
        }
      : task);
    commitTasks(nextTasks);
  }

  function addSubtask(taskId: string, title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    const nextTasks = tasks.map((task) => task.id === taskId
      ? {
          ...task,
          subtasks: [...task.subtasks, { id: createTaskId(), title: trimmed, done: false }],
          updatedAt: new Date().toISOString(),
        }
      : task);
    commitTasks(nextTasks);
  }

  function addAttachments(taskId: string, names: string[]) {
    if (names.length === 0) return;
    const nextTasks = tasks.map((task) => task.id === taskId
      ? {
          ...task,
          attachments: [
            ...task.attachments,
            ...names.map((name) => ({ id: createTaskId(), name })),
          ],
          updatedAt: new Date().toISOString(),
        }
      : task);
    commitTasks(nextTasks);
  }

  function addList(name: string, color?: string) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const list: TaskList = {
      id: createEntityId("list"),
      name: trimmed,
      color: color && listColorPalette.includes(color) ? color : listColorPalette[lists.length % listColorPalette.length],
      createdAt: new Date().toISOString(),
    };
    commitState(tasks, [...lists, list]);
    return list;
  }

  function updateList(id: string, patch: Pick<Partial<TaskList>, "name" | "color">) {
    const nextLists = lists.map((list) => {
      if (list.id !== id) return list;
      const name = typeof patch.name === "string" ? patch.name.trim() : list.name;
      const color = patch.color && /^#[0-9a-f]{6}$/i.test(patch.color) ? patch.color : list.color;
      return { ...list, name: name || list.name, color };
    });
    commitState(tasks, nextLists);
  }

  function deleteList(id: string) {
    const nextLists = lists.filter((list) => list.id !== id);
    const nextTasks = tasks.map((task) => task.listId === id
      ? { ...task, listId: null, updatedAt: new Date().toISOString() }
      : task);
    commitState(nextTasks, nextLists);
  }

  return {
    addAttachments,
    addList,
    addSubtask,
    addTask,
    allTags,
    deleteList,
    deleteTask,
    filteredTasks,
    group,
    hydrated,
    lists,
    persistenceError: saveError ?? loadWarning,
    query,
    selected,
    selectedId,
    setQuery,
    setGroup,
    setSelectedId,
    setSort,
    setView,
    sort,
    summary,
    tasks,
    toggleSubtask,
    toggleTask,
    updateList,
    updateTask,
    view,
  };
}
