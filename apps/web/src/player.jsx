import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "./api.js";
const PlayerContext = createContext(null);
export const usePlayer = () => useContext(PlayerContext);
export function PlayerProvider({ children }) {
  const audio = useRef(null), request = useRef(0);
  const listen = useRef(null);
  const startPosition = useRef(0);
  function reportListen() {
    const event = listen.current;
    if (!event || event.sent || event.seconds < Math.min(5, audio.current.duration || 5)) return;
    event.sent = true;
    void api("/events", { method: "POST", body: JSON.stringify({ track: event.track, listenId: event.id, seconds: event.seconds }) }).catch(() => { event.sent = false; });
  }
  function updateProgress() {
    const current = audio.current.currentTime, event = listen.current;
    if (event) { const delta = current - event.previous; if (!audio.current.paused && delta > 0 && delta < 2) event.seconds += delta; event.previous = current; reportListen(); }
    setProgress(current);
  }
  const [track, setTrack] = useState(null), [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0), [duration, setDuration] = useState(0), [volume, setVolume] = useState(.7), [error, setError] = useState("");
  const [queue, setQueue] = useState([]), [index, setIndex] = useState(0), [shuffle, setShuffle] = useState(false), [repeat, setRepeat] = useState("off");
  useEffect(() => { audio.current.volume = volume; }, [volume]);
  useEffect(() => () => { request.current++; audio.current?.pause(); }, []);
  async function play(song, { autoplay = true, startAt = 0 } = {}) {
    reportListen();
    listen.current = { track: song._id, id: crypto.randomUUID(), seconds: 0, previous: 0, sent: false };
    const version = ++request.current;
    startPosition.current = startAt;
    audio.current.pause(); setPlaying(false); setProgress(0); setDuration(0); setTrack(song); setError("");
    try {
      const media = await api(`/tracks/${song._id}/playback`);
      if (version !== request.current) return;
      audio.current.src = media.url;
      if (autoplay) await audio.current.play();
      else audio.current.load();
    } catch (failure) { if (version === request.current) setError(failure.message || "Couldn’t play this song."); }
  }
  function playQueue(songs, selected = 0) {
    if (!songs.length || !songs[selected]) return;
    setQueue(songs); setIndex(selected); void play(songs[selected]);
  }
  function move(direction, ended = false) {
    if (!queue.length) return;
    if (ended && repeat === "one") { audio.current.currentTime = 0; void audio.current.play().catch(() => setError("Couldn’t repeat this song.")); return; }
    if (direction < 0 && audio.current.currentTime > 3) { seek(0); return; }
    let target = shuffle && queue.length > 1 ? (index + 1 + Math.floor(Math.random() * (queue.length - 1))) % queue.length : index + direction;
    if (target >= queue.length || target < 0) {
      if (repeat !== "all") { if (ended) setPlaying(false); return; }
      target = (target + queue.length) % queue.length;
    }
    setIndex(target); void play(queue[target]);
  }
  function toggle() {
    if (audio.current.paused) { setError(""); audio.current.play().catch(() => setError("Couldn’t resume playback. Choose the song again.")); }
    else audio.current.pause();
  }
  function seek(value) { if (Number.isFinite(audio.current.duration)) { audio.current.currentTime = value; if (listen.current) listen.current.previous = value; setProgress(value); } }
  async function sync(song, position, shouldPlay) {
    if (track?._id !== song._id) { setQueue([song]); setIndex(0); await play(song, { autoplay: shouldPlay, startAt: position }); return; }
    if (Math.abs(audio.current.currentTime - position) > 1.5) seek(position);
    if (!shouldPlay) audio.current.pause();
    else if (audio.current.paused) { try { await audio.current.play(); setError(""); } catch { setError("Press Play to allow shared music in this browser."); } }
  }
  return <PlayerContext.Provider value={{ track, playing, progress, duration, volume, error, play, sync, toggle, seek, setVolume, queue, index, shuffle, repeat, playQueue, next: () => move(1), previous: () => move(-1), select: selected => playQueue(queue, selected), toggleShuffle: () => setShuffle(value => !value), cycleRepeat: () => setRepeat(value => value === "off" ? "all" : value === "all" ? "one" : "off") }}>
    {children}<audio ref={audio} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => { setPlaying(false); reportListen(); }} onTimeUpdate={updateProgress} onLoadedMetadata={() => { setDuration(Number.isFinite(audio.current.duration) ? audio.current.duration : 0); if (startPosition.current) { seek(Math.min(startPosition.current, audio.current.duration)); startPosition.current = 0; } }} onEnded={() => { reportListen(); move(1, true); }} onError={() => { setPlaying(false); setError("This audio file could not be loaded. Try another song."); }} />
  </PlayerContext.Provider>;
}
