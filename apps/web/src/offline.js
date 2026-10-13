import { offlineAccount } from "./offline-account.js";
function ownerId() {
  const owner = offlineAccount()?._id;
  if (!owner) throw new Error("Sign in to use your offline music library.");
  return owner;
}
function verifyOwner(owner) {
  if (owner !== offlineAccount()?._id)
    throw new Error("Your account changed. Please try again.");
}
async function db() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("echo-personal-music", 2);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains("accountSongs")) {
        const store = r.result.createObjectStore("accountSongs", {
          keyPath: ["owner", "id"],
        });
        store.createIndex("owner", "owner");
      }
      // Unowned legacy files stay stored, but cannot be assigned to an arbitrary account.
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function request(mode, run) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction("accountSongs", mode);
    let r;
    try {
      r = run(tx.objectStore("accountSongs"));
    } catch (error) {
      tx.abort();
      database.close();
      reject(error);
      return;
    }
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
export async function savedSongs() {
  if (!offlineAccount()) return [];
  const owner = ownerId();
  const songs = await request("readonly", (s) =>
    s.index("owner").getAll(IDBKeyRange.only(owner)),
  );
  verifyOwner(owner);
  return songs;
}
export async function savedSong(id) {
  const owner = ownerId();
  const song = await request("readonly", (s) => s.get([owner, id]));
  verifyOwner(owner);
  return song;
}
export async function removeSaved(id) {
  const owner = ownerId();
  return request("readwrite", (s) => {
    verifyOwner(owner);
    return s.delete([owner, id]);
  });
}
export async function saveOfflineAudio(track, audio, owner = ownerId()) {
  verifyOwner(owner);
  const ownedTrack = { ...track, offlineOwner: owner };
  await request("readwrite", (s) => {
    verifyOwner(owner);
    return s.put({ owner, id: track._id, track: ownedTrack, audio });
  });
  verifyOwner(owner);
  return ownedTrack;
}
export async function importFile(file) {
  const owner = ownerId();
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
  return saveOfflineAudio(track, file, owner);
}
export async function prepareOfflineApp() {
  if (!("serviceWorker" in navigator))
    throw new Error("Offline app caching is unavailable in this browser.");
  await navigator.serviceWorker.register("/offline-sw.js", {
    updateViaCache: "none",
  });
  await navigator.serviceWorker.ready;
  const cache = await caches.open("echo-shell-v2-account");
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
