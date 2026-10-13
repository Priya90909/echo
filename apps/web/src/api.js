let csrf = "";
let csrfRequest = null;
let refreshing = null;
async function csrfToken(renew = false) {
  if (renew) csrf = "";
  if (csrf) return csrf;
  csrfRequest ??= (async () => {
    const response = await fetch("/api/auth/csrf", {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error("Could not verify your session. Please try again.");
    const data = await response.json();
    if (typeof data.token !== "string" || !/^[a-f\d]{64}$/.test(data.token))
      throw new Error(
        "Could not verify your session. Please refresh the page.",
      );
    csrf = data.token;
    return csrf;
  })().finally(() => {
    csrfRequest = null;
  });
  return csrfRequest;
}
export async function api(path, options = {}) {
  const method = options.method ?? "GET";
  const mutation = !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
  if (mutation) await csrfToken();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && options.body)
    headers.set("Content-Type", "application/json");
  if (mutation) headers.set("x-csrf-token", csrf);
  const send = () =>
    fetch("/api" + path, {
      ...options,
      headers,
      credentials: "include",
    });
  let response = await send();
  if (mutation && response.status === 403) {
    const rejected = await response
      .clone()
      .json()
      .catch(() => ({}));
    if (rejected.code === "CSRF_INVALID") {
      await csrfToken(true);
      headers.set("x-csrf-token", csrf);
      response = await send();
    }
  }
  if (
    response.status === 401 &&
    (!path.startsWith("/auth/") || path === "/auth/me")
  ) {
    refreshing ??= api("/auth/refresh", { method: "POST" }).finally(
      () => (refreshing = null),
    );
    await refreshing;
    if (mutation) headers.set("x-csrf-token", csrf);
    response = await send();
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const failure = new Error(
      data.error ?? `Request failed (${response.status})`,
    );
    failure.status = response.status;
    throw failure;
  }
  return response.status === 204 ? undefined : response.json();
}
export const json = (value) => JSON.stringify(value);
