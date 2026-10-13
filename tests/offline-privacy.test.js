// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeAll, beforeEach, afterEach, it, expect, vi } from "vitest";
import { rememberAccount } from "../apps/web/src/offline-account.js";
import {
  savedSongs,
  savedSong,
  saveOfflineAudio,
  removeSaved,
} from "../apps/web/src/offline.js";
vi.mock("../apps/web/src/api.js", () => ({
  api: vi.fn(),
  json: JSON.stringify,
}));
import { usePlayer } from "../apps/web/src/player.js";
const alice = { _id: "account-a", name: "Alice" },
  bob = { _id: "account-b", name: "Bob" };
const track = {
  _id: "local-test",
  title: "Alice's file",
  artist: { _id: "local", name: "Local music" },
  duration: 30,
};
beforeAll(async () => {
  await new Promise((ok, no) => {
    const request = indexedDB.open("echo-personal-music", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("songs", { keyPath: "id" });
    request.onerror = () => no(request.error);
    request.onsuccess = () => {
      const db = request.result,
        tx = db.transaction("songs", "readwrite");
      tx.objectStore("songs").put({
        id: "local-legacy",
        track: { title: "Legacy private file" },
        audio: new Blob(["old"]),
      });
      tx.oncomplete = () => {
        db.close();
        ok();
      };
    };
  });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
});
beforeEach(() => rememberAccount(alice));
afterEach(async () => {
  rememberAccount(null);
  await new Promise((ok, no) => {
    const request = indexedDB.open("echo-personal-music", 2);
    request.onerror = () => no(request.error);
    request.onsuccess = () => {
      const db = request.result,
        tx = db.transaction("accountSongs", "readwrite");
      tx.objectStore("accountSongs").clear();
      tx.oncomplete = () => {
        db.close();
        ok();
      };
    };
  });
});
it("separates lists, reads and deletes for different accounts", async () => {
  await saveOfflineAudio(track, new Blob(["alice"]));
  rememberAccount(bob);
  expect(await savedSongs()).toEqual([]);
  expect(await savedSong(track._id)).toBeUndefined();
  await removeSaved(track._id);
  rememberAccount(alice);
  expect((await savedSong(track._id)).track.title).toBe(track.title);
});
it("deduplicates within one account without overwriting another account's copy", async () => {
  await saveOfflineAudio(track, new Blob(["alice"]));
  await saveOfflineAudio(track, new Blob(["alice"]));
  expect(await savedSongs()).toHaveLength(1);
  rememberAccount(bob);
  await saveOfflineAudio({ ...track, title: "Bob's file" }, new Blob(["bob"]));
  expect((await savedSong(track._id)).track.title).toBe("Bob's file");
  await removeSaved(track._id);
  expect(await savedSongs()).toEqual([]);
  rememberAccount(alice);
  expect((await savedSong(track._id)).track.title).toBe(track.title);
});
it("does not expose unowned legacy files during migration", async () => {
  expect(await savedSongs()).toEqual([]);
  expect(await savedSong("local-legacy")).toBeUndefined();
  rememberAccount(bob);
  expect(await savedSongs()).toEqual([]);
});
it("blocks signed-out reads and writes", async () => {
  await saveOfflineAudio(track, new Blob(["alice"]));
  rememberAccount(null);
  expect(await savedSongs()).toEqual([]);
  await expect(savedSong(track._id)).rejects.toThrow("Sign in");
  await expect(saveOfflineAudio(track, new Blob(["new"]))).rejects.toThrow(
    "Sign in",
  );
});
it("stops local playback when accounts switch and rejects the previous account's queue", async () => {
  const song = await saveOfflineAudio(track, new Blob(["alice"]));
  await usePlayer.getState().play([song]);
  expect(usePlayer.getState().playing).toBe(true);
  rememberAccount(bob);
  expect(usePlayer.getState().track).toBeNull();
  expect(usePlayer.getState().playing).toBe(false);
  await usePlayer.getState().play([song]);
  expect(usePlayer.getState().playing).toBe(false);
  expect(usePlayer.getState().error).toContain("different account");
});
