import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AudioLines,
  Play,
  Heart,
  Music2,
  ArrowUp,
  ArrowDown,
  Trash2,
} from "lucide-react";
import {} from "@echo/shared";
import { api, json } from "../api.js";
import { usePlayer } from "../player.js";
import { time } from "../format.js";
export function useData(path, enabled = true) {
  return useQuery({ queryKey: [path], queryFn: () => api(path), enabled });
}
export function State({ query, children }) {
  if (query.isPending) return <div className="skeleton" aria-label="Loading" />;
  if (query.error)
    return (
      <div className="empty">
        <h2>We couldn’t connect.</h2>
        <p>{query.error.message}</p>
        <button onClick={() => query.refetch()}>Try again</button>
      </div>
    );
  return <>{children}</>;
}
export function Empty({ message = "No tracks here yet." }) {
  return (
    <div className="empty">
      <Music2 size={32} />
      <h3>{message}</h3>
      <p>
        Original music starts in Artist Studio. Local setup includes a clearly
        labeled demo catalog.
      </p>
      <Link to="/studio">Open Artist Studio →</Link>
    </div>
  );
}
export function Art({ index = 0, large = false, src }) {
  return (
    <div className={`art art-${index % 4} ${large ? "large" : ""}`}>
      {src ? (
        <img
          src={src}
          alt="Cover artwork"
          loading="lazy"
          className="cover-image"
        />
      ) : (
        <>
          <div className="art-ring" />
          <AudioLines />
          <span>
            ECHO
            <br />
            ORIGINAL SOUND
          </span>
        </>
      )}
    </div>
  );
}
export function Tracks({ tracks = [], playlist, edit = false }) {
  const player = usePlayer();
  const qc = useQueryClient();
  const likes = useData("/likes");
  const playlists = useData("/playlists");
  const [error, setError] = useState("");
  async function action(task) {
    try {
      setError("");
      await task();
      await qc.invalidateQueries();
    } catch (e) {
      setError(e.message);
    }
  }
  const liked = new Set(likes.data?.map((t) => t._id));
  async function reorder(from, to) {
    const copy = [...tracks];
    const [t] = copy.splice(from, 1);
    copy.splice(to, 0, t);
    await api(`/playlists/${playlist}/tracks`, {
      method: "PUT",
      body: json({ tracks: copy.map((t) => t._id) }),
    });
  }
  return (
    <>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!tracks.length ? (
        <Empty />
      ) : (
        <div className="track-table">
          <div className="track-heading">
            <span>#</span>
            <span>TITLE / ARTIST</span>
            <span>GENRE</span>
            <span>DURATION</span>
            <span />
          </div>
          {tracks.map((t, i) => (
            <div className="track-row" key={t._id}>
              <button
                aria-label={`Play ${t.title}`}
                onClick={() => void player.play(tracks, i)}
              >
                {player.track?._id === t._id ? (
                  <AudioLines size={16} />
                ) : (
                  <span>{String(i + 1).padStart(2, "0")}</span>
                )}
              </button>
              <div className="track-title">
                <Art index={i} src={t.cover} />
                <div>
                  <strong>{t.title}</strong>
                  <Link to={`/artists/${t.artist?._id}`}>
                    {t.artist?.name ?? "Your release"}
                  </Link>
                </div>
              </div>
              <span className="genre">{t.genre}</span>
              <span>{time(t.duration)}</span>
              <div className="row-actions">
                <button
                  aria-label={`Like ${t.title}`}
                  aria-pressed={liked.has(t._id)}
                  onClick={() =>
                    void action(() =>
                      api(`/likes/${t._id}`, {
                        method: liked.has(t._id) ? "DELETE" : "PUT",
                      }),
                    )
                  }
                >
                  <Heart
                    size={17}
                    fill={liked.has(t._id) ? "currentColor" : "none"}
                  />
                </button>
                {edit && playlist ? (
                  <>
                    <button
                      disabled={i === 0}
                      aria-label="Move up"
                      onClick={() => void action(() => reorder(i, i - 1))}
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      disabled={i === tracks.length - 1}
                      aria-label="Move down"
                      onClick={() => void action(() => reorder(i, i + 1))}
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      aria-label="Remove track"
                      onClick={() =>
                        void action(() =>
                          api(`/playlists/${playlist}/tracks`, {
                            method: "PUT",
                            body: json({
                              tracks: tracks
                                .filter((x) => x._id !== t._id)
                                .map((x) => x._id),
                            }),
                          }),
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                ) : (
                  <select
                    aria-label={`Add ${t.title} to playlist`}
                    value=""
                    onChange={(e) => {
                      const id = e.target.value;
                      void action(async () => {
                        const p = await api(`/playlists/${id}`);
                        await api(`/playlists/${id}/tracks`, {
                          method: "PUT",
                          body: json({
                            tracks: [
                              ...new Set([
                                ...p.tracks.map((x) => x._id),
                                t._id,
                              ]),
                            ],
                          }),
                        });
                      });
                    }}
                  >
                    <option value="">+</option>
                    {playlists.data?.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  aria-label={`Report ${t.title}`}
                  onClick={() => {
                    const reason = prompt(
                      "Describe the rights or content issue (at least 10 characters)",
                    );
                    if (reason)
                      void action(() =>
                        api(`/tracks/${t._id}/report`, {
                          method: "POST",
                          body: json({ reason }),
                        }),
                      );
                  }}
                >
                  ···
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
export function Cards({ tracks }) {
  const p = usePlayer();
  return (
    <div className="cards">
      {tracks.map((t, i) => (
        <motion.article
          key={t._id}
          whileHover={{ y: -5 }}
          className="music-card"
        >
          <button
            className="art-button"
            aria-label={`Play ${t.title}`}
            onClick={() => void p.play(tracks, i)}
          >
            <Art index={i} src={t.cover} />
            <span className="card-play">
              <Play fill="currentColor" size={20} />
            </span>
          </button>
          <strong>{t.title}</strong>
          <Link to={`/artists/${t.artist._id}`}>{t.artist.name}</Link>
          <small>
            {t.attribution?.startsWith("Generated by the ECHO seed")
              ? "SYNTHETIC DEMO"
              : t.license === "CC-BY"
                ? "CC BY 4.0"
                : "INDEPENDENT RELEASE"}{" "}
            · {t.genre.toUpperCase()}
          </small>
          <details>
            <summary>Song credits</summary>
            <p>{t.attribution || `${t.title} · ${t.artist.name}`}</p>
            {t.sourceUrl && (
              <a href={t.sourceUrl} target="_blank" rel="noreferrer">
                Artist source ↗
              </a>
            )}{" "}
            {t.licenseUrl && (
              <a href={t.licenseUrl} target="_blank" rel="noreferrer">
                License ↗
              </a>
            )}
          </details>
        </motion.article>
      ))}
    </div>
  );
}
