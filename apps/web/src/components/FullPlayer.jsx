import { useEffect, useRef } from "react";
import { Play, Pause, SkipBack, SkipForward, X } from "lucide-react";
import { usePlayer } from "../player.jsx";
import { SongLike, SongPlaylist } from "./SongActions.jsx";
export default function FullPlayer({ close }) {
  const dialog = useRef(null), state = usePlayer();
  useEffect(() => { const element = dialog.current; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={dialog} className="expanded-player" aria-label="Full-screen music player" onCancel={close}>
    <header><span>YOUR CURRENT FREQUENCY</span><div className="full-actions"><SongPlaylist track={state.track} /><button aria-label="Close full-screen player" onClick={close}><X /></button></div></header>
    {state.track?.cover && <img src={state.track.cover} alt="Current song artwork" />}
    <div className="full-song"><h1>{state.track?.title ?? "Choose your frequency"}</h1><SongLike track={state.track} /></div><p>{state.track?.artist.name}</p>
    {state.error && <p role="alert">{state.error}</p>}
    <input aria-label="Full-screen playback position" type="range" min="0" max={state.duration || 1} step=".1" value={state.progress} onChange={event => state.seek(Number(event.target.value))} />
    <div><button aria-label="Previous" onClick={state.previous}><SkipBack /></button><button aria-label={state.playing ? "Pause playback" : "Start playback"} disabled={!state.track} onClick={state.toggle}>{state.playing ? <Pause /> : <Play />}</button><button aria-label="Next" onClick={state.next}><SkipForward /></button></div>
    <input aria-label="Full-screen volume" type="range" min="0" max="1" step=".01" value={state.volume} onChange={event => state.setVolume(Number(event.target.value))} />
  </dialog>;
}
