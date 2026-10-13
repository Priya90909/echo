import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Upload } from "lucide-react";
import { moods } from "@echo/shared";
import { api, json } from "../api.js";
import { useData, State } from "../components/Catalog.jsx";
export default function Studio({ uploadOnly = false, analytics = false }) {
  const studio = useData("/studio"),
    stats = useData("/studio/analytics", analytics);
  const qc = useQueryClient();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function action(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await qc.invalidateQueries();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page">
      <span className="eyebrow">MADE BY YOU. HEARD BY THE WORLD.</span>
      <h1>
        {analytics
          ? "Your sound, in numbers."
          : uploadOnly
            ? "Release something original."
            : "Artist Studio."}
      </h1>
      <div className="tabs">
        <Link to="/studio">Overview</Link>
        <Link to="/studio/upload">Upload music</Link>
        <Link to="/studio/analytics">Analytics</Link>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <State query={studio}>
        {!studio.data?.artist ? (
          <form
            className="panel form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const body = Object.fromEntries(new FormData(e.currentTarget));
              void action(() =>
                api("/studio/profile", { method: "POST", body: json(body) }),
              );
            }}
          >
            <h2>Create your artist profile</h2>
            <label>
              Artist name
              <input name="name" required minLength={2} />
            </label>
            <label>
              Bio
              <textarea name="bio" maxLength={2000} />
            </label>
            <button className="primary" disabled={busy}>
              Open my studio
            </button>
          </form>
        ) : analytics ? (
          <State query={stats}>
            <div className="metric">
              <small>TOTAL QUALIFIED PLAYS</small>
              <h1>{stats.data?.totalPlays ?? 0}</h1>
            </div>
            <h2>Last 30 days</h2>
            <p>
              {stats.data?.likes ?? 0} saved tracks ·{" "}
              {stats.data?.followers ?? 0} followers ·{" "}
              {stats.data?.uniqueListeners ?? "Fewer than 5"} unique listeners
            </p>
            <div className="chart" aria-label="Plays per day">
              {stats.data?.daily.map((d) => (
                <div key={d._id}>
                  <div
                    style={{
                      height: `${Math.max(5, (120 * d.plays) / Math.max(1, ...stats.data.daily.map((x) => x.plays)))}px`,
                    }}
                  />
                  <small>{d._id.slice(5)}</small>
                  <strong>{d.plays}</strong>
                </div>
              ))}
            </div>
            <p>Only aggregate listening activity appears here.</p>
            {stats.data?.tracks.map((t) => (
              <p key={t._id}>
                {t.title} <strong>{t.playCount} plays</strong>
              </p>
            ))}
          </State>
        ) : uploadOnly ? (
          <form
            className="panel form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              form.set("moods", json(form.getAll("moods")));
              void action(async () => {
                await api("/studio/upload", { method: "POST", body: form });
                setNotice(
                  "Upload accepted. Processing is followed by administrator review before publication.",
                );
              });
            }}
          >
            <label>
              Track title
              <input name="title" required maxLength={120} />
            </label>
            <label>
              Genre
              <input name="genre" required maxLength={40} />
            </label>
            <fieldset>
              <legend>Moods</legend>
              {moods.map((m) => (
                <label className="check" key={m}>
                  <input type="checkbox" name="moods" value={m} />
                  {m}
                </label>
              ))}
            </fieldset>
            <label>
              Audio · WAV, MP3, FLAC, OGG · up to 50 MB
              <input
                name="audio"
                type="file"
                accept=".wav,.mp3,.flac,.ogg"
                required
              />
            </label>
            <label>
              License
              <select name="license">
                <option value="original">My original work</option>
                <option>CC0</option>
                <option>CC-BY</option>
                <option value="public-domain">Verified public domain</option>
              </select>
            </label>
            <label>
              Attribution and rights evidence
              <textarea name="attribution" required maxLength={1000} />
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="rightsConfirmed"
                value="true"
                required
              />
              I own or have permission to host and stream this recording.
            </label>
            <button className="primary" disabled={busy}>
              <Upload size={18} />
              {busy ? "Uploading…" : "Submit for processing"}
            </button>
          </form>
        ) : (
          <>
            <div className="section-heading">
              <h2>{studio.data.artist.name}</h2>
              <Link className="primary" to="/studio/upload">
                <Plus size={18} /> Upload a track
              </Link>
            </div>
            <div className="collection-list">
              {studio.data.tracks.map((t) => (
                <div key={t._id}>
                  <strong>{t.title}</strong>
                  <span className="status">{t.status}</span>
                  <label className="cover-upload">
                    Cover
                    <input
                      aria-label={`Cover for ${t.title}`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const form = new FormData();
                          form.set("cover", file);
                          void action(() =>
                            api(`/studio/covers/tracks/${t._id}`, {
                              method: "POST",
                              body: form,
                            }),
                          );
                        }
                      }}
                    />
                  </label>
                  <button
                    disabled={busy}
                    onClick={() => {
                      const title = prompt("Edit track title", t.title);
                      if (title)
                        void action(() =>
                          api(`/studio/tracks/${t._id}`, {
                            method: "PATCH",
                            body: json({ title }),
                          }),
                        );
                    }}
                  >
                    Edit title
                  </button>
                  <button
                    disabled={busy || t.status === "unpublished"}
                    onClick={() =>
                      void action(() =>
                        api(`/studio/tracks/${t._id}`, {
                          method: "PATCH",
                          body: json({ status: "unpublished" }),
                        }),
                      )
                    }
                  >
                    Unpublish
                  </button>
                </div>
              ))}
            </div>
            <form
              className="panel form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                void action(() =>
                  api("/studio/albums", {
                    method: "POST",
                    body: json({
                      title: form.get("title"),
                      tracks: form.getAll("tracks"),
                    }),
                  }),
                );
              }}
            >
              <h2>Create an album</h2>
              <input
                aria-label="Album title"
                name="title"
                placeholder="Album title"
                required
              />
              {studio.data.tracks.map((t) => (
                <label className="check" key={t._id}>
                  <input type="checkbox" name="tracks" value={t._id} />
                  {t.title}
                </label>
              ))}
              <button disabled={busy}>Create album</button>
            </form>
          </>
        )}
      </State>
    </main>
  );
}
