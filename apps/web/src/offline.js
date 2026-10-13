async function db() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("echo-personal-music", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("songs", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function request(mode, run) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction("songs", mode);
    const r = run(tx.objectStore("songs"));
    tx.oncomplete = () => {
      database.close();
      resolve(r.result);
    };
    tx.onerror = () => {
      database.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      database.close();
      reject(tx.error);
    };
  });
}
export const savedSongs = () => request("readonly", (s) => s.getAll());
export const savedSong = (id) => request("readonly", (s) => s.get(id));
export const removeSaved = (id) => request("readwrite", (s) => s.delete(id));
export async function importFile(file) {
  const url = URL.createObjectURL(file);
  const media = document.createElement("video");
  media.preload = "metadata";
  media.src = url;
  let duration;
  try {
    duration = await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Could not read this audio file.")),
        15000,
      );
      media.onloadedmetadata = () => {
        clearTimeout(timer);
        Number.isFinite(media.duration) && media.duration > 0
          ? resolve(media.duration)
          : reject(new Error("Invalid audio duration."));
      };
      media.onerror = () => {
        clearTimeout(timer);
        reject(new Error("This file format is not supported by your browser."));
      };
    });
  } finally {
    media.removeAttribute("src");
    media.load();
    URL.revokeObjectURL(url);
  }
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
    ),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
  const id = "local-" + hash;
  const title = file.name.replace(/\.[^.]+$/, "");
  const track = {
    _id: id,
    title,
    artist: { _id: "local", name: "Your local music" },
    genre: "Personal library",
    moods: [],
    duration,
    license: "original",
    attribution:
      "Personal local file. Stored only in this browser; not published to the ECHO catalog.",
    playCount: 0,
    status: "published",
  };
  await request("readwrite", (s) => s.put({ id, track, audio: file }));
  return track;
}
export async function prepareOfflineApp() {
  if (!("serviceWorker" in navigator))
    throw new Error("Offline app caching is unavailable in this browser.");
  await navigator.serviceWorker.register("/offline-sw.js");
  await navigator.serviceWorker.ready;
  const cache = await caches.open("echo-shell-v1");
  const urls = new Set([
    "/",
    "/offline",
    ...performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .filter((u) => {
        const url = new URL(u, location.href);
        return (
          url.origin === location.origin &&
          !url.pathname.startsWith("/api") &&
          !url.pathname.startsWith("/socket.io") &&
          !url.pathname.includes("offline-sw")
        );
      }),
  ]);
  for (const url of urls) {
    const response = await fetch(url);
    if (response.ok) await cache.put(url, response);
  }
  await navigator.storage?.persist?.();
}
