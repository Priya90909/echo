import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLibrary } from "../library.jsx";
import { Cards, State, useData } from "../components/Catalog.jsx";
export function Likes() { const library = useLibrary(); return <section className="page-content"><h1>The ones you love.</h1>{library.error && <p role="alert">{library.error}</p>}<Cards tracks={library.likes} /></section>; }
export default function Library() {
  const library = useLibrary(), [name, setName] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  return <section className="page-content"><h1>Your library</h1><form onSubmit={async event => { event.preventDefault(); setBusy(true); setError(""); try { await library.mutate("/playlists", { method: "POST", body: JSON.stringify({ name }) }); setName(""); } catch (failure) { setError(failure.message); } finally { setBusy(false); } }}><input aria-label="Playlist name" value={name} onChange={event => setName(event.target.value)} required maxLength={80} /><button disabled={busy}>Create playlist</button></form>{error && <p role="alert">{error}</p>}{library.error && <p role="alert">{library.error}</p>}{library.playlists.map(list => <p key={list._id}><Link to={`/playlists/${list._id}`}>{list.name}</Link></p>)}</section>;
}
export function Playlist() { const { id } = useParams(); const query = useData(`/playlists/${id}`); return <section className="page-content"><State query={query}><h1>{query.data?.playlist.name}</h1><Cards tracks={query.data?.tracks} /></State></section>; }
