import { localDateKey, Task, TaskList } from "../model";
import styles from "./task-summary.module.css";

export function TaskSummary({ tasks, lists, now, onOpen }: { tasks: Task[]; lists: TaskList[]; now: Date; onOpen: (id: string) => void }) {
  const today = localDateKey(now);
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + index);
    const key = localDateKey(date);
    return { key, label: new Intl.DateTimeFormat("ru", { weekday: "short" }).format(date), count: tasks.filter((task) => task.done && task.completedAt && localDateKey(new Date(task.completedAt)) === key).length };
  });
  const overdue = tasks.filter((task) => !task.done && task.dueDate && task.dueDate < today);
  const active = tasks.filter((task) => !task.done);
  const completed = days.reduce((sum, day) => sum + day.count, 0);
  const weekTasks = tasks.filter((task) => task.dueDate && task.dueDate >= days[0].key && task.dueDate <= days[6].key);
  const weekDone = weekTasks.filter((task) => task.done).length;
  const max = Math.max(1, ...days.map((day) => day.count));
  const workloads = [...lists, { id: "", name: "Без списка", color: "#8a99ad" }].map((list) => {
    const items = active.filter((task) => (task.listId ?? "") === list.id);
    return { ...list, count: items.length, minutes: items.reduce((sum, task) => sum + (task.durationMinutes ?? 0), 0) };
  });
  return <section className={styles.summary} aria-label="Сводка задач">
    <header><h2>Ваша неделя</h2><p>{new Intl.DateTimeFormat("ru", { day: "numeric", month: "long" }).format(monday)} — {new Intl.DateTimeFormat("ru", { day: "numeric", month: "long" }).format(new Date(`${days[6].key}T12:00:00`))} · Все списки</p></header>
    <div className={styles.metrics}>
      <article><span>Завершено за неделю</span><strong>{completed}</strong><small>По дате завершения</small></article>
      <article><span>В работе</span><strong>{active.length}</strong><small>Всего активных задач</small></article>
      <article><span>Просрочено</span><strong>{overdue.length}</strong><small>Требуют нового плана</small></article>
      <article><span>План недели</span><strong>{weekTasks.length ? Math.round(weekDone / weekTasks.length * 100) : 0}%</strong><small>{weekDone} из {weekTasks.length} задач с датой на этой неделе</small></article>
    </div>
    <div className={styles.columns}>
      <article className={styles.card}><h3>Завершения по дням</h3><p>Количество выполненных задач</p><div className={styles.chart}>{days.map((day) => <div key={day.key} aria-label={`${day.label}: ${day.count}`}><strong>{day.count}</strong><div className={styles.track}><i style={{ height: `${day.count / max * 100}%` }} /></div><span>{day.label}</span></div>)}</div>{completed === 0 && <p>Пока нет завершений на этой неделе.</p>}</article>
      <article className={styles.card}><h3>Нагрузка по спискам</h3><p>Открытые задачи и запланированное время</p>{workloads.map((list) => <div className={styles.workload} key={list.id}><span><i style={{ background: list.color }} />{list.name}</span><strong>{list.count}</strong><small>{list.minutes} мин</small></div>)}</article>
    </div>
    <article className={styles.card}><h3>Требуют внимания</h3><p>Просроченные задачи — сначала ближайшие по дате</p>{overdue.length === 0 ? <p>Просроченных задач нет.</p> : overdue.slice().sort((a, b) => a.dueDate!.localeCompare(b.dueDate!)).map((task) => <button className={styles.overdue} key={task.id} onClick={() => onOpen(task.id)}><span>{task.title}</span><small>{task.dueDate}</small></button>)}</article>
  </section>;
}
