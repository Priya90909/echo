const SHELL = "echo-shell-v2-account";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("echo-shell-") && name !== SHELL)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/socket.io")
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(SHELL);
      try {
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      } catch {
        const response = await cache.match(event.request);
        if (response) return response;
        if (event.request.mode === "navigate") {
          const shell = await cache.match("/offline");
          if (shell) return shell;
        }
        return Response.error();
      }
    })(),
  );
});
