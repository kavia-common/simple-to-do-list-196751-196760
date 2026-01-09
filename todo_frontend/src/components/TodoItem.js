import React, { useMemo, useState } from "react";

/**
 * @typedef {{
 *  todo: { id: string|number, title: string, completed?: boolean, createdAt?: string },
 *  onToggle: (todo: any) => void,
 *  onDelete: (todo: any) => void,
 *  onSaveTitle: (todo: any, title: string) => void,
 *  busy?: boolean
 * }} Props
 */

// PUBLIC_INTERFACE
export default function TodoItem({ todo, onToggle, onDelete, onSaveTitle, busy = false }) {
  /** Renders a single todo with edit/delete/toggle actions. */
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title || "");
  const [localError, setLocalError] = useState("");

  const trimmed = useMemo(() => draft.trim(), [draft]);

  function startEdit() {
    setLocalError("");
    setDraft(todo.title || "");
    setIsEditing(true);
  }

  function cancelEdit() {
    setLocalError("");
    setDraft(todo.title || "");
    setIsEditing(false);
  }

  function submitEdit(e) {
    e.preventDefault();
    setLocalError("");

    if (!trimmed) {
      setLocalError("Title cannot be empty.");
      return;
    }
    if (trimmed.length > 200) {
      setLocalError("Title is too long (max 200 characters).");
      return;
    }

    onSaveTitle(todo, trimmed);
    setIsEditing(false);
  }

  return (
    <li className={`todoItem ${todo.completed ? "isCompleted" : ""}`}>
      <div className="todoItem__left">
        <button
          type="button"
          className={`checkButton ${todo.completed ? "isChecked" : ""}`}
          onClick={() => onToggle(todo)}
          disabled={busy}
          aria-label={todo.completed ? "Mark as not completed" : "Mark as completed"}
          title={todo.completed ? "Completed" : "Not completed"}
        >
          <span className="checkButton__dot" />
        </button>

        <div className="todoItem__content">
          {!isEditing ? (
            <>
              <div className="todoItem__title" title={todo.title}>
                {todo.title}
              </div>
              {todo.createdAt ? (
                <div className="todoItem__meta">
                  {new Date(todo.createdAt).toLocaleString()}
                </div>
              ) : null}
            </>
          ) : (
            <form className="todoItem__edit" onSubmit={submitEdit}>
              <input
                className="todoItem__editField"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={busy}
                aria-label="Edit task title"
                autoFocus
              />
              <div className="todoItem__editActions">
                <button className="btn btnPrimary btnSmall" type="submit" disabled={busy}>
                  Save
                </button>
                <button className="btn btnGhost btnSmall" type="button" onClick={cancelEdit} disabled={busy}>
                  Cancel
                </button>
              </div>
              {localError ? <div className="formError">{localError}</div> : null}
            </form>
          )}
        </div>
      </div>

      {!isEditing ? (
        <div className="todoItem__actions">
          <button className="btn btnGhost btnSmall" type="button" onClick={startEdit} disabled={busy}>
            Edit
          </button>
          <button className="btn btnDanger btnSmall" type="button" onClick={() => onDelete(todo)} disabled={busy}>
            Delete
          </button>
        </div>
      ) : null}
    </li>
  );
}
