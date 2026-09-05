import { DragEvent, KeyboardEvent, useEffect, useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronRight, Copy, GripVertical, Inbox, MoreHorizontal, Repeat2, Star, Trash2 } from "lucide-react";
import styles from "@/app/app/today/today.module.css";
import { addDaysKey, localDateKey, Task, TaskGroup, TaskList as PlannerTaskList } from "../model";

type TaskListProps = {
  tasks: Task[];
  lists: PlannerTaskList[];
  selectedId: string | null;
  group: TaskGroup;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onReorder: (sourceId: string, targetId: string) => void;
  manualReorder: boolean;
  bulkMode: boolean;
  bulkSelectedIds: string[];
  onBulkSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSchedule: (id: string, dueDate: string | null, inbox: boolean) => void;
  onDelete: (id: string) => void;
};

type TaskSection = { key: string; label: string; tasks: Task[] };

function buildSections(tasks: Task[], lists: PlannerTaskList[], group: TaskGroup): TaskSection[] {
  if (group === "none") {
    const today = localDateKey();
    const buckets: TaskSection[] = [
      { key: "overdue", label: "Просрочено", tasks: [] },
      { key: "active", label: "Запланировано", tasks: [] },
      { key: "undated", label: "Без даты", tasks: [] },
      { key: "completed", label: "Выполнено", tasks: [] },
    ];
    tasks.forEach((task) => {
      const key = task.done ? "completed" : !task.dueDate ? "undated" : task.dueDate < today ? "overdue" : "active";
      buckets.find((section) => section.key === key)?.tasks.push(task);
    });
    return buckets.filter((section) => section.tasks.length > 0);
  }

  return tasks.reduce<TaskSection[]>((result, task) => {
    let key = "all";
    let label = "Задачи";
    if (group === "list") {
      key = task.listId ?? "inbox";
      label = lists.find((item) => item.id === task.listId)?.name ?? "Без списка";
    } else if (group === "priority") {
      key = task.priority;
      const priorityLabels = { P1: "Критично", P2: "Важно", P3: "Низкий", P4: "Без приоритета" };
      label = `${task.priority} · ${priorityLabels[task.priority]}`;
    } else if (group === "status") {
      key = task.done ? "done" : "active";
      label = task.done ? "Выполнено" : "В работе";
    }
    const existing = result.find((item) => item.key === key);
    if (existing) existing.tasks.push(task);
    else result.push({ key, label, tasks: [task] });
    return result;
  }, []);
}

