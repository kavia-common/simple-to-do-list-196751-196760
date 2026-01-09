const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Picks an API base URL from the environment. Uses REACT_APP_API_BASE first, then
 * REACT_APP_BACKEND_URL. Falls back to empty string (same-origin) if neither is set.
 */
function getApiBaseUrl() {
  const base =
    (process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL || "").trim();

  // Normalize: remove trailing slashes to avoid double-slash issues when joining paths.
  return base.replace(/\/+$/, "");
}

/**
 * Joins base URL and path safely.
 * @param {string} base
 * @param {string} path
 */
function joinUrl(base, path) {
  const cleanedPath = path.startsWith("/") ? path : `/${path}`;
  if (!base) return cleanedPath;
  return `${base}${cleanedPath}`;
}

/**
 * Attempts common todo API path conventions without requiring backend code changes.
 * You can add more candidates here if your backend uses a different route.
 */
function getTodoPathCandidates() {
  return ["/todos", "/api/todos", "/tasks", "/api/tasks"];
}

/**
 * Low-level request helper with JSON parsing and friendly error messages.
 * @param {string} url
 * @param {RequestInit} init
 */
async function requestJson(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init && init.headers ? init.headers : {}),
      },
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    let body = null;
    if (res.status !== 204) {
      body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);
    }

    if (!res.ok) {
      const message =
        (body && typeof body === "object" && (body.detail || body.message)) ||
        (typeof body === "string" && body) ||
        `Request failed with status ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      err.body = body;
      throw err;
    }

    return body;
  } catch (e) {
    if (e && e.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch wrapper that tries multiple base paths until one succeeds.
 * Primarily used for "list todos" which we can safely probe.
 * @param {(path: string) => Promise<any>} fn
 */
async function tryCandidates(fn) {
  const candidates = getTodoPathCandidates();
  let lastError = null;

  for (const path of candidates) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fn(path);
    } catch (e) {
      lastError = e;
      // Keep trying other candidates on 404; rethrow on auth/5xx to avoid masking real issues.
      if (e && typeof e.status === "number" && e.status !== 404) {
        throw e;
      }
    }
  }

  throw lastError || new Error("Could not reach the to-do API.");
}

/**
 * Normalizes various backend payload shapes into a list of todos.
 * Accepts: array, {items:[]}, {data:[]}
 * @param {any} payload
 * @returns {Array}
 */
function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

/**
 * Tries to normalize a single todo from different response shapes.
 * Accepts: object, {item:{}}, {data:{}}
 * @param {any} payload
 * @returns {any}
 */
function normalizeItem(payload) {
  if (!payload) return payload;
  if (payload && payload.item) return payload.item;
  if (payload && payload.data) return payload.data;
  return payload;
}

// PUBLIC_INTERFACE
export async function listTodos() {
  /** List all todos. */
  const base = getApiBaseUrl();

  return tryCandidates(async (collectionPath) => {
    const url = joinUrl(base, collectionPath);
    const payload = await requestJson(url, { method: "GET" });
    const todos = normalizeList(payload);

    // If we successfully got a list, remember the working path for subsequent calls.
    // Note: we intentionally keep it in module state to avoid global mutable state elsewhere.
    workingCollectionPath = collectionPath;
    return todos;
  });
}

let workingCollectionPath = null;

function getWorkingCollectionPath() {
  return workingCollectionPath || getTodoPathCandidates()[0];
}

// PUBLIC_INTERFACE
export async function createTodo({ title }) {
  /** Create a new todo. */
  const base = getApiBaseUrl();
  const collectionPath = getWorkingCollectionPath();
  const url = joinUrl(base, collectionPath);

  const payload = await requestJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });

  return normalizeItem(payload);
}

// PUBLIC_INTERFACE
export async function updateTodo(id, { title, completed }) {
  /** Replace/update a todo; uses PUT when available. */
  const base = getApiBaseUrl();
  const collectionPath = getWorkingCollectionPath();
  const url = joinUrl(base, `${collectionPath}/${encodeURIComponent(id)}`);

  const payload = await requestJson(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, completed }),
  });

  return normalizeItem(payload);
}

// PUBLIC_INTERFACE
export async function patchTodo(id, patch) {
  /** Patch a todo (used for completion toggle). */
  const base = getApiBaseUrl();
  const collectionPath = getWorkingCollectionPath();
  const url = joinUrl(base, `${collectionPath}/${encodeURIComponent(id)}`);

  const payload = await requestJson(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  return normalizeItem(payload);
}

// PUBLIC_INTERFACE
export async function deleteTodo(id) {
  /** Delete a todo. */
  const base = getApiBaseUrl();
  const collectionPath = getWorkingCollectionPath();
  const url = joinUrl(base, `${collectionPath}/${encodeURIComponent(id)}`);

  await requestJson(url, { method: "DELETE" });
  return true;
}
