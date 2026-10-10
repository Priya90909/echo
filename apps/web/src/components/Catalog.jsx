import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { usePlayer } from "../player.jsx";
export function useData(path) {
  const [state, setState] = useState({ loading: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    api(path, { signal: controller.signal }).then(data => setState({ data, loading: false })).catch(error => {
      if (!controller.signal.aborted) setState({ error, loading: false });
    });
    return () => controller.abort();
  }, [path, retry]);
  return { ...state, retry: () => setRetry(value => value + 1) };
}
export function State({ query, children }) {
  if (query.loading) return <p role="status">Loading music…</p>;
  if (query.error) return <div role="alert"><p>Couldn’t load music.</p><button onClick={query.retry}>Try again</button></div>;
  return children;
}
export function Cards({ tracks = [] }) {
  const player = usePlayer();
  if (!tracks.length) return <p>No songs found.</p>;
  return <div className="song-grid">{tracks.map(track => <article className="song-card" key={track._id}>
    <img src={track.cover ?? "/covers/ambient.svg"} alt={`Artwork for ${track.title}`} loading="lazy" />
    <h3>{track.title}</h3><Link to={`/artists/${track.artist._id}`}>{track.artist.name}</Link>
    <button aria-label={`Play ${track.title}`} onClick={() => player.play(track)}>Play</button>
    <p>{track.genre} · {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, "0")}</p>
    {track.album && <Link to={`/albums/${track.album._id}`}>{track.album.title}</Link>}
  </article>)}</div>;
}
