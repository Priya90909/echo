import { create } from "zustand";
import { api, json } from "./api.js";
import { savedSong } from "./offline.js";
let localUrl = "";
const audio = new Audio();
audio.preload = "metadata";
let request = 0,
  playbackId = "",
  started = false;
const event = (kind) => {
  const track = usePlayer.getState().track;
  if (track && !track._id.startsWith("local-"))
    void api("/events", {
      method: "POST",
      body: json({ track: track._id, playbackId, kind }),
    }).catch(() => {});
};
export const usePlayer = create((set, get) => ({
  reset: () => {
    request++;
    audio.pause();
    audio.removeAttribute("src");
    set({
      track: null,
      queue: [],
      index: 0,
      progress: 0,
      duration: 0,
      playing: false,
      loading: false,
      error: "",
      roomActive: false,
    });
  },
  track: null,
  queue: [],
  index: 0,
  playing: false,
  loading: false,
  error: "",
  progress: 0,
  duration: 0,
  volume: 0.7,
  repeat: "off",
  shuffle: false,
  roomActive: false,
  play: async (queue, index = 0) => {
    const track = queue[index];
    if (!track) return;
    const token = ++request;
    audio.pause();
    set({
      queue,
      index,
      track,
      playing: false,
      loading: true,
      error: "",
      progress: 0,
    });
    try {
      const local = track._id.startsWith("local-")
        ? await savedSong(track._id)
        : undefined;
      const { url } = local
        ? { url: URL.createObjectURL(local.audio) }
        : await api(`/tracks/${track._id}/playback`);
      if (token !== request) return;
      if (localUrl) URL.revokeObjectURL(localUrl);
      localUrl = local ? url : "";
      audio.src = url;
      audio.volume = get().volume;
      playbackId = crypto.randomUUID();
      started = false;
      await audio.play();
      if (token !== request) return;
      set({ playing: true, loading: false });
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist.name,
          album: track.album?.title ?? "ECHO Demo Lab",
        });
      }
    } catch (e) {
      if (token === request)
        set({
          playing: false,
          loading: false,
          error: e instanceof Error ? e.message : "Playback failed.",
        });
    }
  },
  toggle: () => {
    if (!get().track) return;
    if (audio.paused)
      void audio.play().catch(() =>
        set({
          error:
            "Playback unavailable. Select the track again to renew its URL.",
        }),
      );
    else audio.pause();
  },
  next: () => {
    const s = get();
    const next =
      s.shuffle && s.queue.length > 1
        ? (s.index + 1 + Math.floor(Math.random() * (s.queue.length - 1))) %
          s.queue.length
        : (s.index + 1) % s.queue.length;
    void s.play(s.queue, next);
  },
  previous: () => {
    const s = get();
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    void s.play(s.queue, (s.index - 1 + s.queue.length) % s.queue.length);
  },
  seek: (n) => {
    if (Number.isFinite(audio.duration))
      audio.currentTime = Math.max(0, Math.min(n, audio.duration));
  },
  setVolume: (n) => {
    audio.volume = n;
    set({ volume: n });
  },
  setRepeat: () =>
    set({
      repeat:
        get().repeat === "off" ? "all" : get().repeat === "all" ? "one" : "off",
    }),
  setShuffle: () => set({ shuffle: !get().shuffle }),
}));
audio.addEventListener("timeupdate", () => {
  usePlayer.setState({ progress: audio.currentTime });
  if (!started && audio.currentTime >= Math.min(10, audio.duration / 2)) {
    started = true;
    event("started");
  }
});
audio.addEventListener("loadedmetadata", () =>
  usePlayer.setState({ duration: audio.duration, loading: false }),
);
audio.addEventListener("waiting", () => usePlayer.setState({ loading: true }));
audio.addEventListener("playing", () =>
  usePlayer.setState({ loading: false, playing: true }),
);
audio.addEventListener("pause", () => usePlayer.setState({ playing: false }));
audio.addEventListener("error", () =>
  usePlayer.setState({
    error: "Audio could not load. Select the track again to retry.",
    loading: false,
    playing: false,
  }),
);
audio.addEventListener("ended", () => {
  window.dispatchEvent(new CustomEvent("echo:ended"));
  event("completed");
  const s = usePlayer.getState();
  if (s.roomActive) {
    usePlayer.setState({ playing: false });
    return;
  }
  if (s.repeat === "one") {
    playbackId = crypto.randomUUID();
    started = false;
    audio.currentTime = 0;
    void audio.play();
  } else if (s.index < s.queue.length - 1 || s.repeat === "all" || s.shuffle)
    s.next();
  else usePlayer.setState({ playing: false });
});
if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("play", () => {
    if (audio.paused) usePlayer.getState().toggle();
  });
  navigator.mediaSession.setActionHandler("pause", () => audio.pause());
  navigator.mediaSession.setActionHandler("nexttrack", () =>
    usePlayer.getState().next(),
  );
  navigator.mediaSession.setActionHandler("previoustrack", () =>
    usePlayer.getState().previous(),
  );
}
window.addEventListener("keydown", (e) => {
  if (e.target?.closest("input,textarea,select,button,[contenteditable]"))
    return;
  if (e.code === "Space") {
    e.preventDefault();
    usePlayer.getState().toggle();
  }
  if (e.code === "ArrowRight") usePlayer.getState().seek(audio.currentTime + 5);
  if (e.code === "ArrowLeft") usePlayer.getState().seek(audio.currentTime - 5);
});
