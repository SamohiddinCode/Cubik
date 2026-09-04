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
} from "lucide-react";
import { FormEvent, useState } from "react";
import { CubikMark } from "@/components/cubik-mark";
import styles from "@/app/app/today/today.module.css";
import { PlannerView, taskLists } from "./model";
import { usePlanner } from "./use-planner";
import { TaskList } from "./components/task-list";
import { TaskInspector } from "./components/task-inspector";

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

function formatDayLabel(date = new Date()) {
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

export function TodayPlannerPage() {
  const planner = usePlanner();
  const [newTask, setNewTask] = useState("");
  const [plannerOpen, setPlannerOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeListId, setActiveListId] = useState<string | null>(null);

  const activeList = taskLists.find((list) => list.id === activeListId) ?? null;
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
          <button aria-label="Настройки" title="Настройки"><Settings size={21} /></button>
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
            <button disabled key={label} title={`${label} — следующий этап Planner`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className={styles.navDivider} />
        <div className={styles.listHeading}><span>СПИСКИ</span><button aria-label="Добавить список" disabled title="Редактор списков будет добавлен после CRUD задач"><Plus size={17} /></button></div>
        <nav className={styles.contextNav}>
          {taskLists.map((list) => {
            const Icon = listIcons[list.id as keyof typeof listIcons] ?? ListTodo;
            return (
              <button className={activeListId === list.id ? styles.contextActive : ""} key={list.id} onClick={() => selectList(list.id)}>
                <Icon size={18} /><span>{list.name}</span><i style={{ background: list.color }} />
              </button>
            );
          })}
        </nav>
        <button className={styles.newList} disabled title="Редактор списков — следующий шаг"><Plus size={17} /> Новый список</button>
      </aside>

      <button className={styles.navHandle} aria-label="Открыть меню" onClick={() => setPlannerOpen(true)}><ChevronRight size={18} /></button>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.pageTitle}>
            <button className={styles.mobileMenu} aria-label="Меню" onClick={() => setMobileNavOpen((value) => !value)}><Menu size={21} /></button>
            <div><h1>{pageTitle}</h1><p>{formatDayLabel()}</p></div>
          </div>
          <div className={styles.topActions}>
            <button className={styles.searchButton} disabled title="Глобальный поиск будет подключён после Planner CRUD"><Search size={18} /><span>Поиск или команда</span><kbd>⌘ K</kbd></button>
            <button className={styles.iconButton} aria-label="Уведомления" disabled title="Уведомления — следующий этап"><Bell size={20} /></button>
            <div className={styles.accountWrap}>
              <button className={styles.accountButton} aria-label="Аккаунт" onClick={() => setAccountOpen((value) => !value)}><span>ST</span><ChevronDown size={16} /></button>
              {accountOpen && <div className={styles.accountMenu}><strong>Самохиддин</strong><small>Локальный прототип</small><button disabled>Настройки аккаунта</button><button disabled>Тема интерфейса</button><button disabled>Выйти</button></div>}
            </div>
          </div>
        </header>

        <div className={styles.workspaceBody}>
          <section className={styles.mainColumn}>
            <div className={styles.greeting}><span className={styles.sun}>☀</span><div><h2>{greetingForHour(new Date().getHours())}, Самохиддин</h2><p>Начнём с главного и сохраним спокойный темп.</p></div></div>

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
              <header><h3>{pageTitle}</h3><button aria-label="Настроить" disabled title="Сортировка и группировка — следующий шаг"><SlidersHorizontal size={18} /></button></header>
              {planner.persistenceError && (
                <div role="status" style={{ margin: "0 16px 10px", padding: "9px 10px", borderRadius: 9, background: "#fff3e5", color: "#9a6117", fontSize: 11 }}>
                  {planner.persistenceError}
                </div>
              )}
              <form className={styles.quickAdd} onSubmit={addTask}>
                <Plus size={19} /><input aria-label="Новая задача" placeholder={`Добавить задачу в «${pageTitle}»`} value={newTask} onChange={(event) => setNewTask(event.target.value)} /><kbd>N</kbd>
              </form>
              <TaskList tasks={visibleTasks} selectedId={planner.selectedId} onSelect={planner.setSelectedId} onToggle={planner.toggleTask} />
              <button className={styles.laterButton} onClick={() => selectView("all")}><ChevronDown size={17} /><span>Все задачи</span><em>{planner.tasks.length}</em></button>
            </section>
          </section>

          <aside className={styles.schedule}>
            <header><h3>Расписание</h3><button aria-label="Календарь" disabled><CalendarDays size={18} /></button></header>
            <div className={styles.timeline}>
              {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map((time) => <div className={styles.hour} key={time}><span>{time}</span><i /></div>)}
              <div className={`${styles.event} ${styles.meetingEvent}`}><strong>Командная встреча</strong><span>09:30–10:30</span></div>
              <div className={`${styles.event} ${styles.presentationEvent}`}><strong>Презентация</strong><span>10:00–11:30</span></div>
              <div className={`${styles.event} ${styles.focusEvent}`}><strong>Глубокая работа</strong><span>13:00–15:00</span></div>
              <div className={styles.nowLine}><span>{new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date())}</span><i /></div>
            </div>
            <footer><span>Запланировано</span><strong>{formatDuration(planner.summary.totalMinutes)}</strong></footer>
          </aside>
        </div>
      </section>

      {planner.selected && (
        <TaskInspector
          task={planner.selected}
          onClose={() => planner.setSelectedId(null)}
          onToggle={planner.toggleTask}
          onUpdate={planner.updateTask}
          onDelete={planner.deleteTask}
          onToggleSubtask={planner.toggleSubtask}
          onAddSubtask={planner.addSubtask}
          onAddAttachments={planner.addAttachments}
        />
      )}
    </main>
  );
}
