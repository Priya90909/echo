import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { api, json } from "../api.js";
import { usePlayer } from "../player.js";
import { useData, State, Art, Tracks } from "../components/Catalog.jsx";
export default function Detail({ kind, user }) {
  const { id } = useParams();
  const data = useData(`/${kind}/${id}`);
  const qc = useQueryClient();
  const p = usePlayer();
  const follows = useData("/follows");
  const [error, setError] = useState("");
  const entity = data.data?.[kind.slice(0, -1)];
  const owner = String(entity?.owner) === user?._id;
  const following = follows.data?.some((f) => f.artist?._id === id);
  async function action(fn) {
    try {
      setError("");
      await fn();
      await qc.invalidateQueries();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <main className="page">
      <State query={data}>
        <div className="detail-head">
          <Art large src={entity?.cover} />
          <div>
            <span className="eyebrow">{kind.slice(0, -1)}</span>
            <h1>{entity?.name ?? entity?.title}</h1>
            <p>
              {entity?.bio ??
                entity?.description ??
                `${data.data?.tracks.length ?? 0} tracks · ${entity?.visibility ?? "Independent sound"}`}
            </p>
            <button
              className="primary"
              disabled={!data.data?.tracks.length}
              onClick={() => void p.play(data.data.tracks)}
            >
              <Play size={18} /> Play
            </button>
            {kind === "artists" && (
              <button
                onClick={() =>
                  void action(() =>
                    api(`/follows/${id}`, {
                      method: following ? "DELETE" : "PUT",
                    }),
                  )
                }
              >
                {following ? "Unfollow" : "Follow artist"}
              </button>
            )}
            {kind === "playlists" && (
              <button
                onClick={() =>
                  void navigator.clipboard
                    .writeText(location.href)
                    .catch(() =>
                      setError("Copy the address from your browser to share."),
                    )
                }
              >
                Copy share link
              </button>
            )}
          </div>
        </div>
        {owner && kind === "playlists" && (
          <form
            className="inline-form"
            key={entity?.updatedAt}
            onSubmit={(e) => {
              e.preventDefault();
              const fields = Object.fromEntries(new FormData(e.currentTarget));
              void action(() =>
                api(`/playlists/${id}`, {
                  method: "PATCH",
                  body: json(fields),
                }),
              );
            }}
          >
            <input
              name="name"
              aria-label="Playlist name"
              defaultValue={entity?.name}
              required
            />
            <select
              name="visibility"
              aria-label="Visibility"
              defaultValue={entity?.visibility}
            >
              <option>private</option>
              <option>public</option>
            </select>
            <button>Save</button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Delete this playlist?"))
                  void action(async () => {
                    await api(`/playlists/${id}`, { method: "DELETE" });
                    location.assign("/library");
                  });
              }}
            >
              Delete
            </button>
          </form>
        )}
        {owner && (
          <label className="cover-upload">
            Collection cover
            <input
              aria-label="Collection cover"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const form = new FormData();
                  form.set("cover", file);
                  void action(() =>
                    api(`/studio/covers/${kind}/${id}`, {
                      method: "POST",
                      body: form,
                    }),
                  );
                }
              }}
            />
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <Tracks
          tracks={data.data?.tracks}
          playlist={id}
          edit={owner && kind === "playlists"}
        />
      </State>
    </main>
  );
}
