"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarRange, Check, ChevronRight, Flame, Plus, Repeat2, Sparkles, Target, TrendingUp } from "lucide-react";
import {
  createHabitTrackingState,
  HABIT_STORAGE_KEY,
  habitConsistency,
  habitCurrentStreak,
  habitIsComplete,
  HabitTrackingState,
  normalizeHabitTrackingState,
  recentDateKeys,
  toggleHabitPeriod,
} from "../habit-model";
import { localDateKey, Task, TaskList, TaskRecurrence } from "../model";
import styles from "./habit-tracker.module.css";

type HabitFilter = "all" | "pending" | "completed";

type HabitTrackerProps = {
  tasks: Task[];
  lists: TaskList[];
  query: string;
  now: Date;
  onCreate: (title: string, recurrence: TaskRecurrence, listId: string | null) => Task | null;
  onOpen: (id: string) => void;
};

const frequencyLabels: Record<TaskRecurrence, string> = {
  none: "Без повтора",
  daily: "Каждый день",
  weekly: "Раз в неделю",
  monthly: "Раз в месяц",
};

const shortWeekdays = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

export function HabitTracker({ tasks, lists, query, now, onCreate, onOpen }: HabitTrackerProps) {
  const [tracking, setTracking] = useState<HabitTrackingState>(() => createHabitTrackingState());
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<HabitFilter>("all");
  const [newTitle, setNewTitle] = useState("");
  const [newRecurrence, setNewRecurrence] = useState<TaskRecurrence>("daily");
  const [newListId, setNewListId] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(HABIT_STORAGE_KEY);
        setTracking(normalizeHabitTrackingState(raw ? JSON.parse(raw) : null));
      } catch {
        setTracking(createHabitTrackingState());
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(HABIT_STORAGE_KEY, JSON.stringify(tracking)); } catch { /* Tracking remains available for this tab. */ }
  }, [hydrated, tracking]);

  const todayKey = localDateKey(now);
  const weekKeys = useMemo(() => recentDateKeys(now), [now]);
  const habits = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
    return tasks
      .filter((task) => task.habit)
      .filter((task) => !normalizedQuery || [task.title, task.description, ...task.tags].join(" ").toLocaleLowerCase("ru-RU").includes(normalizedQuery))
      .sort((left, right) => left.order - right.order);
  }, [query, tasks]);

  const visibleHabits = habits.filter((habit) => {
    const complete = habitIsComplete(tracking.checkins[habit.id] ?? [], todayKey, habit.recurrence);
    return filter === "all" || (filter === "completed" ? complete : !complete);
  });
  const completedToday = habits.filter((habit) => habitIsComplete(tracking.checkins[habit.id] ?? [], todayKey, habit.recurrence)).length;
  const bestStreak = habits.reduce((best, habit) => Math.max(best, habitCurrentStreak(tracking.checkins[habit.id] ?? [], todayKey, habit.recurrence)), 0);
  const averageConsistency = habits.length === 0 ? 0 : Math.round(habits.reduce((total, habit) => total + habitConsistency(tracking.checkins[habit.id] ?? [], todayKey, habit.recurrence), 0) / habits.length);
  const dayTotals = weekKeys.map((date) => habits.filter((habit) => (tracking.checkins[habit.id] ?? []).includes(date)).length);
  const maxDayTotal = Math.max(1, ...dayTotals);
  const remaining = Math.max(0, habits.length - completedToday);

  function submitHabit(event: FormEvent) {
    event.preventDefault();
    const created = onCreate(newTitle, newRecurrence, newListId || null);
    if (!created) return;
    setNewTitle("");
  }

  function toggleHabit(habit: Task) {
    setTracking((current) => toggleHabitPeriod(current, habit.id, todayKey, habit.recurrence));
  }

  return (
    <section className={styles.habitPage}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}><Repeat2 size={14} /> СИСТЕМА ПРИВЫЧЕК</span>
          <h2>Маленькие действия. Видимый ритм.</h2>
          <p>Отмечайте выполнение без лишнего давления. CUBIK покажет регулярность и серии по фактическим данным.</p>
        </div>
        <div className={styles.heroStats}>
          <span><strong>{completedToday}/{habits.length}</strong> сегодня</span>
          <span><strong>{bestStreak}</strong> лучшая серия</span>
          <span><strong>{averageConsistency}%</strong> регулярность</span>
        </div>
      </header>

      <form className={styles.quickAdd} onSubmit={submitHabit}>
        <div className={styles.quickTitle}><Plus size={18} /><input aria-label="Новая привычка" placeholder="Добавить новую привычку" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} /></div>
        <select aria-label="Частота новой привычки" value={newRecurrence} onChange={(event) => setNewRecurrence(event.target.value as TaskRecurrence)}>
          <option value="daily">Каждый день</option>
          <option value="weekly">Раз в неделю</option>
          <option value="monthly">Раз в месяц</option>
        </select>
        <select aria-label="Список новой привычки" value={newListId} onChange={(event) => setNewListId(event.target.value)}>
          <option value="">Без списка</option>
          {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
        </select>
        <button disabled={!newTitle.trim()} type="submit">Добавить</button>
      </form>

      <div className={styles.layout}>
        <main className={styles.habitList}>
          <header className={styles.listHeader}>
            <div><h3>Мои привычки</h3><span>{habits.length} активных</span></div>
            <div className={styles.filters}>
              <button aria-pressed={filter === "all"} onClick={() => setFilter("all")} type="button">Все</button>
              <button aria-pressed={filter === "pending"} onClick={() => setFilter("pending")} type="button">Осталось</button>
              <button aria-pressed={filter === "completed"} onClick={() => setFilter("completed")} type="button">Готово</button>
            </div>
          </header>

          <div className={styles.cards}>
            {visibleHabits.length === 0 && <div className={styles.empty}><Repeat2 size={24} /><strong>{habits.length ? "В этой группе пока пусто" : "Добавьте первую привычку"}</strong><p>Начните с одного небольшого действия, которое реально повторять.</p></div>}
            {visibleHabits.map((habit) => {
              const dates = tracking.checkins[habit.id] ?? [];
              const completed = habitIsComplete(dates, todayKey, habit.recurrence);
              const streak = habitCurrentStreak(dates, todayKey, habit.recurrence);
              const consistency = habitConsistency(dates, todayKey, habit.recurrence);
              const list = lists.find((item) => item.id === habit.listId);
              return (
                <article className={`${styles.habitCard} ${completed ? styles.completed : ""}`} key={habit.id}>
                  <button className={styles.checkButton} aria-label={`${completed ? "Отменить выполнение" : "Отметить выполненной"}: ${habit.title}`} aria-pressed={completed} onClick={() => toggleHabit(habit)} type="button">{completed ? <Check size={18} /> : <span />}</button>
                  <div className={styles.habitInfo}>
                    <button className={styles.habitTitle} onClick={() => onOpen(habit.id)} type="button"><strong>{habit.title}</strong><small>{frequencyLabels[habit.recurrence]}{list ? ` · ${list.name}` : ""}</small></button>
                    <div className={styles.weekStrip} aria-label={`Последние семь дней: ${habit.title}`}>
                      {weekKeys.map((date) => {
                        const day = new Date(`${date}T12:00:00`);
                        const checked = dates.includes(date);
                        return <span className={checked ? styles.dayDone : date === todayKey ? styles.today : ""} key={date} title={date}><i>{shortWeekdays[day.getDay()]}</i><b>{day.getDate()}</b></span>;
                      })}
                    </div>
                  </div>
                  <div className={styles.habitMeta}>
                    <span><Flame size={14} /> <strong>{streak}</strong> серия</span>
                    <span><TrendingUp size={14} /> <strong>{consistency}%</strong></span>
                    <button aria-label={`Открыть привычку ${habit.title}`} onClick={() => onOpen(habit.id)} type="button"><ChevronRight size={17} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        </main>

        <aside className={styles.sideColumn}>
          <section className={styles.rhythmCard}>
            <header><div><span>РИТМ НЕДЕЛИ</span><h3>Последние 7 дней</h3></div><CalendarRange size={18} /></header>
            <div className={styles.bars}>
              {weekKeys.map((date, index) => {
                const day = new Date(`${date}T12:00:00`);
                const height = dayTotals[index] === 0 ? 8 : Math.max(18, Math.round(dayTotals[index] / maxDayTotal * 100));
                return <div key={date}><span><i style={{ height: `${height}%` }} /></span><small>{shortWeekdays[day.getDay()]}</small></div>;
              })}
            </div>
            <p><strong>{dayTotals.reduce((total, count) => total + count, 0)}</strong> отметок за неделю</p>
          </section>

          <section className={styles.insightCard}>
            <span className={styles.eyebrow}><Sparkles size={14} /> НАБЛЮДЕНИЕ</span>
            <h3>{habits.length === 0 ? "Создайте первый устойчивый ритм" : remaining === 0 ? "План привычек на период выполнен" : `Осталось ${remaining} ${remaining === 1 ? "действие" : "действия"}`}</h3>
            <p>{habits.length === 0 ? "Выберите действие на 5–15 минут и повторяйте его ежедневно." : remaining === 0 ? "Можно остановиться: последовательность важнее перегрузки." : "Начните с самой короткой привычки — так легче сохранить движение."}</p>
            <div><Target size={17} /><span><strong>{completedToday}</strong> из {habits.length} выполнено</span></div>
          </section>
        </aside>
      </div>
    </section>
  );
}
