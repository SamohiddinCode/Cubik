"use client";

import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
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
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { CubikMark } from "@/components/cubik-mark";
import styles from "@/app/app/today/today.module.css";
import controls from "./planner-controls.module.css";
import { localDateKey, PlannerView, Task, TaskSort } from "./model";
import { usePlanner } from "./use-planner";
import { TaskList } from "./components/task-list";
import { TaskInspector } from "./components/task-inspector";
import { ListManager } from "./components/list-manager";

const domains = [
  { label: "Planner / Time", Icon: CalendarDays, active: true },
  { label: "Money / Wealth", Icon: WalletCards },
  { label: "Goals / Direction", Icon: Target },
  { label: "Growth / Development", Icon: TrendingUp },
  { label: "Health / Energy", Icon: Heart },
  { label: "People / Connection", Icon: UsersRound },
];

const disabledPlannerNav = [
  { label: "Календарь", Icon: CalendarDays },
  { label: "Матрица Эйзенхауэра", Icon: Grid2X2 },
  { label: "Фокус", Icon: Focus },
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
  time: "По времени",
  priority: "По приоритету",
  created: "Сначала новые",
};

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
  const [plannerOpen, setPlannerOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [listManagerOpen, setListManagerOpen] = useState(false);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [clock, setClock] = useState<Date | null>(null);
  const newTaskRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeList = planner.lists.find((list) => list.id === activeListId) ?? null;
  const visibleTasks = activeListId
    ? planner.filteredTasks.filter((task) => task.listId === activeListId)
    : planner.filteredTasks;

  const pageTitle = activeList?.name ?? viewLabels[planner.view];
  const plannerNav: { label: string; Icon: typeof CalendarDays; view: PlannerView; count?: number }[] = [
    { label: "Сегодня", Icon: CalendarDays, view: "today" },
    { label: "Завтра", Icon: CalendarDays, view: "tomorrow" },
    { label: "Следующие 7 дней", Icon: CalendarDays, view: "next7" },
    { label: "Все задачи", Icon: ListTodo, view: "all" },
    { label: "Входящие", Icon: Inbox, view: "inbox", count: planner.summary.inbox },
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
    planner.setView(view);
    setActiveListId(null);
    setMobileNavOpen(false);
  }

  function selectList(listId: string) {
    planner.setView("all");
    setActiveListId(listId);
    setMobileNavOpen(false);
  }

  function addTask(event: FormEvent) {
    event.preventDefault();
    const task = planner.addTask(newTask, { view: planner.view, listId: activeListId });
    if (!task) return;
    setNewTask("");
  }

  return (
    <main className={`${styles.shell} ${plannerOpen ? "" : styles.navCollapsed}`}>
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
        <nav className={styles.contextNav}>
          {plannerNav.map(({ label, Icon, view, count }) => (
            <button className={!activeListId && planner.view === view ? styles.contextActive : ""} key={label} onClick={() => selectView(view)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{typeof count === "number" && count > 0 && <em>{count}</em>}
            </button>
          ))}
          {disabledPlannerNav.map(({ label, Icon }) => (
            <button disabled key={label} title={`${label} — следующий этап Planner`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></button>
          ))}
        </nav>
        <div className={styles.navDivider} />
        <div className={styles.listHeading}>
          <span>СПИСКИ</span>
          <button aria-label="Управлять списками" onClick={() => setListManagerOpen(true)} title="Управлять списками"><Plus size={17} /></button>
        </div>
        <nav className={styles.contextNav}>
          {planner.lists.map((list) => {
            const Icon = listIcons[list.id as keyof typeof listIcons] ?? ListTodo;
            return (
              <button className={activeListId === list.id ? styles.contextActive : ""} key={list.id} onClick={() => selectList(list.id)}>
                <Icon size={18} /><span>{list.name}</span><i style={{ background: list.color }} />
              </button>
            );
          })}
        </nav>
        <button className={styles.newList} onClick={() => setListManagerOpen(true)}><Plus size={17} /> Управлять списками</button>
      </aside>

      <button className={styles.navHandle} aria-label="Открыть меню" onClick={() => setPlannerOpen(true)}><ChevronRight size={18} /></button>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.pageTitle}>
            <button className={styles.mobileMenu} aria-label="Меню" onClick={() => setMobileNavOpen((value) => !value)}><Menu size={21} /></button>
            <div><h1>{pageTitle}</h1><p>{clock ? formatDayLabel(clock) : "Сегодня"}</p></div>
          </div>
          <div className={styles.topActions}>
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

        <div className={styles.workspaceBody}>
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
                  <SlidersHorizontal size={16} />
                  <select className={controls.sortSelect} aria-label="Сортировка задач" value={planner.sort} onChange={(event) => planner.setSort(event.target.value as TaskSort)}>
                    {(Object.keys(sortLabels) as TaskSort[]).map((value) => <option key={value} value={value}>{sortLabels[value]}</option>)}
                  </select>
                </div>
              </header>
              {planner.persistenceError && <div role="status" style={{ margin: "0 16px 10px", padding: "9px 10px", borderRadius: 9, background: "#fff3e5", color: "#9a6117", fontSize: 11 }}>{planner.persistenceError}</div>}
              <form className={styles.quickAdd} onSubmit={addTask}>
                <Plus size={19} /><input ref={newTaskRef} aria-label="Новая задача" placeholder={`Добавить задачу в «${pageTitle}»`} value={newTask} onChange={(event) => setNewTask(event.target.value)} /><kbd>N</kbd>
              </form>
              <TaskList tasks={visibleTasks} lists={planner.lists} selectedId={planner.selectedId} onSelect={planner.setSelectedId} onToggle={planner.toggleTask} />
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
        </div>
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
          onAddAttachments={planner.addAttachments}
        />
      )}

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
