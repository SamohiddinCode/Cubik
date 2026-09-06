"use client";

import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  Focus,
  GraduationCap,
  Grid2X2,
  Heart,
  Inbox,
  ListTodo,
  Menu,
  Plus,
  Repeat2,
  Search,
  Settings,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  Tags,
  Trash2,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
  Undo2,
  Redo2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { CubikMark } from "@/components/cubik-mark";
import styles from "@/app/app/today/today.module.css";
import controls from "./planner-controls.module.css";
import { addDaysKey, createEntityId, localDateKey, PlannerView, Task, TaskGroup, TaskPriority, TaskSort } from "./model";
import { usePlanner } from "./use-planner";
import { TaskList } from "./components/task-list";
import { TaskInspector } from "./components/task-inspector";
import { ListManager } from "./components/list-manager";
import { TaskSummary } from "./components/task-summary";
import { PlannerCalendar } from "./components/planner-calendar";
import { EisenhowerMatrix } from "./components/eisenhower-matrix";
import { FocusTimer } from "./components/focus-timer";
import { schedulePatch } from "./calendar-model";

const domains = [
  { label: "Planner / Time", Icon: CalendarDays, active: true },
  { label: "Money / Wealth", Icon: WalletCards },
  { label: "Goals / Direction", Icon: Target },
  { label: "Growth / Development", Icon: TrendingUp },
  { label: "Health / Energy", Icon: Heart },
  { label: "People / Connection", Icon: UsersRound },
];

const disabledPlannerNav = [
  { label: "Привычки", Icon: Repeat2 },
  { label: "Статистика", Icon: BarChart3 },
];

const listIcons = {
  work: BriefcaseBusiness,
  personal: UserRound,
  study: GraduationCap,
};

const viewLabels: Record<PlannerView, string> = {
  today: "Сегодня",
  tomorrow: "Завтра",
  next7: "Следующие 7 дней",
  inbox: "Входящие",
  all: "Все задачи",
};

const sortLabels: Record<TaskSort, string> = {
  manual: "Ручной порядок",
  time: "По времени",
  priority: "По приоритету",
  created: "Сначала новые",
};

const groupLabels: Record<TaskGroup, string> = {
  none: "Без группировки",
  list: "По списку",
  priority: "По приоритету",
  status: "По статусу",
};

type TaskFilter = "favorite" | "important" | "overdue" | "undated" | "completed";

const filterLabels: Record<TaskFilter, string> = {
  favorite: "Избранные",
  important: "Важные",
  overdue: "Просроченные",
  undated: "Без даты",
  completed: "Завершённые",
};

type SavedSmartFilter = {
  id: string;
  name: string;
  view: PlannerView;
  filter: TaskFilter | null;
  tag: string | null;
  listId: string | null;
  query: string;
};

const SMART_FILTERS_KEY = "cubik.planner.smart-filters.v1";
const QUICK_FIELDS_KEY = "cubik.planner.quick-fields.v1";

function isSavedSmartFilter(value: unknown): value is SavedSmartFilter {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.name === "string"
    && ["today", "tomorrow", "next7", "inbox", "all"].includes(String(item.view))
    && (item.filter === null || Object.hasOwn(filterLabels, String(item.filter)))
    && (item.tag === null || typeof item.tag === "string")
    && (item.listId === null || typeof item.listId === "string")
    && typeof item.query === "string";
}

const scheduleStartMinutes = 9 * 60;
const scheduleEndMinutes = 19 * 60;
const pixelsPerHour = 55;

