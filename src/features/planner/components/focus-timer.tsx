"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, CirclePause, CirclePlay, Clock3, Coffee, Focus, RotateCcw, Settings2, SkipForward, Target } from "lucide-react";
import {
  changeFocusMode,
  createFocusTimerState,
  durationForMode,
  FOCUS_STORAGE_KEY,
  FocusMode,
  FocusSettings,
  FocusTimerState,
  normalizeFocusTimerState,
  nextFocusMode,
  pauseFocusTimer,
  resetFocusTimer,
  startFocusTimer,
  tickFocusTimer,
} from "../focus-model";
import { localDateKey, Task, TaskList as PlannerList } from "../model";
import styles from "./focus-timer.module.css";

type FocusTimerProps = {
  tasks: Task[];
  lists: PlannerList[];
  query: string;
  now: Date;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
};

const modeLabels: Record<FocusMode, string> = {
  focus: "Фокус",
  shortBreak: "Короткий отдых",
  longBreak: "Длинный отдых",
};

function clockValue(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function updateSetting(state: FocusTimerState, patch: Partial<FocusSettings>) {
  const settings = { ...state.settings, ...patch };
  return {
    ...state,
    settings,
    remainingSeconds: state.isRunning ? state.remainingSeconds : durationForMode(state.mode, settings),
  };
}

export function FocusTimer({ tasks, lists, query, now, onOpen, onToggle }: FocusTimerProps) {
  const [timer, setTimer] = useState<FocusTimerState>(() => createFocusTimerState());
  const [hydrated, setHydrated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(FOCUS_STORAGE_KEY);
        setTimer(tickFocusTimer(normalizeFocusTimerState(raw ? JSON.parse(raw) : null), Date.now()));
      } catch {
        setTimer(createFocusTimerState());
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(initialTimer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(timer)); } catch { /* Timer remains available for the current tab. */ }
  }, [hydrated, timer]);

  useEffect(() => {
    if (!timer.isRunning) return;
    const interval = window.setInterval(() => setTimer((current) => tickFocusTimer(current, Date.now())), 500);
    return () => window.clearInterval(interval);
  }, [timer.isRunning]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']") || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code === "Space") {
        event.preventDefault();
        setTimer((current) => current.isRunning ? pauseFocusTimer(current, Date.now()) : startFocusTimer(current, Date.now()));
      }
      if (event.key.toLowerCase() === "r") setTimer((current) => resetFocusTimer(current));
    }
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  const incompleteTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
    return tasks.filter((task) => !task.done && (!normalizedQuery || [task.title, task.description, ...task.tags].join(" ").toLocaleLowerCase("ru-RU").includes(normalizedQuery)))
      .sort((left, right) => left.priority.localeCompare(right.priority) || left.order - right.order);
  }, [query, tasks]);
  const selectedTask = tasks.find((task) => task.id === timer.selectedTaskId) ?? null;
  const totalSeconds = durationForMode(timer.mode, timer.settings);
  const progress = totalSeconds === 0 ? 0 : Math.max(0, Math.min(100, ((totalSeconds - timer.remainingSeconds) / totalSeconds) * 100));
  const todayKey = localDateKey(now);
  const todaySessions = timer.sessions.filter((session) => localDateKey(new Date(session.completedAt)) === todayKey);
  const todayMinutes = todaySessions.reduce((total, session) => total + session.durationMinutes, 0);
  const taskMinutes = todaySessions.reduce<Record<string, number>>((totals, session) => {
    const key = session.taskId ?? "none";
    totals[key] = (totals[key] ?? 0) + session.durationMinutes;
    return totals;
  }, {});
  const progressStyle = { "--timer-progress": `${progress * 3.6}deg` } as CSSProperties;
  const cyclePosition = timer.completedFocuses % timer.settings.sessionsBeforeLongBreak;
  const hasElapsedTime = timer.remainingSeconds < totalSeconds;
  const startLabel = hasElapsedTime ? "Продолжить" : timer.mode === "focus" ? "Начать фокус" : "Начать отдых";

  function skipMode() {
    setTimer((current) => changeFocusMode(current, nextFocusMode(current.mode, current.completedFocuses, current.settings)));
  }

  return (
    <section className={styles.focusPage}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}><Focus size={14} /> ГЛУБОКАЯ РАБОТА</span>
          <h2>Один фокус. Один следующий шаг.</h2>
          <p>Выберите задачу и работайте короткими спокойными циклами. CUBIK сохранит фактическое время.</p>
        </div>
        <div className={styles.heroStats}>
          <span><strong>{todaySessions.length}</strong> сессий</span>
          <span><strong>{todayMinutes}</strong> минут</span>
          <span><strong>{Math.min(100, Math.round(todayMinutes / 120 * 100))}%</strong> цели дня</span>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.timerCard}>
          <div className={styles.modeTabs}>
            {(Object.keys(modeLabels) as FocusMode[]).map((mode) => (
              <button aria-pressed={timer.mode === mode} disabled={timer.isRunning} key={mode} onClick={() => setTimer((current) => changeFocusMode(current, mode))} type="button">{modeLabels[mode]}</button>
            ))}
          </div>

          <div className={styles.timerRing} style={progressStyle}>
            <div>
              {timer.mode === "focus" ? <Target size={22} /> : <Coffee size={22} />}
              <strong>{clockValue(timer.remainingSeconds)}</strong>
              <span>{timer.isRunning ? "Сохраняйте внимание" : modeLabels[timer.mode]}</span>
            </div>
          </div>

          <label className={styles.taskSelect}>
            <span>ЗАДАЧА ДЛЯ СЕССИИ</span>
            <select disabled={timer.isRunning} value={timer.selectedTaskId ?? ""} onChange={(event) => setTimer((current) => ({ ...current, selectedTaskId: event.target.value || null }))}>
              <option value="">Без привязки к задаче</option>
              {incompleteTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
          </label>

          <div className={styles.timerActions}>
            <button className={styles.secondaryButton} aria-label="Сбросить таймер" onClick={() => setTimer((current) => resetFocusTimer(current))} type="button"><RotateCcw size={18} /></button>
            <button className={styles.primaryButton} onClick={() => setTimer((current) => current.isRunning ? pauseFocusTimer(current, Date.now()) : startFocusTimer(current, Date.now()))} type="button">
              {timer.isRunning ? <><CirclePause size={20} /> Пауза</> : <><CirclePlay size={20} /> {startLabel}</>}
            </button>
            <button className={styles.secondaryButton} aria-label="Пропустить этап" onClick={skipMode} type="button"><SkipForward size={18} /></button>
          </div>

          <div className={styles.cycles} aria-label="Цикл Pomodoro">
            {Array.from({ length: timer.settings.sessionsBeforeLongBreak }, (_, index) => <i className={index < cyclePosition ? styles.cycleDone : index === cyclePosition ? styles.cycleCurrent : ""} key={index} />)}
            <span>{cyclePosition + 1} из {timer.settings.sessionsBeforeLongBreak} до длинного отдыха</span>
          </div>

          <button className={styles.settingsToggle} aria-expanded={settingsOpen} onClick={() => setSettingsOpen((value) => !value)} type="button"><Settings2 size={16} /> Настройки цикла <ChevronRight size={15} /></button>
          {settingsOpen && (
            <div className={styles.settingsPanel}>
              <label><span>Фокус, мин</span><input min="1" max="180" type="number" value={timer.settings.focusMinutes} onChange={(event) => setTimer((current) => updateSetting(current, { focusMinutes: Number(event.target.value) || 1 }))} /></label>
              <label><span>Короткий отдых</span><input min="1" max="60" type="number" value={timer.settings.shortBreakMinutes} onChange={(event) => setTimer((current) => updateSetting(current, { shortBreakMinutes: Number(event.target.value) || 1 }))} /></label>
              <label><span>Длинный отдых</span><input min="1" max="120" type="number" value={timer.settings.longBreakMinutes} onChange={(event) => setTimer((current) => updateSetting(current, { longBreakMinutes: Number(event.target.value) || 1 }))} /></label>
              <label><span>Циклов</span><input min="2" max="12" type="number" value={timer.settings.sessionsBeforeLongBreak} onChange={(event) => setTimer((current) => updateSetting(current, { sessionsBeforeLongBreak: Number(event.target.value) || 2 }))} /></label>
              <label className={styles.settingCheck}><input type="checkbox" checked={timer.settings.autoStartBreak} onChange={(event) => setTimer((current) => updateSetting(current, { autoStartBreak: event.target.checked }))} /><span>Автоматически начинать отдых</span></label>
              <label className={styles.settingCheck}><input type="checkbox" checked={timer.settings.autoStartFocus} onChange={(event) => setTimer((current) => updateSetting(current, { autoStartFocus: event.target.checked }))} /><span>Автоматически начинать фокус</span></label>
            </div>
          )}
          <small className={styles.shortcut}>Пробел — старт/пауза · R — сброс</small>
        </section>

        <aside className={styles.sideColumn}>
          <section className={styles.taskQueue}>
            <header><div><span>СЕГОДНЯ В ФОКУСЕ</span><h3>{selectedTask ? selectedTask.title : "Выберите задачу"}</h3></div><Clock3 size={18} /></header>
            <div className={styles.taskRows}>
              {incompleteTasks.length === 0 && <p>По текущему поиску активных задач нет.</p>}
              {incompleteTasks.slice(0, 6).map((task) => {
                const list = lists.find((item) => item.id === task.listId);
                const active = task.id === timer.selectedTaskId;
                return <article className={active ? styles.activeTask : ""} key={task.id}>
                  <button className={styles.taskPick} disabled={timer.isRunning} onClick={() => setTimer((current) => ({ ...current, selectedTaskId: task.id }))} type="button"><i>{task.priority}</i><span><strong>{task.title}</strong><small>{list?.name ?? "Без списка"}{task.startTime ? ` · ${task.startTime}` : ""}</small></span></button>
                  <button aria-label={`Открыть задачу ${task.title}`} onClick={() => onOpen(task.id)} type="button"><ChevronRight size={16} /></button>
                </article>;
              })}
            </div>
            {selectedTask && <button className={styles.completeTask} onClick={() => onToggle(selectedTask.id)} type="button"><Check size={15} /> Отметить выбранную задачу выполненной</button>}
          </section>

          <section className={styles.analyticsCard}>
            <header><span>РАСПРЕДЕЛЕНИЕ ВРЕМЕНИ</span><strong>{todayMinutes} мин</strong></header>
            {todaySessions.length === 0 ? <p>Завершите первую сессию — здесь появится фактическое время по задачам.</p> : (
              <div className={styles.breakdown}>
                {Object.entries(taskMinutes).sort(([, left], [, right]) => right - left).slice(0, 5).map(([taskId, minutes]) => {
                  const task = tasks.find((item) => item.id === taskId);
                  const width = todayMinutes ? Math.round(minutes / todayMinutes * 100) : 0;
                  return <div key={taskId}><span><strong>{task?.title ?? "Без задачи"}</strong><em>{minutes} мин</em></span><i><b style={{ width: `${width}%` }} /></i></div>;
                })}
              </div>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
