import { CalendarDays, Check, Repeat2, Star } from "lucide-react";
import styles from "@/app/app/today/today.module.css";
import { Task, taskLists } from "../model";

type TaskListProps = {
  tasks: Task[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
};

export function TaskList({ tasks, selectedId, onSelect, onToggle }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div style={{ padding: "26px 18px", color: "#718098", fontSize: 13 }}>
        Здесь пока нет задач. Добавьте первую задачу выше.
      </div>
    );
  }

  return (
    <div className={styles.taskList}>
      {tasks.map((task) => {
        const list = taskLists.find((item) => item.id === task.listId);
        return (
          <article
            className={`${styles.taskRow} ${task.id === selectedId ? styles.taskSelected : ""}`}
            key={task.id}
            onClick={() => onSelect(task.id)}
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
