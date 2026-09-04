import { KeyboardEvent } from "react";
import { CalendarDays, Check, Repeat2, Star } from "lucide-react";
import styles from "@/app/app/today/today.module.css";
import { Task, TaskList as PlannerTaskList } from "../model";

type TaskListProps = {
  tasks: Task[];
  lists: PlannerTaskList[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
};

export function TaskList({ tasks, lists, selectedId, onSelect, onToggle }: TaskListProps) {
  function selectWithKeyboard(event: KeyboardEvent<HTMLElement>, id: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(id);
  }

  if (tasks.length === 0) {
    return (
      <div role="status" style={{ padding: "26px 18px", color: "#718098", fontSize: 13 }}>
        Здесь пока нет задач. Добавьте первую задачу выше или измените фильтр поиска.
      </div>
    );
  }

  return (
    <div className={styles.taskList}>
      {tasks.map((task) => {
        const list = lists.find((item) => item.id === task.listId);
        return (
          <article
            aria-current={task.id === selectedId ? "true" : undefined}
            className={`${styles.taskRow} ${task.id === selectedId ? styles.taskSelected : ""}`}
            key={task.id}
            onClick={() => onSelect(task.id)}
            onKeyDown={(event) => selectWithKeyboard(event, task.id)}
            role="button"
            tabIndex={0}
          >
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
            <button className={styles.starButton} aria-label="В избранное" onClick={(event) => event.stopPropagation()}>
              <Star size={17} />
            </button>
          </article>
        );
      })}
    </div>
  );
}