function formatDayLabel(date: Date) {
  const value = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} мин`;
  if (rest === 0) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}

function greetingForHour(hour: number) {
  if (hour < 6) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

function timeToMinutes(value: string | null) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function taskDurationMinutes(task: Task) {
  const start = timeToMinutes(task.startTime);
  const end = timeToMinutes(task.endTime);
  if (start !== null && end !== null && end > start) return end - start;
  return task.durationMinutes ?? 30;
}

function eventTone(priority: Task["priority"]) {
  if (priority === "P1") return styles.presentationEvent;
  if (priority === "P2") return styles.focusEvent;
  return styles.meetingEvent;
}

export function TodayPlannerPage() {
  const planner = usePlanner();
  const [newTask, setNewTask] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("P4");
  const [newTaskListId, setNewTaskListId] = useState("");
  const [newTaskTags, setNewTaskTags] = useState("");
  const [quickFieldsOpen, setQuickFieldsOpen] = useState(false);
  const [quickFields, setQuickFields] = useState({ date: true, priority: true, list: true, tags: true });
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [plannerOpen, setPlannerOpen] = useState(true);
  const [taskTreeOpen, setTaskTreeOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [listManagerOpen, setListManagerOpen] = useState(false);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TaskFilter | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedSmartFilter[]>([]);
  const [smartFilterName, setSmartFilterName] = useState("");
  const [smartFiltersLoaded, setSmartFiltersLoaded] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [clock, setClock] = useState<Date | null>(null);
  const newTaskRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleHistory(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']") || !(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "z" || key === "y") {
        event.preventDefault();
        if (key === "y" || event.shiftKey) planner.redoLastChange();
        else planner.undoLastChange();
      }
    }
    window.addEventListener("keydown", handleHistory);
    return () => window.removeEventListener("keydown", handleHistory);
  }, [planner]);

  const activeList = planner.lists.find((list) => list.id === activeListId) ?? null;
  const tasksInActiveList = activeListId
    ? planner.filteredTasks.filter((task) => task.listId === activeListId)
    : planner.filteredTasks;
  const visibleTasks = tasksInActiveList.filter((task) => {
    if (activeTag && !task.tags.includes(activeTag)) return false;
    if (activeFilter === "favorite") return task.favorite;
    if (activeFilter === "important") return !task.done && (task.priority === "P1" || task.priority === "P2");
    if (activeFilter === "overdue") return !task.done && task.dueDate !== null && task.dueDate < localDateKey();
    if (activeFilter === "undated") return task.dueDate === null;
    if (activeFilter === "completed") return task.done;
    return true;
  });

  const pageTitle = activeList?.name
    ?? (activeTag ? `#${activeTag}` : null)
    ?? (activeFilter ? filterLabels[activeFilter] : null)
    ?? viewLabels[planner.view];
  const todayKey = localDateKey();
  const tomorrowKey = addDaysKey(1);
  const nextWeekKey = addDaysKey(6);
  const viewCounts: Record<PlannerView, number> = {
    today: planner.tasks.filter((task) => !task.done && task.dueDate !== null && task.dueDate <= todayKey).length,
    tomorrow: planner.tasks.filter((task) => task.dueDate === tomorrowKey && !task.done).length,
    next7: planner.tasks.filter((task) => task.dueDate !== null && task.dueDate >= todayKey && task.dueDate <= nextWeekKey && !task.done).length,
    all: planner.tasks.filter((task) => !task.done).length,
    inbox: planner.summary.inbox,
  };
  const plannerNav: { label: string; Icon: typeof CalendarDays; view: PlannerView; count?: number }[] = [
    { label: "Сегодня", Icon: CalendarDays, view: "today", count: viewCounts.today },
    { label: "Завтра", Icon: CalendarDays, view: "tomorrow", count: viewCounts.tomorrow },
    { label: "Следующие 7 дней", Icon: CalendarDays, view: "next7", count: viewCounts.next7 },
    { label: "Все задачи", Icon: ListTodo, view: "all", count: viewCounts.all },
    { label: "Входящие", Icon: Inbox, view: "inbox", count: viewCounts.inbox },
  ];

  const today = clock ? localDateKey(clock) : null;
  const scheduledTasks = today
    ? planner.tasks.filter((task) => {
        const start = timeToMinutes(task.startTime);
        return task.dueDate === today && !task.done && start !== null && start >= scheduleStartMinutes && start < scheduleEndMinutes;
      })
    : [];

  const nowMinutes = clock ? clock.getHours() * 60 + clock.getMinutes() : null;
  const nowTop = nowMinutes === null ? 0 : ((nowMinutes - scheduleStartMinutes) / 60) * pixelsPerHour;
  const showNow = nowMinutes !== null && nowMinutes >= scheduleStartMinutes && nowMinutes <= scheduleEndMinutes;

  useEffect(() => {
    const syncClock = () => setClock(new Date());
    const initialTimer = window.setTimeout(syncClock, 0);
    const interval = window.setInterval(syncClock, 60_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(SMART_FILTERS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) setSavedFilters(parsed.filter(isSavedSmartFilter));
      } catch {
        setSavedFilters([]);
      }
      try {
        const fields = JSON.parse(window.localStorage.getItem(QUICK_FIELDS_KEY) || "null");
        if (fields && typeof fields === "object") setQuickFields({
          date: typeof fields.date === "boolean" ? fields.date : true,
          priority: typeof fields.priority === "boolean" ? fields.priority : true,
          list: typeof fields.list === "boolean" ? fields.list : true,
          tags: typeof fields.tags === "boolean" ? fields.tags : true,
        });
      } catch { /* Keep default fields if saved preferences are unavailable. */ }
      setSmartFiltersLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!smartFiltersLoaded) return;
    try {
      window.localStorage.setItem(SMART_FILTERS_KEY, JSON.stringify(savedFilters));
      window.localStorage.setItem(QUICK_FIELDS_KEY, JSON.stringify(quickFields));
    } catch { /* Preferences remain usable for this session if storage is unavailable. */ }
  }, [savedFilters, quickFields, smartFiltersLoaded]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches("input, textarea, select, [contenteditable='true']") ?? false;

      if (event.key === "Escape") {
        setMobileNavOpen(false);
        setAccountOpen(false);
        setListManagerOpen(false);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (!isTyping && !event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        newTaskRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  function selectView(view: PlannerView) {
    setCalendarOpen(false);
    setMatrixOpen(false);
    setFocusOpen(false);
    setSummaryOpen(false);
    planner.setView(view);
    setActiveListId(null);
    setActiveFilter(null);
    setActiveTag(null);
    setMobileNavOpen(false);
  }

  function selectList(listId: string) {
    setCalendarOpen(false);
    setMatrixOpen(false);
    setFocusOpen(false);
    setSummaryOpen(false);
    planner.setView("all");
    setActiveListId(listId);
    setActiveFilter(null);
    setActiveTag(null);
    setMobileNavOpen(false);
  }

  function selectFilter(filter: TaskFilter) {
    setCalendarOpen(false);
    setMatrixOpen(false);
    setFocusOpen(false);
    setSummaryOpen(false);
    planner.setView("all");
    setActiveListId(null);
    setActiveTag(null);
    setActiveFilter(filter);
    setMobileNavOpen(false);
  }

  function selectTag(tag: string) {
    setCalendarOpen(false);
    setMatrixOpen(false);
    setFocusOpen(false);
    setSummaryOpen(false);
    planner.setView("all");
    setActiveListId(null);
    setActiveFilter(null);
    setActiveTag(tag);
    setMobileNavOpen(false);
  }

  function saveSmartFilter(event: FormEvent) {
    event.preventDefault();
    const name = smartFilterName.trim();
    if (!name) return;
    setSavedFilters((current) => [...current, {
      id: createEntityId("filter"),
      name,
      view: planner.view,
      filter: activeFilter,
      tag: activeTag,
      listId: activeListId,
      query: planner.query,
    }]);
    setSmartFilterName("");
  }

  function applySmartFilter(filter: SavedSmartFilter) {
    setCalendarOpen(false);
    setMatrixOpen(false);
    setFocusOpen(false);
    setSummaryOpen(false);
    planner.setView(filter.view);
    planner.setQuery(filter.query);
    setActiveFilter(filter.filter);
    setActiveTag(filter.tag);
    setActiveListId(filter.listId);
    setMobileNavOpen(false);
  }

  function addTask(event: FormEvent) {
    event.preventDefault();
    const task = planner.addTask(newTask, {
      view: planner.view,
      listId: newTaskListId || activeListId,
      dueDate: newTaskDate || undefined,
      priority: newTaskPriority,
      tags: [...new Set(newTaskTags.split(",").map((tag) => tag.trim()).filter(Boolean))],
    });
    if (!task) return;
    setNewTask("");
    setNewTaskDate("");
    setNewTaskPriority("P4");
    setNewTaskListId("");
    setNewTaskTags("");
  }

  function toggleBulkTask(id: string) {
    setBulkSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function closeBulkMode() {
    setBulkMode(false);
    setBulkSelectedIds([]);
  }

  function startBulkMode() {
    planner.setSelectedId(null);
    setBulkSelectedIds([]);
    setBulkMode(true);
  }

  function deleteBulkTasks() {
    if (bulkSelectedIds.length === 0) return;
    if (!window.confirm(`Удалить выбранные задачи (${bulkSelectedIds.length})? Их можно восстановить через Undo.`)) return;
    planner.bulkDeleteTasks(bulkSelectedIds);
    closeBulkMode();
  }

  return (
    <main className={`${styles.shell} ${plannerOpen ? "" : styles.navCollapsed} ${planner.selected ? styles.inspectorOpen : ""}`}>
      <aside className={styles.domainRail} aria-label="Грани CUBIK">
        <div className={styles.railLogo}><CubikMark size={34} /></div>
        <nav className={styles.domainNav}>
          {domains.map(({ label, Icon, active }) => (
            <button aria-label={label} className={active ? styles.domainActive : ""} key={label} title={active ? label : `${label} — в следующих фазах`} disabled={!active}>
              <Icon size={21} strokeWidth={1.8} />
            </button>
          ))}
        </nav>
        <div className={styles.railBottom}>
          <button aria-label="Настройки" title="Настройки" disabled><Settings size={21} /></button>
          <button aria-label={plannerOpen ? "Свернуть меню" : "Развернуть меню"} onClick={() => setPlannerOpen((value) => !value)}>
            {plannerOpen ? <ChevronLeft size={21} /> : <ChevronRight size={21} />}
          </button>
        </div>
      </aside>

      <aside className={`${styles.plannerNav} ${mobileNavOpen ? styles.mobileNavOpen : ""}`}>
        <div className={styles.plannerHeading}>
          <span>ПЛАННЕР</span>
          <button aria-label="Свернуть меню" onClick={() => setPlannerOpen(false)}><ChevronLeft size={18} /></button>
        </div>
        <nav className={styles.plannerTools}>
          <button
            aria-expanded={taskTreeOpen}
            className={`${styles.toolButton} ${styles.toolActive}`}
            onClick={() => setTaskTreeOpen((value) => !value)}
            type="button"
          >
            <ListTodo size={19} strokeWidth={1.9} />
            <span>Задачи</span>
            {taskTreeOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          <div className={`${styles.taskTree} ${taskTreeOpen ? styles.taskTreeOpen : ""}`}>
            <div className={styles.taskTreeInner}>
              <div className={styles.treeHeading}>УМНЫЕ СПИСКИ</div>
              <div className={styles.contextNav}>
                {plannerNav.map(({ label, Icon, view, count }) => (
                    <button className={!activeListId && !activeFilter && !activeTag && planner.view === view ? styles.contextActive : ""} key={label} onClick={() => selectView(view)}>
                    <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{typeof count === "number" && count > 0 && <em>{count}</em>}
                  </button>
                ))}
                <button aria-pressed={summaryOpen} onClick={() => { setCalendarOpen(false); setMatrixOpen(false); setFocusOpen(false); setSummaryOpen(true); planner.setSelectedId(null); setMobileNavOpen(false); }}><FileText size={17} strokeWidth={1.8} /><span>Сводка</span></button>
              </div>

              <div className={styles.treeDivider} />
              <div className={styles.listHeading}>
                <span>СПИСКИ</span>
                <button aria-label="Управлять списками" onClick={() => setListManagerOpen(true)} title="Управлять списками"><Plus size={17} /></button>
              </div>
              <div className={styles.contextNav}>
                {planner.lists.map((list) => {
                  const Icon = listIcons[list.id as keyof typeof listIcons] ?? ListTodo;
                  return (
                    <button className={activeListId === list.id ? styles.contextActive : ""} key={list.id} onClick={() => selectList(list.id)}>
                      <Icon size={17} /><span>{list.name}</span><i style={{ background: list.color }} />
                    </button>
                  );
                })}
              </div>
              <button className={styles.newList} onClick={() => setListManagerOpen(true)}><Plus size={16} /> Управлять списками</button>

              <div className={styles.treeDivider} />
              <button aria-expanded={filtersOpen} className={styles.treeSection} onClick={() => setFiltersOpen((value) => !value)} type="button">
                <Filter size={16} /><span>Фильтры</span>{filtersOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {filtersOpen && (
                <div className={styles.nestedOptions}>
                  {(Object.keys(filterLabels) as TaskFilter[]).map((filter) => {
                    const count = planner.tasks.filter((task) => {
                      if (filter === "favorite") return task.favorite;
                      if (filter === "important") return !task.done && (task.priority === "P1" || task.priority === "P2");
                      if (filter === "overdue") return !task.done && task.dueDate !== null && task.dueDate < localDateKey();
                      if (filter === "undated") return task.dueDate === null;
                      return task.done;
                    }).length;
                    return <button className={activeFilter === filter ? styles.contextActive : ""} key={filter} onClick={() => selectFilter(filter)}><span>{filterLabels[filter]}</span><em>{count}</em></button>;
                  })}
                  {savedFilters.length > 0 && <span className={styles.filterSubtitle}>СОХРАНЁННЫЕ</span>}
                  {savedFilters.map((filter) => <div className={styles.savedFilterRow} key={filter.id}>
                    <button onClick={() => applySmartFilter(filter)} type="button"><span>{filter.name}</span></button>
                    <button aria-label={`Удалить фильтр ${filter.name}`} onClick={() => setSavedFilters((current) => current.filter((item) => item.id !== filter.id))} type="button"><X size={13} /></button>
                  </div>)}
                  <form className={styles.smartFilterForm} onSubmit={saveSmartFilter}>
                    <input aria-label="Название нового умного фильтра" placeholder="Сохранить текущий вид" value={smartFilterName} onChange={(event) => setSmartFilterName(event.target.value)} />
                    <button aria-label="Сохранить умный фильтр" disabled={!smartFilterName.trim()} type="submit"><Plus size={14} /></button>
                  </form>
                </div>
              )}
              <button aria-expanded={tagsOpen} className={styles.treeSection} onClick={() => setTagsOpen((value) => !value)} type="button">
                <Tags size={16} /><span>Метки</span>{tagsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {tagsOpen && (
                <div className={styles.nestedOptions}>
                  {planner.allTags.length === 0
                    ? <span className={styles.emptyTree}>Пока нет меток</span>
                    : planner.allTags.map((tag) => (
                      <button className={activeTag === tag ? styles.contextActive : ""} key={tag} onClick={() => selectTag(tag)}>
                        <span>#{tag}</span><em>{planner.tasks.filter((task) => task.tags.includes(tag)).length}</em>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <button className={`${styles.toolButton} ${calendarOpen ? styles.toolActive : ""}`} aria-pressed={calendarOpen} onClick={() => { setCalendarOpen(true); setMatrixOpen(false); setFocusOpen(false); setSummaryOpen(false); planner.setSelectedId(null); setMobileNavOpen(false); }}><CalendarDays size={18} /><span>Календарь</span></button>
          <button className={`${styles.toolButton} ${matrixOpen ? styles.toolActive : ""}`} aria-pressed={matrixOpen} onClick={() => { setCalendarOpen(false); setMatrixOpen(true); setFocusOpen(false); setSummaryOpen(false); planner.setSelectedId(null); setMobileNavOpen(false); }}><Grid2X2 size={18} /><span>Матрица Эйзенхауэра</span></button>
          <button className={`${styles.toolButton} ${focusOpen ? styles.toolActive : ""}`} aria-pressed={focusOpen} onClick={() => { setCalendarOpen(false); setMatrixOpen(false); setFocusOpen(true); setSummaryOpen(false); planner.setSelectedId(null); setMobileNavOpen(false); }}><Focus size={18} /><span>Фокус</span></button>
          {disabledPlannerNav.map(({ label, Icon }) => (
            <button className={styles.toolButton} disabled key={label} title={`${label} — следующий этап Planner`}>
              <Icon size={19} strokeWidth={1.8} /><span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <button className={styles.navHandle} aria-label="Открыть меню" onClick={() => setPlannerOpen(true)}><ChevronRight size={18} /></button>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.pageTitle}>
            <button className={styles.mobileMenu} aria-label="Меню" onClick={() => setMobileNavOpen((value) => !value)}><Menu size={21} /></button>
            <div><h1>{calendarOpen ? "Календарь" : matrixOpen ? "Матрица Эйзенхауэра" : focusOpen ? "Фокус" : summaryOpen ? "Сводка" : pageTitle}</h1><p>{clock ? formatDayLabel(clock) : "Сегодня"}</p></div>
          </div>
          <div className={styles.topActions}>
            <button className={styles.iconButton} aria-label="Отменить действие" title={planner.undoLabel ?? "Нет действий для отмены"} disabled={!planner.canUndo} onClick={planner.undoLastChange}><Undo2 size={18} /></button>
            <button className={styles.iconButton} aria-label="Повторить действие" title={planner.redoLabel ?? "Нет действий для повтора"} disabled={!planner.canRedo} onClick={planner.redoLastChange}><Redo2 size={18} /></button>
            <label className={controls.search}>
              <Search size={18} />
              <input ref={searchRef} aria-label="Поиск задач" placeholder="Поиск задач" value={planner.query} onChange={(event) => planner.setQuery(event.target.value)} />
              {planner.query ? <button className={controls.clearSearch} type="button" aria-label="Очистить поиск" onClick={() => planner.setQuery("")}><X size={15} /></button> : <kbd>⌘ K</kbd>}
            </label>
            <button className={styles.iconButton} aria-label="Уведомления" disabled title="Уведомления — следующий этап"><Bell size={20} /></button>
            <div className={styles.accountWrap}>
              <button className={styles.accountButton} aria-label="Аккаунт" onClick={() => setAccountOpen((value) => !value)}><span>ST</span><ChevronDown size={16} /></button>
              {accountOpen && <div className={styles.accountMenu}><strong>Самохиддин</strong><small>Локальный прототип</small><button disabled>Настройки аккаунта</button><button disabled>Тема интерфейса</button><button disabled>Выйти</button></div>}
            </div>
          </div>
        </header>

        {calendarOpen ? (clock && <PlannerCalendar tasks={planner.tasks} lists={planner.lists} now={clock} query={planner.query} onUpdateOccurrence={planner.updateOccurrence} onOpen={planner.setSelectedId} onUpdate={planner.updateTask} onCreate={(title, date, start, length, recurrence) => { const patch = schedulePatch(date, start, length); planner.addTask(title, { view: "all", dueDate: date, startTime: patch.startTime, endTime: patch.endTime, durationMinutes: patch.durationMinutes, recurrence }); }} />) : matrixOpen ? (clock && <EisenhowerMatrix tasks={planner.tasks} lists={planner.lists} query={planner.query} now={clock} selectedId={planner.selectedId} onCreate={(title, priority) => planner.addTask(title, { view: "all", priority })} onOpen={planner.setSelectedId} onToggle={planner.toggleTask} onUpdate={planner.updateTask} />) : focusOpen ? (clock && <FocusTimer tasks={planner.tasks} lists={planner.lists} query={planner.query} now={clock} onOpen={planner.setSelectedId} onToggle={planner.toggleTask} />) : summaryOpen ? (clock && <TaskSummary tasks={planner.tasks} lists={planner.lists} now={clock} onOpen={planner.setSelectedId} />) : <div className={styles.workspaceBody}>
          <section className={styles.mainColumn}>
            <div className={styles.greeting}>
              <span className={styles.sun}>☀</span>
              <div><h2>{clock ? greetingForHour(clock.getHours()) : "Добрый день"}, Самохиддин</h2><p>Начнём с главного и сохраним спокойный темп.</p></div>
            </div>

            <div className={styles.aiStrip}>
              <Sparkles size={19} /><strong>CUBIK AI</strong><span>Контекст дня готов для будущего AI gateway</span>
              <button disabled title="AI подключается после Auth + backend">Подключим на фазе 3 <ChevronRight size={16} /></button>
            </div>

            <div className={styles.summaryGrid}>
              <article className={styles.progressCard}>
                <div className={styles.progressRing} style={{ background: `conic-gradient(var(--blue) 0 ${planner.summary.progress}%, #e9eef6 ${planner.summary.progress}% 100%)` }}>
                  <span>{planner.summary.progress}%<small>задач</small></span>
                </div>
              </article>
              <article><Clock3 size={20} /><strong>{formatDuration(planner.summary.totalMinutes)}</strong><span>запланировано сегодня</span></article>
              <article><Target size={20} /><strong>{planner.summary.important}</strong><span>приоритетные задачи</span></article>
              <article><ListTodo size={20} /><strong>{planner.summary.todayTotal}</strong><span>задач на сегодня</span></article>
            </div>

            <section className={styles.tasksPanel}>
              <header>
                <div>
                  <h3>{pageTitle}</h3>
                  {planner.query && <span className={controls.searchStatus}>Найдено: {visibleTasks.length}</span>}
                </div>
                <div className={controls.panelActions}>
                  {!bulkMode && <><SlidersHorizontal size={16} />
                    <select className={controls.sortSelect} aria-label="Сортировка задач" value={planner.sort} onChange={(event) => planner.setSort(event.target.value as TaskSort)}>
                      {(Object.keys(sortLabels) as TaskSort[]).map((value) => <option key={value} value={value}>{sortLabels[value]}</option>)}
                    </select>
                    <select className={controls.sortSelect} aria-label="Группировка задач" value={planner.group} onChange={(event) => planner.setGroup(event.target.value as TaskGroup)}>
                      {(Object.keys(groupLabels) as TaskGroup[]).map((value) => <option key={value} value={value}>{groupLabels[value]}</option>)}
                    </select>
                  </>}
                  <button className={controls.selectionButton} onClick={() => bulkMode ? closeBulkMode() : startBulkMode()} type="button"><CheckSquare2 size={15} />{bulkMode ? "Готово" : "Выбрать"}</button>
                </div>
              </header>
              {planner.persistenceError && <div role="status" style={{ margin: "0 16px 10px", padding: "9px 10px", borderRadius: 9, background: "#fff3e5", color: "#9a6117", fontSize: 11 }}>{planner.persistenceError}</div>}
              {bulkMode && (
                <div className={styles.bulkBar}>
                  <label><input type="checkbox" checked={visibleTasks.length > 0 && visibleTasks.every((task) => bulkSelectedIds.includes(task.id))} onChange={(event) => setBulkSelectedIds(event.target.checked ? visibleTasks.map((task) => task.id) : [])} /><span>{bulkSelectedIds.length ? `Выбрано: ${bulkSelectedIds.length}` : "Выбрать все"}</span></label>
                  <select aria-label="Изменить статус выбранных задач" defaultValue="" disabled={!bulkSelectedIds.length} onChange={(event) => { if (!event.target.value) return; planner.bulkUpdateTasks(bulkSelectedIds, { done: event.target.value === "done" }); event.currentTarget.value = ""; }}><option value="">Статус</option><option value="done">Выполнить</option><option value="active">Вернуть в работу</option></select>
                  <select aria-label="Изменить приоритет выбранных задач" defaultValue="" disabled={!bulkSelectedIds.length} onChange={(event) => { if (!event.target.value) return; planner.bulkUpdateTasks(bulkSelectedIds, { priority: event.target.value as TaskPriority }); event.currentTarget.value = ""; }}><option value="">Приоритет</option><option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option><option value="P4">P4</option></select>
                  <select aria-label="Переместить выбранные задачи" defaultValue="" disabled={!bulkSelectedIds.length} onChange={(event) => { if (!event.target.value) return; planner.bulkUpdateTasks(bulkSelectedIds, { listId: event.target.value === "__none" ? null : event.target.value }); event.currentTarget.value = ""; }}><option value="">В список…</option><option value="__none">Без списка</option>{planner.lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}</select>
                  <button aria-label="Удалить выбранные задачи" className={styles.bulkDelete} disabled={!bulkSelectedIds.length} onClick={deleteBulkTasks} type="button"><Trash2 size={15} /></button>
                </div>
              )}
              <form className={styles.quickAdd} onSubmit={addTask}>
                <div className={styles.quickAddMain}>
                  <Plus size={19} />
                  <input ref={newTaskRef} aria-label="Новая задача" placeholder={`Добавить задачу в «${pageTitle}»`} value={newTask} onChange={(event) => setNewTask(event.target.value)} />
                  <button aria-expanded={quickFieldsOpen} aria-label="Настроить поля быстрого добавления" className={styles.quickSettingsButton} onClick={() => setQuickFieldsOpen((value) => !value)} type="button"><Settings2 size={16} /></button>
                  {quickFieldsOpen && <div className={styles.quickFieldMenu}>
                    <strong>Поля быстрого добавления</strong>
                    {(Object.keys(quickFields) as (keyof typeof quickFields)[]).map((field) => <label key={field}><input type="checkbox" checked={quickFields[field]} onChange={(event) => setQuickFields((current) => ({ ...current, [field]: event.target.checked }))} /><span>{{ date: "Дата", priority: "Приоритет", list: "Список", tags: "Метки" }[field]}</span></label>)}
                  </div>}
                  <kbd>N</kbd>
                </div>
                <div className={styles.quickAddOptions}>
                  {quickFields.date && <label><CalendarDays size={15} /><span className={styles.srOnly}>Дата</span><input aria-label="Дата новой задачи" type="date" value={newTaskDate} onChange={(event) => setNewTaskDate(event.target.value)} /></label>}
                  {quickFields.priority && <label><Star size={15} /><span className={styles.srOnly}>Приоритет</span><select aria-label="Приоритет новой задачи" value={newTaskPriority} onChange={(event) => setNewTaskPriority(event.target.value as TaskPriority)}><option value="P1">P1 · Критично</option><option value="P2">P2 · Важно</option><option value="P3">P3 · Низкий</option><option value="P4">Без приоритета</option></select></label>}
                  {quickFields.list && <label><ListTodo size={15} /><span className={styles.srOnly}>Список</span><select aria-label="Список новой задачи" value={newTaskListId} onChange={(event) => setNewTaskListId(event.target.value)}><option value="">{activeList ? activeList.name : "Без списка"}</option>{planner.lists.filter((list) => list.id !== activeListId).map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}</select></label>}
                  {quickFields.tags && <label><Tags size={15} /><span className={styles.srOnly}>Метки</span><input aria-label="Метки новой задачи" placeholder="Метки" value={newTaskTags} onChange={(event) => setNewTaskTags(event.target.value)} /></label>}
                  <button className={styles.quickAddSubmit} disabled={!newTask.trim()} type="submit">Добавить</button>
                </div>
              </form>
              <TaskList
                tasks={visibleTasks}
                lists={planner.lists}
                selectedId={planner.selectedId}
                group={planner.group}
                manualReorder={planner.sort === "manual"}
                onSelect={planner.setSelectedId}
                onToggle={planner.toggleTask}
                onToggleFavorite={planner.toggleFavorite}
                onReorder={planner.reorderTask}
                bulkMode={bulkMode}
                bulkSelectedIds={bulkSelectedIds}
                onBulkSelect={toggleBulkTask}
                onDuplicate={planner.duplicateTask}
                onSchedule={(id, dueDate, inbox) => planner.updateTask(id, { dueDate, inbox })}
                onDelete={planner.deleteTask}
              />
              <button className={styles.laterButton} onClick={() => selectView("all")}><ChevronDown size={17} /><span>Все задачи</span><em>{planner.tasks.length}</em></button>
            </section>
          </section>

          <aside className={styles.schedule}>
            <header><h3>Расписание сегодня</h3><button aria-label="Календарь" disabled title="Полный календарь — следующий этап"><CalendarDays size={18} /></button></header>
            <div className={styles.timeline}>
              {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map((time) => <div className={styles.hour} key={time}><span>{time}</span><i /></div>)}
              {scheduledTasks.map((task) => {
                const start = timeToMinutes(task.startTime) ?? scheduleStartMinutes;
                const top = ((start - scheduleStartMinutes) / 60) * pixelsPerHour;
                const height = Math.max(32, (taskDurationMinutes(task) / 60) * pixelsPerHour);
                return (
                  <button
                    aria-label={`Открыть задачу ${task.title}`}
                    className={`${styles.event} ${eventTone(task.priority)}`}
                    key={task.id}
                    onClick={() => planner.setSelectedId(task.id)}
                    style={{ top, height, borderTop: 0, borderRight: 0, borderBottom: 0, textAlign: "left" }}
                    type="button"
                  >
                    <strong>{task.title}</strong>
                    <span>{task.startTime}{task.endTime ? `–${task.endTime}` : ` · ${formatDuration(taskDurationMinutes(task))}`}</span>
                  </button>
                );
              })}
              {showNow && clock && <div className={styles.nowLine} style={{ top: nowTop }}><span>{new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", hour12: false }).format(clock)}</span><i /></div>}
            </div>
            <footer><span>Запланировано</span><strong>{formatDuration(planner.summary.totalMinutes)}</strong></footer>
          </aside>
        </div>}
      </section>

      {planner.selected && (
        <TaskInspector
          task={planner.selected}
          lists={planner.lists}
          tagSuggestions={planner.allTags}
          onClose={() => planner.setSelectedId(null)}
          onToggle={planner.toggleTask}
          onUpdate={planner.updateTask}
          onDelete={planner.deleteTask}
          onToggleSubtask={planner.toggleSubtask}
          onAddSubtask={planner.addSubtask}
          onUpdateSubtask={planner.updateSubtask}
          onDeleteSubtask={planner.deleteSubtask}
          onReorderSubtask={planner.reorderSubtask}
          onAddAttachments={planner.addAttachments}
          onDeleteAttachment={planner.deleteAttachment}
        />
      )}

      {planner.undoAction && <div className={styles.undoToast} role="status"><span>{planner.undoAction}</span><button onClick={planner.undoLastChange} type="button"><Undo2 size={15} />Отменить</button></div>}

      {listManagerOpen && (
        <ListManager
          lists={planner.lists}
          onClose={() => setListManagerOpen(false)}
          onAdd={planner.addList}
          onUpdate={planner.updateList}
          onDelete={(id) => {
            planner.deleteList(id);
            if (activeListId === id) setActiveListId(null);
          }}
        />
      )}
    </main>
  );
}
