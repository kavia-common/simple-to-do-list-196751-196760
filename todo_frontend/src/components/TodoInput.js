import React, { useMemo, useState } from "react";

/**
 * @typedef {{ onAdd: (title: string) => Promise<void> | void, disabled?: boolean }} Props
 */

// PUBLIC_INTERFACE
export default function TodoInput({ onAdd, disabled = false }) {
  /** Input + submit row for creating new tasks. */
  const [title, setTitle] = useState("");
  const [localError, setLocalError] = useState("");

  const trimmed = useMemo(() => title.trim(), [title]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");

    if (!trimmed) {
      setLocalError("Please enter a task.");
      return;
    }
    if (trimmed.length > 200) {
      setLocalError("Task is too long (max 200 characters).");
      return;
    }

    await onAdd(trimmed);
    setTitle("");
  }

  return (
    <form className="todoInput" onSubmit={handleSubmit} aria-label="Add a new task">
      <div className="todoInput__row">
        <input
          className="todoInput__field"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          disabled={disabled}
          aria-label="Task title"
          maxLength={220}
        />
        <button className="btn btnPrimary" type="submit" disabled={disabled}>
          Add
        </button>
      </div>

      {localError ? <div className="formError">{localError}</div> : null}
    </form>
  );
}
