"use client";

import {
  BarChart3, Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown,
  ChevronLeft, ChevronRight, Clock3, Focus, GraduationCap, Grid2X2, Heart,
  Inbox, Layers3, ListTodo, Menu, MoreHorizontal, Paperclip, Plus, Repeat2,
  Search, Send, Settings, SlidersHorizontal, Sparkles, Star, Target,
  TrendingUp, UserRound, UsersRound, WalletCards, X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { CubikMark } from "@/components/cubik-mark";
import styles from "./today.module.css";

type Task = {
  id: number;
  title: string;
  time?: string;
  endTime?: string;
  project?: string;
  priority?: "P1" | "P2" | "P3";
  habit?: boolean;
  done: boolean;
};

const initialTasks: Task[] = [
  { id: 1, title: "Подготовить презентацию", time: "10:00", endTime: "11:30", project: "Запуск MVP", priority: "P1", done: false },
  { id: 2, title: "Проверить прототип планнера", time: "13:00", endTime: "14:00", priority: "P2", done: false },
  { id: 3, title: "30 минут английского", habit: true, done: false },
];

const domains = [
  { label: "Planner / Time", Icon: CalendarDays, active: true },
  { label: "Money / Wealth", Icon: WalletCards },
  { label: "Goals / Direction", Icon: Target },
  { label: "Growth / Development", Icon: TrendingUp },
  { label: "Health / Energy", Icon: Heart },
  { label: "People / Connection", Icon: UsersRound },
];

const plannerNav = [
  { label: "Сегодня", Icon: CalendarDays, active: true },
  { label: "Все задачи", Icon: ListTodo },
  { label: "Входящие", Icon: Inbox, count: 2 },
  { label: "Календарь", Icon: CalendarDays },
  { label: "Матрица Эйзенхауэра", Icon: Grid2X2 },
  { label: "Фокус", Icon: Focus },
  { label: "Привычки", Icon: Repeat2 },
  { label: "Статистика", Icon: BarChart3 },
];

const lists = [
  { label: "Работа", Icon: BriefcaseBusiness, color: "#3c70ff" },
  { label: "Личное", Icon: UserRound, color: "#8c65e8" },
  { label: "Учёба", Icon: GraduationCap, color: "#48b58a" },
];

export default function TodayPage() {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [newTask, setNewTask] = useState("");
  const [plannerOpen, setPlannerOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const selected = useMemo(() => tasks.find((task) => task.id === selectedId) ?? null, [tasks, selectedId]);

  function addTask(event: FormEvent) {
    event.preventDefault();
    const title = newTask.trim();
    if (!title) return;
    const task: Task = { id: Date.now(), title, priority: "P3", done: false };
    setTasks((current) => [task, ...current]);
    setSelectedId(task.id);
    setNewTask("");
  }

  function toggleTask(id: number) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  }

  return (
    <main className={`${styles.shell} ${plannerOpen ? "" : styles.navCollapsed}`}>
      <aside className={styles.domainRail} aria-label="Грани CUBIK">
        <div className={styles.railLogo}><CubikMark size={34} /></div>
        <nav className={styles.domainNav}>
          {domains.map(({ label, Icon, active }) => (
            <button aria-label={label} className={active ? styles.domainActive : ""} key={label} title={label}>
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
          {plannerNav.map(({ label, Icon, active, count }) => (
            <button className={active ? styles.contextActive : ""} key={label}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{count && <em>{count}</em>}
            </button>
          ))}
        </nav>
        <div className={styles.navDivider} />
        <div className={styles.listHeading}><span>СПИСКИ</span><button aria-label="Добавить список"><Plus size={17} /></button></div>
        <nav className={styles.contextNav}>
          {lists.map(({ label, Icon, color }) => (
            <button key={label}><Icon size={18} /><span>{label}</span><i style={{ background: color }} /></button>
          ))}
        </nav>
        <button className={styles.newList}><Plus size={17} /> Новый список</button>
      </aside>

      <button className={styles.navHandle} aria-label="Открыть меню" onClick={() => setPlannerOpen(true)}><ChevronRight size={18} /></button>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.pageTitle}>
            <button className={styles.mobileMenu} aria-label="Меню" onClick={() => setMobileNavOpen((value) => !value)}><Menu size={21} /></button>
            <div><h1>Сегодня</h1><p>Пятница, 4 сентября</p></div>
          </div>
          <div className={styles.topActions}>
            <button className={styles.searchButton}><Search size={18} /><span>Поиск или команда</span><kbd>⌘ K</kbd></button>
            <button className={styles.iconButton} aria-label="Уведомления"><Bell size={20} /><i /></button>
            <div className={styles.accountWrap}>
              <button className={styles.accountButton} aria-label="Аккаунт" onClick={() => setAccountOpen((value) => !value)}><span>ST</span><ChevronDown size={16} /></button>
              {accountOpen && <div className={styles.accountMenu}><strong>Самохиддин</strong><small>Личный аккаунт</small><button>Настройки аккаунта</button><button>Тема интерфейса</button><button>Выйти</button></div>}
            </div>
          </div>
        </header>

        <div className={styles.workspaceBody}>
          <section className={styles.mainColumn}>
            <div className={styles.greeting}><span className={styles.sun}>☀</span><div><h2>Доброе утро, Самохиддин</h2><p>Начнём с главного и сохраним спокойный темп.</p></div></div>

            <div className={styles.aiStrip}>
              <Sparkles size={19} /><strong>CUBIK AI</strong><span>Ваш день сбалансирован</span>
              <button>Улучшить план <ChevronRight size={16} /></button>
            </div>

            <div className={styles.summaryGrid}>
              <article className={styles.progressCard}><div className={styles.progressRing}><span>65%<small>дня</small></span></div></article>
              <article><Clock3 size={20} /><strong>5 ч 20 мин</strong><span>запланировано</span></article>
              <article><Target size={20} /><strong>3</strong><span>главные задачи</span></article>
              <article><UsersRound size={20} /><strong>2</strong><span>встречи</span></article>
            </div>

            <section className={styles.tasksPanel}>
              <header><h3>Главное сегодня</h3><button aria-label="Настроить"><SlidersHorizontal size={18} /></button></header>
              <form className={styles.quickAdd} onSubmit={addTask}>
                <Plus size={19} /><input aria-label="Новая задача" placeholder="Добавить задачу" value={newTask} onChange={(event) => setNewTask(event.target.value)} /><kbd>N</kbd>
              </form>
              <div className={styles.taskList}>
                {tasks.map((task) => (
                  <article className={`${styles.taskRow} ${task.id === selectedId ? styles.taskSelected : ""}`} key={task.id} onClick={() => setSelectedId(task.id)}>
                    <button aria-label={task.done ? "Вернуть задачу" : "Завершить задачу"} className={`${styles.checkbox} ${task.done ? styles.checked : ""}`} onClick={(event) => { event.stopPropagation(); toggleTask(task.id); }}>{task.done && <Check size={14} />}</button>
                    <div className={styles.taskContent}>
                      <strong className={task.done ? styles.done : ""}>{task.title}</strong>
                      <div className={styles.taskMeta}>
                        {task.time && <span><CalendarDays size={14} />{task.time}{task.endTime ? `–${task.endTime}` : ""}</span>}
                        {task.priority && <b className={styles[task.priority]}>{task.priority}</b>}
                        {task.project && <span className={styles.projectChip}><i />{task.project}</span>}
                        {task.habit && <span className={styles.habitChip}><Repeat2 size={13} />Привычка</span>}
                      </div>
                    </div>
                    <button className={styles.starButton} aria-label="В избранное"><Star size={17} /></button>
                  </article>
                ))}
              </div>
              <button className={styles.laterButton}><ChevronDown size={17} /><span>Позже</span><em>5</em></button>
            </section>
          </section>

          <aside className={styles.schedule}>
            <header><h3>Расписание</h3><button aria-label="Календарь"><CalendarDays size={18} /></button></header>
            <div className={styles.timeline}>
              {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map((time) => <div className={styles.hour} key={time}><span>{time}</span><i /></div>)}
              <div className={`${styles.event} ${styles.meetingEvent}`}><strong>Командная встреча</strong><span>09:30–10:30</span></div>
              <div className={`${styles.event} ${styles.presentationEvent}`}><strong>Презентация</strong><span>10:00–11:30</span></div>
              <div className={`${styles.event} ${styles.focusEvent}`}><strong>Глубокая работа</strong><span>13:00–15:00</span></div>
              <div className={styles.nowLine}><span>11:15</span><i /></div>
            </div>
            <footer><span>Свободно</span><strong>2 ч 40 мин</strong></footer>
          </aside>
        </div>
      </section>

      {selected && <aside className={styles.inspector}>
        <header><div><button className={`${styles.checkbox} ${selected.done ? styles.checked : ""}`} onClick={() => toggleTask(selected.id)}>{selected.done && <Check size={14} />}</button><h2>{selected.title}</h2></div><button className={styles.iconButton} onClick={() => setSelectedId(null)}><X size={20} /></button></header>
        <div className={styles.inspectorBody}>
          <div className={styles.inspectorTags}><span><i />{selected.project || "Входящие"}</span>{selected.priority && <b className={styles[selected.priority]}>{selected.priority}</b>}</div>
          <section className={styles.goalCard}><small>Цель</small><div><Target size={18} /><strong>Запуск MVP</strong><span>42%</span></div><progress max="100" value="42" /></section>
          <section className={styles.subtasks}>
            <header><strong>Подзадачи</strong><span>2/4</span><button><Plus size={17} /></button></header>
            {["Собрать данные", "Структура слайдов", "Дизайн и примеры", "Репетиция выступления"].map((label, index) => <label key={label}><input defaultChecked={index < 2} type="checkbox" /><span>{label}</span></label>)}
            <button className={styles.addSubtask}><Plus size={16} /> Добавить подзадачу</button>
          </section>
          <section className={styles.aiPanel}><header><Sparkles size={18} /><strong>CUBIK AI</strong><ChevronDown size={16} /></header><p>Подскажу, как сделать презентацию сильнее и быстрее завершить задачу.</p><button>Показать рекомендации <ChevronRight size={15} /></button></section>
          <form className={styles.aiInput}><input aria-label="Вопрос по задаче" placeholder="Спросить по задаче…" /><button aria-label="Отправить"><Send size={17} /></button></form>
          <div className={styles.inspectorTools}><button><CalendarDays size={18} /></button><button><Layers3 size={18} /></button><button><Paperclip size={18} /></button><button><MoreHorizontal size={18} /></button></div>
        </div>
      </aside>}
    </main>
  );
}
