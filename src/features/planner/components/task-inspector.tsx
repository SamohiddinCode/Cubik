"use client";

import { FormEvent, useState } from "react";
import {
  CalendarDays,
  Check,
  Paperclip,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import styles from "@/app/app/today/today.module.css";
import editor from "./task-inspector.module.css";
import { Task, TaskPriority, TaskRecurrence, taskLists } from "../model";

type TaskInspectorProps = {
  task: Task;
  onClose: () => void;
  onToggle: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onAddAttachments: (taskId: string, names: string[]) => void;
};

type Draft = {
  title: string;
  description: string;
  dueDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: string;
  priority: TaskPriority;
  listId: string;
  tags: string;
  goalId: string;
  recurrence: TaskRecurrence;
  habit: boolean;
  inbox: boolean;
};

function createDraft(task: Task): Draft {
  return {
    title: task.title,
    description: task.description,
    dueDate: task.dueDate ?? "",
    startTime: task.startTime ?? "",
    endTime: task.endTime ?? "",
    durationMinutes: task.durationMinutes ? String(task.durationMinutes) : "",
    priority: task.priority,
    listId: task.listId ?? "",
    tags: task.tags.join(", "),
    goalId: task.goalId ?? "",
    recurrence: task.recurrence,
    habit: task.habit,
    inbox: task.inbox,
  };
}

export function TaskInspector(props: TaskInspectorProps) {
  return <TaskInspectorEditor key={props.task.id} {...props} />;
}

function TaskInspectorEditor({
  task,
  onClose,
  onToggle,
  onUpdate,
  onDelete,
  onToggleSubtask,
  onAddSubtask,
  onAddAttachments,
}: TaskInspectorProps) {
  const [draft, setDraft] = useState<Draft>(() => createDraft(task));
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const completedSubtasks = task.subtasks.filter((subtask) => subtask.done).length;

  function save(event: FormEvent) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) return;

    onUpdate(task.id, {
      title,
      description: draft.description.trim(),
      dueDate: draft.dueDate || null,
      startTime: draft.startTime || null,
      endTime: draft.endTime || null,
      durationMinutes: draft.durationMinutes ? Math.max(0, Number(draft.durationMinutes)) : null,
      priority: draft.priority,
      listId: draft.listId || null,
      tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      goalId: draft.goalId.trim() || null,
      recurrence: draft.recurrence,
      habit: draft.habit,
      inbox: draft.inbox || !draft.dueDate,
    });
  }

  function addSubtask(event: FormEvent) {
    event.preventDefault();
    if (!subtaskTitle.trim()) return;
    onAddSubtask(task.id, subtaskTitle);
    setSubtaskTitle("");
  }

  function removeTask() {
    if (window.confirm("Удалить эту задачу? Это действие нельзя отменить в локальном прототипе.")) {
      onDelete(task.id);
    }
  }

  return (
    <aside className={styles.inspector}>
      <header>
        <div>
          <button
            aria-label={task.done ? "Вернуть задачу" : "Завершить задачу"}
            className={`${styles.checkbox} ${task.done ? styles.checked : ""}`}
            onClick={() => onToggle(task.id)}
          >
            {task.done && <Check size={14} />}
          </button>
          <h2>{task.title}</h2>
        </div>
        <button className={styles.iconButton} aria-label="Закрыть детали" onClick={onClose}>
          <X size={20} />
        </button>
      </header>

      <div className={styles.inspectorBody}>
        <form className={editor.form} onSubmit={save}>
          <label className={editor.field}>
            <span>Название</span>
            <input
              className={editor.titleInput}
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            />
          </label>

          <label className={editor.field}>
            <span>Описание</span>
            <textarea
              placeholder="Контекст, заметки, критерий готовности…"
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            />
          </label>

          <div className={editor.twoColumns}>
            <label>
              <span>Дата</span>
              <input type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} />
            </label>
            <label>
              <span>Длительность, мин</span>
              <input min="0" step="5" type="number" value={draft.durationMinutes} onChange={(event) => setDraft((current) => ({ ...current, durationMinutes: event.target.value }))} />
            </label>
          </div>

          <div className={editor.twoColumns}>
            <label>
              <span>Начало</span>
              <input type="time" value={draft.startTime} onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))} />
            </label>
            <label>
              <span>Конец</span>
              <input type="time" value={draft.endTime} onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))} />
            </label>
          </div>

          <div className={editor.twoColumns}>
            <label>
              <span>Приоритет</span>
              <select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as TaskPriority }))}>
                <option value="P1">P1 — высокий</option>
                <option value="P2">P2 — средний</option>
                <option value="P3">P3 — обычный</option>
              </select>
            </label>
            <label>
              <span>Список</span>
              <select value={draft.listId} onChange={(event) => setDraft((current) => ({ ...current, listId: event.target.value }))}>
                <option value="">Входящие</option>
                {taskLists.map((list) => <option value={list.id} key={list.id}>{list.name}</option>)}
              </select>
            </label>
          </div>

          <label className={editor.field}>
            <span>Метки</span>
            <input placeholder="MVP, дизайн, звонок" value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} />
          </label>

          <div className={editor.twoColumns}>
            <label>
              <span>Повторение</span>
              <select value={draft.recurrence} onChange={(event) => setDraft((current) => ({ ...current, recurrence: event.target.value as TaskRecurrence }))}>
                <option value="none">Не повторять</option>
                <option value="daily">Каждый день</option>
                <option value="weekly">Каждую неделю</option>
                <option value="monthly">Каждый месяц</option>
              </select>
            </label>
            <label>
              <span>Связанная цель</span>
              <input placeholder="Например launch-mvp" value={draft.goalId} onChange={(event) => setDraft((current) => ({ ...current, goalId: event.target.value }))} />
            </label>
          </div>

          <div className={editor.checks}>
            <label className={editor.checkRow}>
              <input type="checkbox" checked={draft.habit} onChange={(event) => setDraft((current) => ({ ...current, habit: event.target.checked }))} />
              <span>Отметить как привычку</span>
            </label>
            <label className={editor.checkRow}>
              <input type="checkbox" checked={draft.inbox} onChange={(event) => setDraft((current) => ({ ...current, inbox: event.target.checked }))} />
              <span>Оставить во входящих</span>
            </label>
          </div>

          <div className={editor.actions}>
            <button className={editor.save} type="submit"><Save size={15} />Сохранить</button>
            <button className={editor.delete} type="button" aria-label="Удалить задачу" onClick={removeTask}><Trash2 size={15} /></button>
          </div>
        </form>

        {task.goalId && (
          <section className={styles.goalCard}>
            <small>Связанная цель</small>
            <div><Target size={18} /><strong>{task.goalId === "launch-mvp" ? "Запуск MVP" : task.goalId}</strong></div>
          </section>
        )}

        <section className={editor.subtaskSection}>
          <div className={editor.sectionHeader}>
            <strong>Подзадачи</strong>
            <span>{completedSubtasks}/{task.subtasks.length}</span>
          </div>
          <div className={editor.subtaskList}>
            {task.subtasks.map((subtask) => (
              <label className={editor.subtask} key={subtask.id}>
                <input type="checkbox" checked={subtask.done} onChange={() => onToggleSubtask(task.id, subtask.id)} />
                <span className={subtask.done ? editor.subtaskDone : ""}>{subtask.title}</span>
              </label>
            ))}
          </div>
          <form className={editor.subtaskForm} onSubmit={addSubtask}>
            <input aria-label="Новая подзадача" placeholder="Добавить подзадачу" value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} />
            <button type="submit" aria-label="Добавить подзадачу"><Plus size={15} /></button>
          </form>
        </section>

        <section className={editor.attachmentSection}>
          <div className={editor.sectionHeader}><strong>Вложения</strong><span>{task.attachments.length}</span></div>
          <label className={editor.attachmentButton}>
            <Paperclip size={15} />Добавить файлы
            <input
              multiple
              type="file"
              onChange={(event) => {
                const names = Array.from(event.currentTarget.files ?? []).map((file) => file.name);
                onAddAttachments(task.id, names);
                event.currentTarget.value = "";
              }}
            />
          </label>
          {task.attachments.length > 0 && <div className={editor.attachmentList}>{task.attachments.map((attachment) => <span key={attachment.id}>{attachment.name}</span>)}</div>}
          <p className={editor.note}>В локальном MVP сохраняются названия вложений. Сами файлы будут храниться в object storage после подключения backend.</p>
        </section>

        <section className={styles.aiPanel}>
          <header><Sparkles size={18} /><strong>CUBIK AI</strong></header>
          <p>Контекст задачи подготовлен. AI-действия будут подключены через preview → confirm → apply → undo после серверного gateway.</p>
        </section>
        <div className={styles.inspectorTools}><button aria-label="Дата"><CalendarDays size={18} /></button><button aria-label="Вложения"><Paperclip size={18} /></button></div>
      </div>
    </aside>
  );
}
