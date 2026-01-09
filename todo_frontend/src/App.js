import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import TodoInput from "./components/TodoInput";
import TodoList from "./components/TodoList";
import { createTodo, deleteTodo, listTodos, patchTodo, updateTodo } from "./services/todoApi";

/**
 * Ensures the todo has the fields we expect.
 * @param {any} t
 */
function normalizeTodo(t) {
  if (!t) return t;
  return {
    id: t.id ?? t._id ?? t.uuid,
    title: t.title ?? t.name ?? "",
    completed: Boolean(t.completed ?? t.isCompleted ?? false),
    createdAt: t.createdAt ?? t.created_at ?? t.created ?? null,
  };
}

/**
 * Sort most recent first if createdAt exists, otherwise keep stable order.
 * @param {Array<any>} todos
 */
function sortTodos(todos) {
  const hasCreatedAt = todos.some((t) => t.createdAt);
  if (!hasCreatedAt) return todos;

  return [...todos].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });
}

// PUBLIC_INTERFACE
export default function App() {
  /** Main to-do app UI. */
  const [todos, setTodos] = useState([]);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [initialLoading, setInitialLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const completedCount = useMemo(
    () => todos.filter((t) => t.completed).length,
    [todos]
  );

  const sortedTodos = useMemo(() => sortTodos(todos), [todos]);

  async function refresh() {
    setError("");
    setInitialLoading(true);
    try {
      const data = await listTodos();
      const normalized = (data || []).map(normalizeTodo).filter((t) => t && t.id != null);
      setTodos(normalized);
    } catch (e) {
      setError(e?.message || "Failed to load tasks.");
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function markBusy(id, isBusy) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (isBusy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleAdd(title) {
    setError("");
    setCreating(true);
    try {
      const created = normalizeTodo(await createTodo({ title }));
      if (!created || created.id == null) {
        // If backend returns no entity, fall back to a refresh.
        await refresh();
        return;
      }
      setTodos((prev) => [created, ...prev]);
    } catch (e) {
      setError(e?.message || "Failed to add task.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(todo) {
    setError("");
    const id = todo.id;
    markBusy(id, true);

    // Optimistic remove (with rollback)
    const snapshot = todos;
    setTodos((prev) => prev.filter((t) => t.id !== id));

    try {
      await deleteTodo(id);
    } catch (e) {
      setTodos(snapshot);
      setError(e?.message || "Failed to delete task.");
    } finally {
      markBusy(id, false);
    }
  }

  async function handleSaveTitle(todo, title) {
    setError("");
    const id = todo.id;
    markBusy(id, true);

    const snapshot = todos;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));

    try {
      // Prefer PUT for title edits; fallback to refresh if backend doesn't return an item.
      const updated = await updateTodo(id, { title, completed: todo.completed });
      const normalized = normalizeTodo(updated);
      if (normalized && normalized.id != null) {
        setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...normalized } : t)));
      }
    } catch (e) {
      setTodos(snapshot);
      setError(e?.message || "Failed to update task.");
    } finally {
      markBusy(id, false);
    }
  }

  async function handleToggle(todo) {
    setError("");
    const id = todo.id;
    const nextCompleted = !todo.completed;

    // Optimistic toggle
    const snapshot = todos;
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: nextCompleted } : t))
    );

    markBusy(id, true);
    try {
      // PATCH only the completed field for fast toggles.
      const updated = await patchTodo(id, { completed: nextCompleted });
      const normalized = normalizeTodo(updated);

      // Some backends return nothing or minimal data. If we got a proper item, merge it.
      if (normalized && normalized.id != null) {
        setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...normalized } : t)));
      }
    } catch (e) {
      // Roll back if API fails
      setTodos(snapshot);
      setError(e?.message || "Failed to update completion.");
    } finally {
      markBusy(id, false);
    }
  }

  return (
    <div className="App">
      <main className="page">
        <header className="pageHeader">
          <div>
            <h1 className="pageTitle">To‑Do</h1>
            <p className="pageSubtitle">
              {completedCount}/{todos.length} completed
            </p>
          </div>

          <button className="btn btnGhost" type="button" onClick={refresh} disabled={initialLoading || creating}>
            Refresh
          </button>
        </header>

        <section className="card">
          <TodoInput onAdd={handleAdd} disabled={creating || initialLoading} />
        </section>

        <section className="card cardList">
          <TodoList
            todos={sortedTodos}
            loading={initialLoading}
            error={error}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onSaveTitle={handleSaveTitle}
            busyIds={busyIds}
          />
        </section>

        <footer className="pageFooter">
          <span className="footerHint">
            API base:{" "}
            <code className="inlineCode">
              {(process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL || "(not set)").trim()}
            </code>
          </span>
        </footer>
      </main>
    </div>
  );
}
