"use client";

import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Task, TaskList, TaskRecurrence, OccurrenceOverride, localDateKey } from "../model";
import { CalendarEntry, expandCalendarTasks, isDateKey } from "../calendar-recurrence";
import { calendarDays, duration, eventLayout, minutes, schedulePatch, timeLabel } from "../calendar-model";
import styles from "./planner-calendar.module.css";

type Props = {
  tasks: Task[]; lists: TaskList[]; now: Date;
  query: string;
  onOpen: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onCreate: (title: string, date: string, start: number | null, length: number, recurrence: TaskRecurrence) => void;
  onUpdateOccurrence: (id: string, date: string, patch: OccurrenceOverride) => void;
};

export function PlannerCalendar({ tasks, lists, now, query, onOpen, onUpdate, onCreate, onUpdateOccurrence }: Props) {
  const [mode, setMode] = useState<"day" | "week" | "month">("week");
  const [anchor, setAnchor] = useState(() => localDateKey(now));
  const [listId, setListId] = useState("all");
  const [showDone, setShowDone] = useState(false);
  const [draft, setDraft] = useState<{ title: string; date: string; time: string; length: number; recurrence: TaskRecurrence; entry?: CalendarEntry } | null>(null);
  const [resizePreview, setResizePreview] = useState<{ id: string; length: number } | null>(null);
  const [notice, setNotice] = useState("");
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const resize = useRef<{ id: string; y: number; length: number } | null>(null);
  const anchorDate = new Date(`${anchor}T12:00:00`);
  const days = calendarDays(anchorDate, mode);
  const today = localDateKey(now);
  const entries = expandCalendarTasks(tasks, days[0].key, days[days.length - 1].key);
  const visible = entries.filter((task) => (showDone || !task.done) && (listId === "all" || (task.listId ?? "") === listId) && [task.title, task.description, ...task.tags].join(" ").toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru")));
  const backlog = visible.filter((task) => !task.dueDate);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      let saved: Record<string, unknown> = {};
      try { saved = JSON.parse(localStorage.getItem("cubik.calendar.preferences.v1") || "{}") || {}; } catch { /* Use defaults. */ }
      setMode(saved.mode === "day" || saved.mode === "week" || saved.mode === "month" ? saved.mode : window.innerWidth < 700 ? "day" : "week");
      if (typeof saved.listId === "string") setListId(saved.listId);
      setShowDone(saved.showDone === true);
      setPreferencesLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!preferencesLoaded) return;
    try { localStorage.setItem("cubik.calendar.preferences.v1", JSON.stringify({ mode, listId, showDone })); } catch { /* Current-session preferences remain available. */ }
  }, [mode, listId, showDone, preferencesLoaded]);
  const dialogOpen = Boolean(draft);
  useEffect(() => {
    if (dialogOpen) return () => { trigger.current?.focus(); };
  }, [dialogOpen]);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 7 * 60; }, [mode]);
  useEffect(() => {
    if (!draft) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopImmediatePropagation(); setDraft(null); }
      if (event.key === "Tab") {
        const dialog = document.querySelector('[aria-label="Новая задача в календаре"]');
        const focusable = dialog?.querySelectorAll<HTMLElement>('button, input, select, [tabindex="0"]');
        if (!focusable?.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", close, true);
    return () => window.removeEventListener("keydown", close, true);
  }, [draft]);
  function shift(direction: number) {
    const date = new Date(anchorDate);
    if (mode === "month") { date.setDate(1); date.setMonth(date.getMonth() + direction); }
    else date.setDate(date.getDate() + direction * (mode === "week" ? 7 : 1));
    setAnchor(localDateKey(date));
  }
  function create(date: string, start: number | null) { trigger.current = document.activeElement as HTMLElement; setDraft({ title: "", date, time: start === null ? "" : timeLabel(start), length: 60, recurrence: "none" }); }
  function open(task: CalendarEntry) {
    if (!task.seriesId) { onOpen(task.id); return; }
    trigger.current = document.activeElement as HTMLElement;
    setDraft({ title: task.title, date: task.dueDate!, time: task.startTime ?? "", length: duration(task), recurrence: task.recurrence, entry: task });
  }
  function update(task: CalendarEntry, patch: Partial<Task>) {
    if (task.seriesId && task.occurrenceDate) onUpdateOccurrence(task.seriesId, task.occurrenceDate, patch);
    else onUpdate(task.id, patch);
  }
  function move(event: DragEvent, date: string, start?: number | null) {
    event.preventDefault();
    const task = entries.find((item) => item.id === event.dataTransfer.getData("application/x-cubik-task"));
    if (!task) return;
    update(task, start === undefined ? { dueDate: date, inbox: false } : schedulePatch(date, start, duration(task)));
    setNotice(`«${task.title}» перенесена на ${date}${typeof start === "number" ? `, ${timeLabel(start)}` : ""}`);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const fields = new FormData(event.currentTarget);
    const title = String(fields.get("title") ?? "").trim();
    const date = String(fields.get("date") ?? "");
    const time = String(fields.get("time") ?? "");
    const length = Number(fields.get("length"));
    if (!title || !isDateKey(date) || (time && minutes(time) === null) || !Number.isFinite(length) || length < 15 || length > 1440) return;
    if (draft.entry) update(draft.entry, { ...schedulePatch(date, minutes(time), length), title });
    else onCreate(title, date, minutes(time), length, draft.recurrence);
    setDraft(null);
  }
  function taskButton(task: CalendarEntry) {
    return <button key={task.id} className={styles.chip} draggable onDragStart={(event) => event.dataTransfer.setData("application/x-cubik-task", task.id)} onClick={() => open(task)} title={task.title}><span>{task.startTime ?? ""}</span> {task.seriesId ? "↻ " : ""}{task.done ? "✓ " : ""}{task.title}</button>;
  }
  return <section className={styles.calendar} aria-label="Календарь задач">
    <header className={styles.toolbar}>
      <div className={styles.navigation}><button aria-label="Предыдущий период" onClick={() => shift(-1)}><ChevronLeft size={18} /></button><button onClick={() => setAnchor(today)}>Сегодня</button><button aria-label="Следующий период" onClick={() => shift(1)}><ChevronRight size={18} /></button><input aria-label="Перейти к дате" type="date" value={anchor} onChange={(event) => { if (event.target.value) setAnchor(event.target.value); }} /></div>
      <div className={styles.modes}>{(["day", "week", "month"] as const).map((value) => <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{{ day: "День", week: "Неделя", month: "Месяц" }[value]}</button>)}</div>
      <button onClick={() => create(anchor, 9 * 60)}><Plus size={16} />Задача</button>
    </header>
    <div className={styles.filters}><h2>{new Intl.DateTimeFormat("ru", { month: "long", year: "numeric" }).format(anchorDate)}</h2><select aria-label="Список в календаре" value={listId} onChange={(event) => setListId(event.target.value)}><option value="all">Все списки</option><option value="">Без списка</option>{lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}</select><label><input type="checkbox" checked={showDone} onChange={(event) => setShowDone(event.target.checked)} />Выполненные</label></div>
    <div className={styles.body}>
      <aside className={styles.backlog} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData("application/x-cubik-task"); if (tasks.some((task) => task.id === id)) onUpdate(id, { dueDate: null, startTime: null, endTime: null, durationMinutes: null, inbox: true }); }}><h3>Без даты <small>{backlog.length}</small></h3><p>Перетащите задачу в расписание. Чтобы снять дату — перенесите сюда.</p>{backlog.map(taskButton)}{!backlog.length && <p>Все задачи распределены.</p>}</aside>
      <div className={styles.board} data-mode={mode}>
        {mode === "month" ? <div className={styles.month}>
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <strong className={styles.weekday} key={day}>{day}</strong>)}
          {days.map(({ date, key }) => <div key={key} className={`${styles.monthDay} ${date.getMonth() !== anchorDate.getMonth() ? styles.muted : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => move(event, key)}><button className={key === today ? styles.today : styles.dayNumber} aria-label={`Создать задачу ${key}`} onClick={() => create(key, null)}>{date.getDate()} <Plus size={12} /></button>{visible.filter((task) => task.dueDate === key).map(taskButton)}</div>)}
        </div> : <>
          <div className={styles.dayHeaders} style={{ gridTemplateColumns: `48px repeat(${days.length}, minmax(0, 1fr))` }}><span />{days.map(({ date, key }) => <button key={key} className={key === today ? styles.today : ""} onClick={() => { setAnchor(key); setMode("day"); }}>{new Intl.DateTimeFormat("ru", { weekday: "short", day: "numeric" }).format(date)}</button>)}</div>
          <div className={styles.allDay} style={{ gridTemplateColumns: `48px repeat(${days.length}, minmax(0, 1fr))` }}><small>Без<br />времени</small>{days.map(({ key }) => <div key={key} onDragOver={(event) => event.preventDefault()} onDrop={(event) => move(event, key, null)}><button className={styles.addAllDay} aria-label={`Задача без времени ${key}`} onClick={() => create(key, null)}>+</button>{visible.filter((task) => task.dueDate === key && minutes(task.startTime) === null).map(taskButton)}</div>)}</div>
          <div ref={scroller} className={styles.scroll}><div className={styles.timeGrid} style={{ gridTemplateColumns: `48px repeat(${days.length}, minmax(0, 1fr))` }}>
            <div className={styles.hours}>{Array.from({ length: 24 }, (_, hour) => <span key={hour} style={{ top: hour * 60 }}>{String(hour).padStart(2, "0")}:00</span>)}</div>
            {days.map(({ key }) => <div key={key} className={styles.dayColumn} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const start = Math.min(1425, Math.max(0, Math.floor((event.clientY - event.currentTarget.getBoundingClientRect().top) / 15) * 15)); move(event, key, start); }}>
              {Array.from({ length: 48 }, (_, slot) => <button className={styles.slot} key={slot} aria-label={`Создать задачу ${key} ${timeLabel(slot * 30)}`} onClick={() => create(key, slot * 30)} />)}
              {eventLayout(visible.filter((task) => task.dueDate === key)).map(({ task, start, end, lane, lanes }) => <div key={task.id} className={`${styles.event} ${task.done ? styles.completed : ""}`} style={{ top: start, height: Math.max(18, resizePreview?.id === task.id ? resizePreview.length : end - start), left: `${lane / lanes * 100}%`, width: `${100 / lanes}%`, borderColor: lists.find((list) => list.id === task.listId)?.color ?? "#7997bb" }} draggable onDragStart={(event) => event.dataTransfer.setData("application/x-cubik-task", task.id)}>
                <button className={styles.eventContent} onClick={() => open(task)} title={`${task.title} · ${task.startTime}–${timeLabel(end)}`}><strong>{(task as CalendarEntry).seriesId ? "↻ " : ""}{task.title}</strong><span>{task.startTime} · {resizePreview?.id === task.id ? resizePreview.length : duration(task)} мин</span></button>
                <div role="slider" tabIndex={0} aria-label={`Длительность ${task.title}`} aria-valuemin={15} aria-valuemax={1440 - start} aria-valuenow={Math.min(duration(task), 1440 - start)} className={styles.resize} onKeyDown={(event) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); update(task, schedulePatch(key, start, Math.max(15, duration(task) + (event.key === "ArrowDown" ? 15 : -15)))); } }} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); resize.current = { id: task.id, y: event.clientY, length: duration(task) }; }} onPointerMove={(event) => { const saved = resize.current; if (saved?.id === task.id) setResizePreview({ id: task.id, length: Math.min(1440 - start, Math.max(15, saved.length + Math.round((event.clientY - saved.y) / 15) * 15)) }); }} onPointerUp={(event) => { const saved = resize.current; resize.current = null; setResizePreview(null); if (saved?.id === task.id) update(task, schedulePatch(key, start, Math.max(15, saved.length + Math.round((event.clientY - saved.y) / 15) * 15))); }} onPointerCancel={() => { resize.current = null; setResizePreview(null); }} />
              </div>)}
              {key === today && <div className={styles.now} style={{ top: now.getHours() * 60 + now.getMinutes() }} aria-label="Текущее время" />}
            </div>)}
          </div></div>
        </>}
      </div>
    </div>
    <p className={styles.hint}>Нажмите на время, чтобы создать задачу. Перетаскивайте блоки; нижний край меняет длительность с шагом 15 минут. На телефоне дату и время можно изменить в карточке.</p>
    <span className={styles.hint} role="status">{notice}</span>
    {draft && <div className={styles.overlay}><form className={styles.dialog} role="dialog" aria-modal="true" aria-label="Новая задача в календаре" onSubmit={submit}><header><h3>{draft.entry ? "Событие серии" : "Новая задача"}</h3><button type="button" aria-label="Закрыть создание" onClick={() => setDraft(null)}><X size={18} /></button></header><p>{draft.entry ? "Изменения применятся только к этому событию." : "Укажите название, дату и время."}</p><label>Название<input name="title" autoFocus required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label>Дата<input name="date" required type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label>Время · пустое поле — без времени<input name="time" type="time" value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} /></label><label>Длительность, мин<input name="length" type="number" min={15} max={1440} step={15} value={draft.length} onChange={(event) => setDraft({ ...draft, length: Number(event.target.value) })} /></label><label>Повторение<select disabled={Boolean(draft.entry)} value={draft.recurrence} onChange={(event) => setDraft({ ...draft, recurrence: event.target.value as TaskRecurrence })}><option value="none">Не повторять</option><option value="daily">Каждый день</option><option value="weekly">Каждую неделю</option><option value="monthly">Каждый месяц</option></select></label><button type="submit">{draft.entry ? "Сохранить событие" : "Создать задачу"}</button>{draft.entry && <div className={styles.occurrenceActions}><button type="button" onClick={() => { const entry = draft.entry!; onUpdateOccurrence(entry.seriesId!, entry.occurrenceDate!, { done: !entry.done, completedAt: entry.done ? null : new Date().toISOString() }); setDraft(null); }}>{draft.entry.done ? "Вернуть в работу" : "Завершить событие"}</button><button type="button" onClick={() => { onUpdateOccurrence(draft.entry!.seriesId!, draft.entry!.occurrenceDate!, { cancelled: true }); setDraft(null); }}>Пропустить событие</button><button type="button" onClick={() => { onOpen(draft.entry!.seriesId!); setDraft(null); }}>Редактировать всю серию</button></div>}</form></div>}
  </section>;
}
