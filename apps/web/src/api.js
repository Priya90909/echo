let csrf = "";
let refreshing = null;
export async function api(path, options = {}) {
  const method = options.method ?? "GET";
  if (method !== "GET" && !csrf) {
    const response = await fetch("/api/auth/csrf", { credentials: "include" });
    csrf = (await response.json()).token;
  }
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && options.body)
    headers.set("Content-Type", "application/json");
  if (method !== "GET") headers.set("x-csrf-token", csrf);
  let response = await fetch("/api" + path, {
    ...options,
    headers,
    credentials: "include",
  });
  if (
    response.status === 401 &&
    (!path.startsWith("/auth/") || path === "/auth/me")
  ) {
    refreshing ??= api("/auth/refresh", { method: "POST" }).finally(
      () => (refreshing = null),
    );
    await refreshing;
    response = await fetch("/api" + path, {
      ...options,
      headers,
      credentials: "include",
    });
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed (${response.status})`);
  }
  return response.status === 204 ? undefined : response.json();
}
export const json = (value) => JSON.stringify(value);
