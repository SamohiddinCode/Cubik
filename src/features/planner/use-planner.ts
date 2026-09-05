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
  TaskPriority,
  TaskSort,
  TaskGroup,
} from "./model";
import { loadPlanner, savePlanner } from "./storage";

type CreateTaskOptions = {
  view?: PlannerView;
  listId?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority;
  tags?: string[];
  startTime?: string | null;
  durationMinutes?: number | null;
  endTime?: string | null;
};

type UndoState = {
  label: string;
  state: { tasks: Task[]; lists: TaskList[] };
};

const priorityOrder = { P1: 1, P2: 2, P3: 3, P4: 4 } as const;

export function usePlanner() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<TaskList[]>([]);
  const [view, setView] = useState<PlannerView>("today");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<TaskSort>("manual");
  const [group, setGroup] = useState<TaskGroup>("none");
  const [hydrated, setHydrated] = useState(false);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [past, setPast] = useState<UndoState[]>([]);
  const [future, setFuture] = useState<UndoState[]>([]);

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

  useEffect(() => {
    if (!undoState) return;
    const timer = window.setTimeout(() => setUndoState(null), 8_000);
    return () => window.clearTimeout(timer);
  }, [undoState]);

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
        || (view === "today" && (task.dueDate === today || (!task.done && task.dueDate !== null && task.dueDate < today)))
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
      if (sort === "manual") {
        return a.order - b.order;
      }
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

  function commitState(nextTasks: Task[], nextLists: TaskList[], label = "Изменение") {
    setPast((entries) => [...entries.slice(-49), { label, state: { tasks, lists } }]);
    setFuture([]);
    setUndoState({ label, state: { tasks, lists } });
    setTasks(nextTasks);
    setLists(nextLists);
    setSaveError(savePlanner({ tasks: nextTasks, lists: nextLists }));
  }

  function commitTasks(nextTasks: Task[], label?: string) {
    commitState(nextTasks, lists, label);
  }

  function addTask(title: string, options: CreateTaskOptions = {}) {
    const trimmed = title.trim();
    if (!trimmed) return null;

    const activeView = options.view ?? view;
    const now = new Date().toISOString();
    const defaultDueDate = activeView === "tomorrow"
      ? addDaysKey(1)
      : activeView === "inbox" || activeView === "all"
        ? null
        : localDateKey();
    const dueDate = options.dueDate === undefined ? defaultDueDate : options.dueDate;
    const nextOrder = tasks.length === 0 ? 0 : Math.min(...tasks.map((item) => item.order)) - 1;

    const task: Task = {
      id: createTaskId(),
      title: trimmed,
      description: "",
      dueDate,
      startTime: options.startTime ?? null,
      endTime: options.endTime ?? null,
      durationMinutes: options.durationMinutes ?? null,
      priority: options.priority ?? "P4",
      listId: options.listId ?? null,
      tags: options.tags ?? [],
      goalId: null,
      recurrence: "none",
      subtasks: [],
      attachments: [],
      habit: false,
      inbox: activeView === "inbox" && dueDate === null,
      favorite: false,
      done: false,
      order: nextOrder,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };

    commitTasks([task, ...tasks], "Задача создана");
    setSelectedId(task.id);
    return task;
  }

  function updateTask(id: string, patch: Partial<Task>) {
    const nextTasks = tasks.map((task) => task.id === id
      ? { ...task, ...patch, id: task.id, updatedAt: new Date().toISOString() }
      : task);
    commitTasks(nextTasks, "Задача изменена");
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
    commitTasks(nextTasks, "Статус задачи изменён");
  }

  function toggleFavorite(id: string) {
    const nextTasks = tasks.map((task) => task.id === id
      ? { ...task, favorite: !task.favorite, updatedAt: new Date().toISOString() }
      : task);
    commitTasks(nextTasks, "Избранное изменено");
  }

  function reorderTask(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const sourceIndex = tasks.findIndex((task) => task.id === sourceId);
    const targetIndex = tasks.findIndex((task) => task.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextTasks = [...tasks];
    const [moved] = nextTasks.splice(sourceIndex, 1);
    nextTasks.splice(targetIndex, 0, moved);
    commitTasks(nextTasks.map((task, index) => ({ ...task, order: index })), "Порядок задач изменён");
  }

  function deleteTask(id: string) {
    commitTasks(tasks.filter((task) => task.id !== id), "Задача удалена");
    setSelectedId((current) => current === id ? null : current);
  }

  function duplicateTask(id: string) {
    const source = tasks.find((task) => task.id === id);
    if (!source) return null;
    const now = new Date().toISOString();
    const copy: Task = {
      ...source,
      id: createTaskId(),
      title: `${source.title} — копия`,
      subtasks: source.subtasks.map((subtask) => ({ ...subtask, id: createTaskId(), done: false })),
      attachments: source.attachments.map((attachment) => ({ ...attachment, id: createTaskId() })),
      done: false,
      completedAt: null,
      favorite: false,
      order: source.order + 0.5,
      createdAt: now,
      updatedAt: now,
    };
    commitTasks([...tasks, copy], "Задача продублирована");
    setSelectedId(copy.id);
    return copy;
  }

  function toggleSubtask(taskId: string, subtaskId: string) {
    const nextTasks = tasks.map((task) => task.id === taskId
      ? {
          ...task,
          subtasks: task.subtasks.map((subtask) => subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask),
          updatedAt: new Date().toISOString(),
        }
      : task);
    commitTasks(nextTasks, "Подзадача изменена");
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
    commitTasks(nextTasks, "Подзадача добавлена");
  }

  function updateSubtask(taskId: string, subtaskId: string, title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    const nextTasks = tasks.map((task) => task.id === taskId
      ? {
          ...task,
          subtasks: task.subtasks.map((subtask) => subtask.id === subtaskId ? { ...subtask, title: trimmed } : subtask),
          updatedAt: new Date().toISOString(),
        }
      : task);
    commitTasks(nextTasks, "Подзадача переименована");
  }

  function deleteSubtask(taskId: string, subtaskId: string) {
    const nextTasks = tasks.map((task) => task.id === taskId
      ? { ...task, subtasks: task.subtasks.filter((subtask) => subtask.id !== subtaskId), updatedAt: new Date().toISOString() }
      : task);
    commitTasks(nextTasks, "Подзадача удалена");
  }

  function reorderSubtask(taskId: string, subtaskId: string, direction: -1 | 1) {
    const nextTasks = tasks.map((task) => {
      if (task.id !== taskId) return task;
      const currentIndex = task.subtasks.findIndex((subtask) => subtask.id === subtaskId);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= task.subtasks.length) return task;
      const subtasks = [...task.subtasks];
      const [moved] = subtasks.splice(currentIndex, 1);
      subtasks.splice(nextIndex, 0, moved);
      return { ...task, subtasks, updatedAt: new Date().toISOString() };
    });
    commitTasks(nextTasks, "Порядок подзадач изменён");
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
    commitTasks(nextTasks, "Вложения добавлены");
  }

  function deleteAttachment(taskId: string, attachmentId: string) {
    const nextTasks = tasks.map((task) => task.id === taskId
      ? { ...task, attachments: task.attachments.filter((attachment) => attachment.id !== attachmentId), updatedAt: new Date().toISOString() }
      : task);
    commitTasks(nextTasks, "Вложение удалено");
  }

  function bulkUpdateTasks(ids: string[], patch: Partial<Pick<Task, "done" | "priority" | "listId">>) {
    if (ids.length === 0) return;
    const selectedIds = new Set(ids);
    const now = new Date().toISOString();
    const nextTasks = tasks.map((task) => {
      if (!selectedIds.has(task.id)) return task;
      const done = patch.done ?? task.done;
      return {
        ...task,
        ...patch,
        done,
        completedAt: patch.done === undefined ? task.completedAt : done ? now : null,
        updatedAt: now,
      };
    });
    commitTasks(nextTasks, `Изменено задач: ${ids.length}`);
  }

  function bulkDeleteTasks(ids: string[]) {
    if (ids.length === 0) return;
    const selectedIds = new Set(ids);
    commitTasks(tasks.filter((task) => !selectedIds.has(task.id)), `Удалено задач: ${ids.length}`);
    setSelectedId((current) => current && selectedIds.has(current) ? null : current);
  }

  function undoLastChange() {
    const entry = past.at(-1);
    if (!entry) return;
    setFuture((entries) => [...entries, { label: entry.label, state: { tasks, lists } }]);
    setPast((entries) => entries.slice(0, -1));
    setTasks(entry.state.tasks);
    setLists(entry.state.lists);
    setSaveError(savePlanner(entry.state));
    setUndoState(null);
  }

  function redoLastChange() {
    const entry = future.at(-1);
    if (!entry) return;
    setPast((entries) => [...entries, { label: entry.label, state: { tasks, lists } }]);
    setFuture((entries) => entries.slice(0, -1));
    setTasks(entry.state.tasks);
    setLists(entry.state.lists);
    setSaveError(savePlanner(entry.state));
    setUndoState(null);
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
    commitState(tasks, [...lists, list], "Список создан");
    return list;
  }

  function updateList(id: string, patch: Pick<Partial<TaskList>, "name" | "color">) {
    const nextLists = lists.map((list) => {
      if (list.id !== id) return list;
      const name = typeof patch.name === "string" ? patch.name.trim() : list.name;
      const color = patch.color && /^#[0-9a-f]{6}$/i.test(patch.color) ? patch.color : list.color;
      return { ...list, name: name || list.name, color };
    });
    commitState(tasks, nextLists, "Список изменён");
  }

  function deleteList(id: string) {
    const nextLists = lists.filter((list) => list.id !== id);
    const nextTasks = tasks.map((task) => task.listId === id
      ? { ...task, listId: null, updatedAt: new Date().toISOString() }
      : task);
    commitState(nextTasks, nextLists, "Список удалён");
  }

  return {
    addAttachments,
    addList,
    addSubtask,
    addTask,
    allTags,
    bulkDeleteTasks,
    bulkUpdateTasks,
    deleteAttachment,
    deleteList,
    deleteTask,
    deleteSubtask,
    duplicateTask,
    filteredTasks,
    group,
    hydrated,
    lists,
    persistenceError: saveError ?? loadWarning,
    query,
    reorderTask,
    reorderSubtask,
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
    toggleFavorite,
    toggleTask,
    undoAction: undoState?.label ?? null,
    undoLastChange,
    redoLastChange,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undoLabel: past.at(-1)?.label,
    redoLabel: future.at(-1)?.label,
    updateList,
    updateTask,
    updateSubtask,
    view,
  };
}
