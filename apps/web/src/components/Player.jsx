import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, ListMusic, Maximize2 } from "lucide-react";
import { useState } from "react";
import FullPlayer from "./FullPlayer.jsx";
import { usePlayer } from "../player.jsx";
export const time = value => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
export default function Player() {
  const state = usePlayer();
  const [queueOpen, setQueueOpen] = useState(false), [fullOpen, setFullOpen] = useState(false);
  return <><footer className="music-player"><button aria-label="Open full-screen player" onClick={() => setFullOpen(true)}><Maximize2 size={18} /></button><div><strong>{state.track?.title ?? "Choose your frequency"}</strong><small>{state.track?.artist.name}</small>{state.error && <p role="alert">{state.error}</p>}</div>
    <button aria-label="Shuffle" aria-pressed={state.shuffle} onClick={state.toggleShuffle}><Shuffle size={18} /></button>
    <button aria-label="Previous track" disabled={!state.track} onClick={state.previous}><SkipBack size={18} /></button>
    <button aria-label={state.playing ? "Pause" : "Play"} disabled={!state.track} onClick={state.toggle}>{state.playing ? <Pause /> : <Play />}</button>
    <button aria-label="Next track" disabled={!state.track} onClick={state.next}><SkipForward size={18} /></button>
    <button aria-label={`Repeat ${state.repeat}`} aria-pressed={state.repeat !== "off"} onClick={state.cycleRepeat}><Repeat size={18} />{state.repeat === "one" && "1"}</button>
    <label className="player-seek">{time(state.progress)}<input aria-label="Playback position" type="range" min="0" max={state.duration || 1} step=".1" value={state.progress} onChange={event => state.seek(Number(event.target.value))} />{time(state.duration)}</label>
    <input aria-label="Volume" type="range" min="0" max="1" step=".01" value={state.volume} onChange={event => state.setVolume(Number(event.target.value))} />
    <button aria-label="Show queue" aria-expanded={queueOpen} onClick={() => setQueueOpen(!queueOpen)}><ListMusic size={18} /></button>
  </footer>{queueOpen && <aside className="queue-panel" aria-label="Play queue"><h2>Up next</h2><button onClick={() => setQueueOpen(false)}>Close queue</button>{state.queue.length ? state.queue.map((song, selected) => <button key={song._id} aria-current={selected === state.index ? "true" : undefined} onClick={() => state.select(selected)}>{song.title}</button>) : <p>Choose a song to start a queue.</p>}</aside>}{fullOpen && <FullPlayer close={() => setFullOpen(false)} />}</>;
}
