"use client";

import { CSSProperties, DragEvent, FormEvent, useMemo, useState } from "react";
import { CalendarDays, Check, CircleDot, GripVertical, ListFilter, Plus, SearchX } from "lucide-react";
import { eisenhowerQuadrants, filterMatrixTasks, MatrixScope, MatrixSort, sortMatrixTasks } from "../eisenhower-model";
import { localDateKey, Task, TaskList as PlannerList, TaskPriority } from "../model";
import styles from "./eisenhower-matrix.module.css";

type EisenhowerMatrixProps = {
  tasks: Task[];
  lists: PlannerList[];
  query: string;
  now: Date;
  selectedId: string | null;
  onCreate: (title: string, priority: TaskPriority) => void;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
};

const scopeLabels: Record<MatrixScope, string> = {
  all: "Все сроки",
  today: "На сегодня",
  week: "На 7 дней",
  overdue: "Просроченные",
  undated: "Без даты",
};

const sortLabels: Record<MatrixSort, string> = {
  manual: "Ручной порядок",
  date: "По сроку",
  name: "По названию",
};

function formatDate(value: string | null, now: Date) {
  if (!value) return "Без срока";
  if (value === localDateKey(now)) return "Сегодня";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(year, month - 1, day));
}

export function EisenhowerMatrix({ tasks, lists, query, now, selectedId, onCreate, onOpen, onToggle, onUpdate }: EisenhowerMatrixProps) {
  const [scope, setScope] = useState<MatrixScope>("all");
  const [listId, setListId] = useState("");
  const [sort, setSort] = useState<MatrixSort>("manual");
  const [showCompleted, setShowCompleted] = useState(false);
  const [drafts, setDrafts] = useState<Record<TaskPriority, string>>({ P1: "", P2: "", P3: "", P4: "" });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropPriority, setDropPriority] = useState<TaskPriority | null>(null);

  const visible = useMemo(() => filterMatrixTasks(tasks, { query, listId, scope, showCompleted, now }), [listId, now, query, scope, showCompleted, tasks]);
  const openCount = visible.filter((task) => !task.done).length;
  const importantCount = visible.filter((task) => !task.done && (task.priority === "P1" || task.priority === "P2")).length;
  const urgentCount = visible.filter((task) => !task.done && (task.priority === "P1" || task.priority === "P3")).length;

  function submitTask(event: FormEvent, priority: TaskPriority) {
    event.preventDefault();
    const title = drafts[priority].trim();
    if (!title) return;
    onCreate(title, priority);
    setDrafts((current) => ({ ...current, [priority]: "" }));
  }

  function dropTask(event: DragEvent<HTMLElement>, priority: TaskPriority) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || draggingId;
    setDropPriority(null);
    setDraggingId(null);
    if (!id) return;
    const task = tasks.find((item) => item.id === id);
    if (task && task.priority !== priority) onUpdate(id, { priority });
  }

  return (
    <section className={styles.matrix}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}><CircleDot size={14} /> ФОКУС И РЕШЕНИЯ</span>
          <h2>Что требует вашего внимания?</h2>
          <p>Распределяйте задачи по четырём действиям. Изменения сразу видны в списках и календаре.</p>
        </div>
        <div className={styles.metrics} aria-label="Статистика матрицы">
          <span><strong>{openCount}</strong> в работе</span>
          <span><strong>{importantCount}</strong> важных</span>
          <span><strong>{urgentCount}</strong> срочных</span>
        </div>
      </header>

      <div className={styles.toolbar}>
        <span><ListFilter size={16} /> Показать</span>
        <label>
          <span className={styles.srOnly}>Период</span>
          <select value={scope} onChange={(event) => setScope(event.target.value as MatrixScope)}>
            {(Object.keys(scopeLabels) as MatrixScope[]).map((value) => <option key={value} value={value}>{scopeLabels[value]}</option>)}
          </select>
        </label>
        <label>
          <span className={styles.srOnly}>Список</span>
          <select value={listId} onChange={(event) => setListId(event.target.value)}>
            <option value="">Все списки</option>
            {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
          </select>
        </label>
        <label>
          <span className={styles.srOnly}>Сортировка</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as MatrixSort)}>
            {(Object.keys(sortLabels) as MatrixSort[]).map((value) => <option key={value} value={value}>{sortLabels[value]}</option>)}
          </select>
        </label>
        <label className={styles.completedToggle}>
          <input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} />
          <span>Выполненные</span>
        </label>
      </div>

      {query && visible.length === 0 && (
        <div className={styles.searchEmpty} role="status"><SearchX size={18} /> По запросу «{query}» задач в матрице нет.</div>
      )}

      <div className={styles.grid}>
        {eisenhowerQuadrants.map((quadrant) => {
          const quadrantTasks = sortMatrixTasks(visible.filter((task) => task.priority === quadrant.priority), sort);
          const toneStyle = { "--quadrant-color": `var(--matrix-${quadrant.tone})` } as CSSProperties;
          return (
            <section
              className={`${styles.quadrant} ${dropPriority === quadrant.priority ? styles.dropTarget : ""}`}
              data-tone={quadrant.tone}
              key={quadrant.priority}
              onDragEnter={() => setDropPriority(quadrant.priority)}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropPriority(null); }}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
              onDrop={(event) => dropTask(event, quadrant.priority)}
              style={toneStyle}
            >
              <header className={styles.quadrantHeader}>
                <span className={styles.quadrantNumber}>{quadrant.index}</span>
                <div><strong>{quadrant.action}</strong><h3>{quadrant.title}</h3></div>
                <em>{quadrantTasks.length}</em>
              </header>
              <p className={styles.quadrantDescription}>{quadrant.description}</p>

              <form className={styles.quickAdd} onSubmit={(event) => submitTask(event, quadrant.priority)}>
                <Plus size={16} />
                <input aria-label={`Добавить задачу: ${quadrant.action}`} placeholder="Добавить задачу" value={drafts[quadrant.priority]} onChange={(event) => setDrafts((current) => ({ ...current, [quadrant.priority]: event.target.value }))} />
                <button disabled={!drafts[quadrant.priority].trim()} type="submit">Enter</button>
              </form>

              <div className={styles.cards}>
                {quadrantTasks.length === 0 && <div className={styles.empty}>Перетащите задачу сюда</div>}
                {quadrantTasks.map((task) => {
                  const list = lists.find((item) => item.id === task.listId);
                  return (
                    <article
                      aria-current={selectedId === task.id ? "true" : undefined}
                      className={`${styles.card} ${task.done ? styles.cardDone : ""} ${selectedId === task.id ? styles.cardSelected : ""} ${draggingId === task.id ? styles.cardDragging : ""}`}
                      draggable
                      key={task.id}
                      onClick={() => onOpen(task.id)}
                      onDragEnd={() => { setDraggingId(null); setDropPriority(null); }}
                      onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", task.id); setDraggingId(task.id); }}
                    >
                      <GripVertical className={styles.grip} size={15} />
                      <button aria-label={task.done ? "Вернуть задачу" : "Выполнить задачу"} className={`${styles.checkbox} ${task.done ? styles.checked : ""}`} onClick={(event) => { event.stopPropagation(); onToggle(task.id); }} type="button">
                        {task.done && <Check size={12} />}
                      </button>
                      <div className={styles.cardContent}>
                        <strong>{task.title}</strong>
                        <div className={styles.meta}>
                          <span><CalendarDays size={12} />{formatDate(task.dueDate, now)}{task.startTime ? ` · ${task.startTime}` : ""}</span>
                          {list && <span className={styles.listChip}><i style={{ background: list.color }} />{list.name}</span>}
                          {task.tags.slice(0, 1).map((tag) => <span key={tag}>#{tag}</span>)}
                        </div>
                      </div>
                      <select aria-label={`Квадрант задачи ${task.title}`} onClick={(event) => event.stopPropagation()} onChange={(event) => onUpdate(task.id, { priority: event.target.value as TaskPriority })} value={task.priority}>
                        {eisenhowerQuadrants.map((option) => <option key={option.priority} value={option.priority}>{option.priority} · {option.action}</option>)}
                      </select>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
