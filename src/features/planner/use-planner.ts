"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDaysKey,
  createTaskId,
  initialTasks,
  localDateKey,
  PlannerView,
  Task,
} from "./model";
import { loadTasks, saveTasks } from "./storage";

type CreateTaskOptions = {
  view?: PlannerView;
  listId?: string | null;
};

export function usePlanner() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [view, setView] = useState<PlannerView>("today");
  const [selectedId, setSelectedId] = useState<string | null>(initialTasks[0]?.id ?? null);
  const [hydrated, setHydrated] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  useEffect(() => {
    const result = loadTasks();
    setTasks(result.tasks);
    setSelectedId(result.tasks[0]?.id ?? null);
    setPersistenceError(result.error);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setPersistenceError(saveTasks(tasks));
  }, [hydrated, tasks]);

  const selected = useMemo(
    () => tasks.find((task) => task.id === selectedId) ?? null,
    [selectedId, tasks],
  );

  const filteredTasks = useMemo(() => {
    const today = localDateKey();
    const tomorrow = addDaysKey(1);
    const nextWeek = addDaysKey(6);

    return tasks.filter((task) => {
      if (view === "all") return true;
      if (view === "inbox") return task.inbox || task.dueDate === null;
      if (view === "today") return task.dueDate === today;
      if (view === "tomorrow") return task.dueDate === tomorrow;
      return task.dueDate !== null && task.dueDate >= today && task.dueDate <= nextWeek;
    });
  }, [tasks, view]);

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

    setTasks((current) => [task, ...current]);
    setSelectedId(task.id);
    return task;
  }

  function updateTask(id: string, patch: Partial<Task>) {
    setTasks((current) => current.map((task) => task.id === id
      ? { ...task, ...patch, id: task.id, updatedAt: new Date().toISOString() }
      : task));
  }

  function toggleTask(id: string) {
    setTasks((current) => current.map((task) => {
      if (task.id !== id) return task;
      const done = !task.done;
      return {
        ...task,
        done,
        completedAt: done ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      };
    }));
  }

  function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
    setSelectedId((current) => current === id ? null : current);
  }

  function toggleSubtask(taskId: string, subtaskId: string) {
    setTasks((current) => current.map((task) => task.id === taskId
      ? {
          ...task,
          subtasks: task.subtasks.map((subtask) => subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask),
          updatedAt: new Date().toISOString(),
        }
      : task));
  }

  function addSubtask(taskId: string, title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    setTasks((current) => current.map((task) => task.id === taskId
      ? {
          ...task,
          subtasks: [...task.subtasks, { id: createTaskId(), title: trimmed, done: false }],
          updatedAt: new Date().toISOString(),
        }
      : task));
  }

  function addAttachments(taskId: string, names: string[]) {
    if (names.length === 0) return;
    setTasks((current) => current.map((task) => task.id === taskId
      ? {
          ...task,
          attachments: [
            ...task.attachments,
            ...names.map((name) => ({ id: createTaskId(), name })),
          ],
          updatedAt: new Date().toISOString(),
        }
      : task));
  }

  return {
    addAttachments,
    addSubtask,
    addTask,
    deleteTask,
    filteredTasks,
    hydrated,
    persistenceError,
    selected,
    selectedId,
    setSelectedId,
    setView,
    summary,
    tasks,
    toggleSubtask,
    toggleTask,
    updateTask,
    view,
  };
}
