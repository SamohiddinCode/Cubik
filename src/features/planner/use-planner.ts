"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDaysKey,
  createTaskId,
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<PlannerView>("today");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = loadTasks();
      setTasks(result.tasks);
      setSelectedId(result.tasks[0]?.id ?? null);
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

  function commitTasks(nextTasks: Task[]) {
    setTasks(nextTasks);
    setSaveError(saveTasks(nextTasks));
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

  return {
    addAttachments,
    addSubtask,
    addTask,
    deleteTask,
    filteredTasks,
    hydrated,
    persistenceError: saveError ?? loadWarning,
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
