const BASE = "/api";

type Tokens = { access: string; refresh: string; user: User };
export type User = {
  id: number;
  username: string;
  email: string;
  display_name: string;
  role: "user" | "creator";
  avatar_url: string;
};

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

function readTokens(): Tokens | null {
  try {
    return JSON.parse(localStorage.getItem("auth") || "null") as Tokens;
  } catch {
    return null;
  }
}

export function saveAuth(data: Tokens) {
  localStorage.setItem("auth", JSON.stringify(data));
}

export function clearAuth() {
  localStorage.removeItem("auth");
}

export function currentUser(): User | null {
  return readTokens()?.user ?? null;
}

async function refreshAccessToken(): Promise<boolean> {
  const t = readTokens();
  if (!t?.refresh) return false;
  const resp = await fetch(`${BASE}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: t.refresh }),
  });
  if (!resp.ok) return false;
  const data = await resp.json();
  saveAuth({ ...t, access: data.access });
  return true;
}

export async function api(
  path: string,
  opts: { method?: string; body?: unknown } = {}
): Promise<any> {
  const t = readTokens();
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (t?.access) headers["Authorization"] = `Bearer ${t.access}`;

  let resp = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (resp.status === 401 && t?.refresh && path !== "/auth/refresh/") {
    if (await refreshAccessToken()) {
      const fresh = readTokens();
      if (fresh?.access) headers["Authorization"] = `Bearer ${fresh.access}`;
      resp = await fetch(`${BASE}${path}`, {
        method: opts.method ?? "GET",
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    }
  }

  if (resp.status === 401 && path !== "/auth/refresh/") {
    clearAuth();
    onUnauthorized?.();
  }

  const text = await resp.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!resp.ok) {
    const detail =
      data?.detail ||
      Object.values(data || {})
        .flat()
        .join(" ") ||
      `Request failed (${resp.status})`;
    throw new Error(detail);
  }
  return data;
}
