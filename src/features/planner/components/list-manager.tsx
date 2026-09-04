"use client";

import { FormEvent, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { listColorPalette, TaskList } from "../model";
import styles from "./list-manager.module.css";

type ListManagerProps = {
  lists: TaskList[];
  onClose: () => void;
  onAdd: (name: string, color?: string) => TaskList | null;
  onUpdate: (id: string, patch: Pick<Partial<TaskList>, "name" | "color">) => void;
  onDelete: (id: string) => void;
};

export function ListManager({ lists, onClose, onAdd, onUpdate, onDelete }: ListManagerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(lists[0]?.id ?? null);
  const selected = lists.find((list) => list.id === selectedId) ?? null;

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section aria-labelledby="list-manager-title" aria-modal="true" className={styles.dialog} role="dialog">
        <header className={styles.header}>
          <h2 id="list-manager-title">Списки Planner</h2>
          <button className={styles.iconButton} aria-label="Закрыть" onClick={onClose}><X size={19} /></button>
        </header>
        <div className={styles.body}>
          <aside className={styles.sidebar}>
            <button className={styles.newButton} onClick={() => setSelectedId(null)}><Plus size={16} />Новый список</button>
            {lists.map((list) => (
              <button
                className={`${styles.listButton} ${selectedId === list.id ? styles.active : ""}`}
                key={list.id}
                onClick={() => setSelectedId(list.id)}
              >
                <i className={styles.dot} style={{ background: list.color }} />
                {list.name}
              </button>
            ))}
          </aside>
          <ListEditor
            key={selected?.id ?? "new"}
            list={selected}
            onAdd={(name, color) => {
              const created = onAdd(name, color);
              if (created) setSelectedId(created.id);
            }}
            onDelete={(id) => {
              onDelete(id);
              const fallback = lists.find((list) => list.id !== id);
              setSelectedId(fallback?.id ?? null);
            }}
            onUpdate={onUpdate}
          />
        </div>
      </section>
    </div>
  );
}

type ListEditorProps = {
  list: TaskList | null;
  onAdd: (name: string, color: string) => void;
  onUpdate: (id: string, patch: Pick<Partial<TaskList>, "name" | "color">) => void;
  onDelete: (id: string) => void;
};

function ListEditor({ list, onAdd, onUpdate, onDelete }: ListEditorProps) {
  const [name, setName] = useState(list?.name ?? "");
  const [color, setColor] = useState(list?.color ?? listColorPalette[0]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    if (list) onUpdate(list.id, { name, color });
    else onAdd(name, color);
  }

  function remove() {
    if (!list) return;
    if (window.confirm(`Удалить список «${list.name}»? Задачи останутся в Planner без списка.`)) {
      onDelete(list.id);
    }
  }

  return (
    <form className={styles.editor} onSubmit={submit}>
      <h3>{list ? "Настройки списка" : "Создать список"}</h3>
      <label className={styles.field}>
        <span>Название</span>
        <input autoFocus maxLength={60} placeholder="Например, Проект CUBIK" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <div className={styles.field}>
        <span className={styles.colorLabel}>Цвет</span>
        <div className={styles.colors}>
          {listColorPalette.map((item) => (
            <button
              aria-label={`Выбрать цвет ${item}`}
              className={`${styles.colorButton} ${color === item ? styles.selected : ""}`}
              key={item}
              onClick={() => setColor(item)}
              style={{ background: item }}
              type="button"
            />
          ))}
        </div>
      </div>
      <p className={styles.helper}>Список используется как рабочий контекст задач. При удалении списка сами задачи не удаляются.</p>
      <div className={styles.actions}>
        <button className={styles.saveButton} type="submit"><Save size={15} />{list ? "Сохранить" : "Создать"}</button>
        {list && <button className={styles.deleteButton} type="button" onClick={remove}><Trash2 size={15} />Удалить</button>}
      </div>
    </form>
  );
}
