import { Play, Pause } from "lucide-react";
import { usePlayer } from "../player.jsx";
export const time = value => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
export default function Player() {
  const state = usePlayer();
  return <footer className="music-player"><div><strong>{state.track?.title ?? "Choose your frequency"}</strong><small>{state.track?.artist.name}</small>{state.error && <p role="alert">{state.error}</p>}</div>
    <button aria-label={state.playing ? "Pause" : "Play"} disabled={!state.track} onClick={state.toggle}>{state.playing ? <Pause /> : <Play />}</button>
    <label className="player-seek">{time(state.progress)}<input aria-label="Playback position" type="range" min="0" max={state.duration || 1} step=".1" value={state.progress} onChange={event => state.seek(Number(event.target.value))} />{time(state.duration)}</label>
    <input aria-label="Volume" type="range" min="0" max="1" step=".01" value={state.volume} onChange={event => state.setVolume(Number(event.target.value))} />
  </footer>;
}
