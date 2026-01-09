import React from "react";
import TodoItem from "./TodoItem";

/**
 * @typedef {{
 *  todos: Array<any>,
 *  loading?: boolean,
 *  error?: string,
 *  onToggle: (todo: any) => void,
 *  onDelete: (todo: any) => void,
 *  onSaveTitle: (todo: any, title: string) => void,
 *  busyIds?: Set<string|number>
 * }} Props
 */

// PUBLIC_INTERFACE
export default function TodoList({
  todos,
  loading = false,
  error = "",
  onToggle,
  onDelete,
  onSaveTitle,
  busyIds = new Set(),
}) {
  /** Scrollable list with states. */
  return (
    <section className="todoSection" aria-label="To-do list">
      <div className="todoSection__header">
        <h2 className="sectionTitle">Tasks</h2>
        <div className="sectionCount" aria-label="Task count">
          {todos.length}
        </div>
      </div>

      {error ? (
        <div className="alert alertError" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <div className="skeleton">Loading tasks…</div> : null}

      {!loading && todos.length === 0 ? (
        <div className="emptyState">
          <div className="emptyState__title">No tasks yet</div>
          <div className="emptyState__subtitle">Add your first task above.</div>
        </div>
      ) : null}

      <ul className="todoList" aria-label="Tasks">
        {todos.map((t) => (
          <TodoItem
            key={t.id}
            todo={t}
            onToggle={onToggle}
            onDelete={onDelete}
            onSaveTitle={onSaveTitle}
            busy={busyIds.has(t.id)}
          />
        ))}
      </ul>
    </section>
  );
}
