import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Plus, Music2 } from "lucide-react";
import { api, json } from "../api.js";
import { useData, State } from "../components/Catalog.jsx";
export default function Library() {
  const data = useData("/playlists"),
    follows = useData("/follows");
  const qc = useQueryClient();
  const [name, setName] = useState(""),
    [error, setError] = useState("");
  return (
    <main className="page">
      <span className="eyebrow">MAKE IT YOURS</span>
      <h1>Your library.</h1>
      <form
        className="inline-form"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api("/playlists", {
              method: "POST",
              body: json({ name, visibility: "private" }),
            });
            setName("");
            await qc.invalidateQueries({ queryKey: ["/playlists"] });
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        <input
          aria-label="New playlist name"
          placeholder="Name your new playlist"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
        />
        <button className="primary">
          <Plus size={18} /> Create playlist
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <State query={data}>
        <div className="collection-list">
          {data.data?.map((p) => (
            <Link key={p._id} to={`/playlists/${p._id}`}>
              <Music2 />
              <strong>{p.name}</strong>
              <small>{p.visibility}</small>
              <ArrowUpRight />
            </Link>
          ))}
        </div>
        {data.data?.length === 0 && (
          <p>Your first playlist is one good idea away.</p>
        )}
      </State>
      <h2>Following</h2>
      <State query={follows}>
        <div className="collection-list">
          {follows.data?.map(
            (f) =>
              f.artist && (
                <Link key={f._id} to={`/artists/${f.artist._id}`}>
                  {f.artist.name} →
                </Link>
              ),
          )}
        </div>
      </State>
    </main>
  );
}
