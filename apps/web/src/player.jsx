import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "./api.js";
const PlayerContext = createContext(null);
export const usePlayer = () => useContext(PlayerContext);
export function PlayerProvider({ children }) {
  const audio = useRef(null), request = useRef(0);
  const [track, setTrack] = useState(null), [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0), [duration, setDuration] = useState(0), [volume, setVolume] = useState(.7), [error, setError] = useState("");
  useEffect(() => { audio.current.volume = volume; }, [volume]);
  useEffect(() => () => { request.current++; audio.current?.pause(); }, []);
  async function play(song) {
    const version = ++request.current;
    audio.current.pause(); setPlaying(false); setProgress(0); setDuration(0); setTrack(song); setError("");
    try {
      const media = await api(`/tracks/${song._id}/playback`);
      if (version !== request.current) return;
      audio.current.src = media.url;
      await audio.current.play();
    } catch (failure) { if (version === request.current) setError(failure.message || "Couldn’t play this song."); }
  }
  function toggle() {
    if (audio.current.paused) { setError(""); audio.current.play().catch(() => setError("Couldn’t resume playback. Choose the song again.")); }
    else audio.current.pause();
  }
  function seek(value) { if (Number.isFinite(audio.current.duration)) { audio.current.currentTime = value; setProgress(value); } }
  return <PlayerContext.Provider value={{ track, playing, progress, duration, volume, error, play, toggle, seek, setVolume }}>
    {children}<audio ref={audio} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={() => setProgress(audio.current.currentTime)} onLoadedMetadata={() => setDuration(Number.isFinite(audio.current.duration) ? audio.current.duration : 0)} onEnded={() => setPlaying(false)} onError={() => { setPlaying(false); setError("This audio file could not be loaded. Try another song."); }} />
  </PlayerContext.Provider>;
}