export function TaskList({
  tasks,
  lists,
  selectedId,
  group,
  onSelect,
  onToggle,
  onToggleFavorite,
  onReorder,
  manualReorder,
  bulkMode,
  bulkSelectedIds,
  onBulkSelect,
  onDuplicate,
  onSchedule,
  onDelete,
}: TaskListProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ completed: true });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null);
  const bulkSelected = new Set(bulkSelectedIds);

  useEffect(() => {
    if (!menuTaskId) return;
    const closeMenu = () => setMenuTaskId(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [menuTaskId]);

  function selectWithKeyboard(event: KeyboardEvent<HTMLElement>, id: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (bulkMode) onBulkSelect(id);
    else onSelect(id);
  }

  if (tasks.length === 0) {
    return (
      <div role="status" style={{ padding: "26px 18px", color: "#718098", fontSize: 13 }}>
        Здесь пока нет задач. Добавьте первую задачу выше или измените фильтр поиска.
      </div>
    );
  }

  const sections = buildSections(tasks, lists, group);

  function dropTask(event: DragEvent<HTMLElement>, targetId: string) {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain") || draggingId;
    if (sourceId && manualReorder) onReorder(sourceId, targetId);
    setDraggingId(null);
  }

  return (
    <div className={styles.taskList}>
      {sections.map((section) => {
        const isCollapsed = collapsed[section.key] === true;
        return <section className={styles.taskSection} key={section.key}>
        <button
          aria-expanded={!isCollapsed}
          className={styles.taskGroupHeading}
          onClick={() => setCollapsed((current) => ({ ...current, [section.key]: !isCollapsed }))}
          type="button"
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          <span>{section.label}</span><em>{section.tasks.length}</em>
        </button>
        {!isCollapsed && section.tasks.map((task) => {
        const list = lists.find((item) => item.id === task.listId);
        return (
          <article
            aria-current={task.id === selectedId ? "true" : undefined}
            className={`${styles.taskRow} ${task.id === selectedId && !bulkMode ? styles.taskSelected : ""} ${bulkSelected.has(task.id) ? styles.taskBulkSelected : ""} ${draggingId === task.id ? styles.taskDragging : ""}`}
            draggable={manualReorder && !bulkMode}
            key={task.id}
            onClick={() => {
              setMenuTaskId(null);
              if (bulkMode) onBulkSelect(task.id);
              else onSelect(task.id);
            }}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(event) => { if (manualReorder) event.preventDefault(); }}
            onDragStart={(event) => {
              if (!manualReorder || bulkMode) return;
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", task.id);
              setDraggingId(task.id);
            }}
            onDrop={(event) => dropTask(event, task.id)}
            onKeyDown={(event) => selectWithKeyboard(event, task.id)}
            role="button"
            tabIndex={0}
          >
            {bulkMode ? (
              <button
                aria-label={bulkSelected.has(task.id) ? `Убрать ${task.title} из выбранных` : `Выбрать ${task.title}`}
                aria-pressed={bulkSelected.has(task.id)}
                className={`${styles.bulkCheckbox} ${bulkSelected.has(task.id) ? styles.bulkCheckboxActive : ""}`}
                onClick={(event) => { event.stopPropagation(); onBulkSelect(task.id); }}
                type="button"
              >
                {bulkSelected.has(task.id) && <Check size={12} />}
              </button>
            ) : (
              <span className={`${styles.dragHandle} ${manualReorder ? "" : styles.dragDisabled}`} title={manualReorder ? "Перетащить задачу" : "Выберите ручной порядок для перетаскивания"}><GripVertical size={15} /></span>
            )}
            <button
              aria-label={task.done ? "Вернуть задачу" : "Завершить задачу"}
              className={`${styles.checkbox} ${task.done ? styles.checked : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                onToggle(task.id);
              }}
            >
              {task.done && <Check size={14} />}
            </button>
            <div className={styles.taskContent}>
              <strong className={task.done ? styles.done : ""}>{task.title}</strong>
              <div className={styles.taskMeta}>
                {task.startTime && (
                  <span>
                    <CalendarDays size={14} />
                    {task.startTime}{task.endTime ? `–${task.endTime}` : ""}
                  </span>
                )}
                <b className={styles[task.priority]}>{task.priority}</b>
                {list && (
                  <span className={styles.projectChip}>
                    <i style={{ background: list.color }} />
                    {list.name}
                  </span>
                )}
                {task.tags.slice(0, 2).map((tag) => <span key={tag}>#{tag}</span>)}
                {task.habit && (
                  <span className={styles.habitChip}>
                    <Repeat2 size={13} />Привычка
                  </span>
                )}
              </div>
            </div>
            <div className={styles.taskActions}>
              <button
                className={`${styles.starButton} ${task.favorite ? styles.starActive : ""}`}
                aria-label={task.favorite ? "Убрать из избранного" : "Добавить в избранное"}
                aria-pressed={task.favorite}
                onClick={(event) => { event.stopPropagation(); onToggleFavorite(task.id); }}
              >
                <Star fill={task.favorite ? "currentColor" : "none"} size={17} />
              </button>
              <button className={styles.moreButton} aria-label={`Действия с задачей ${task.title}`} aria-expanded={menuTaskId === task.id} onClick={(event) => { event.stopPropagation(); setMenuTaskId((current) => current === task.id ? null : task.id); }} type="button"><MoreHorizontal size={17} /></button>
              {menuTaskId === task.id && (
                <div className={styles.taskMenu} onClick={(event) => event.stopPropagation()}>
                  <button onClick={() => { onSchedule(task.id, localDateKey(), false); setMenuTaskId(null); }} type="button"><CalendarDays size={15} />Сегодня</button>
                  <button onClick={() => { onSchedule(task.id, addDaysKey(1), false); setMenuTaskId(null); }} type="button"><CalendarDays size={15} />Завтра</button>
                  <button onClick={() => { onSchedule(task.id, null, true); setMenuTaskId(null); }} type="button"><Inbox size={15} />Во входящие</button>
                  <button onClick={() => { onDuplicate(task.id); setMenuTaskId(null); }} type="button"><Copy size={15} />Дублировать</button>
                  <button className={styles.taskMenuDanger} onClick={() => { if (window.confirm(`Удалить задачу «${task.title}»?`)) onDelete(task.id); setMenuTaskId(null); }} type="button"><Trash2 size={15} />Удалить</button>
                </div>
              )}
            </div>
          </article>
        );
        })}
      </section>;
      })}
    </div>
  );
}
