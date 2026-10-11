import { useState } from "react";
import { Heart, ListPlus } from "lucide-react";
import { useLibrary } from "../library.jsx";
import { api } from "../api.js";
export function SongLike({ track }) {
  const library = useLibrary(), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const liked = library.likes.some(song => song._id === track?._id);
  return <span><button className="song-heart" aria-label={`${liked ? "Unlike" : "Like"} ${track?.title ?? "current song"}`} aria-pressed={liked} disabled={!track || busy} onClick={async () => { setBusy(true); setError(""); try { await library.mutate(`/likes/${track._id}`, { method: liked ? "DELETE" : "PUT" }); } catch (failure) { setError(failure.message); } finally { setBusy(false); } }}><Heart size={22} fill={liked ? "currentColor" : "none"} /></button>{error && <small role="alert">{error}</small>}</span>;
}
export function SongPlaylist({ track }) {
  const library = useLibrary(), [open, setOpen] = useState(false), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  return <div className="song-playlists"><button aria-label="Add to playlist" aria-expanded={open} disabled={!track} onClick={() => setOpen(!open)}><ListPlus size={22} /></button>{open && <div className="playlist-picker"><strong>Add to playlist</strong>{!library.signedIn && <p>Sign in to save music.</p>}{library.signedIn && !library.playlists.length && <p>Create a playlist in Your library first.</p>}{library.playlists.map(list => <button key={list._id} disabled={busy} onClick={async () => { setBusy(true); try { const current = await api(`/playlists/${list._id}`); await library.mutate(`/playlists/${list._id}/tracks`, { method: "PUT", body: JSON.stringify({ tracks: [...new Set([...current.tracks.map(song => song._id), track._id])] }) }); setMessage(`Added to ${list.name}.`); setOpen(false); } catch (failure) { setMessage(failure.message); } finally { setBusy(false); } }}>{list.name}</button>)}</div>}{message && <small role="status">{message}</small>}</div>;
}
