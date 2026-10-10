let csrfToken;
async function send(path, options = {}) {
  const method = options.method ?? "GET";
  const headers = { ...options.headers };
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    if (!csrfToken) {
      const response = await fetch("/api/auth/csrf", { credentials: "include" });
      if (!response.ok) throw new Error("Cannot connect to ECHO.");
      csrfToken = (await response.json()).token;
    }
    headers["x-csrf-token"] = csrfToken;
    headers["Content-Type"] = "application/json";
  }
  return fetch("/api" + path, { ...options, headers, credentials: "include" });
}
export async function api(path, options = {}) {
  let response = await send(path, options);
  if (response.status === 401 && path === "/auth/me") {
    const refresh = await send("/auth/refresh", { method: "POST" });
    if (refresh.ok) response = await send(path, options);
  }
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error ?? "Request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}
