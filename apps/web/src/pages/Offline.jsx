import { useEffect, useState } from "react";
import { Art } from "../components/Catalog.jsx";
import { usePlayer } from "../player.js";
import {
  importFile,
  prepareOfflineApp,
  savedSongs,
  removeSaved,
} from "../offline.js";
import { time } from "../format.js";
export default function Offline() {
  const [tracks, setTracks] = useState([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [filter, setFilter] = useState("");
  const player = usePlayer();
  async function refresh() {
    setTracks((await savedSongs()).map((s) => s.track));
  }
  useEffect(() => {
    void refresh().catch((e) => setMessage(e.message));
  }, []);
  const shown = tracks.filter((t) =>
    t.title.toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    <main className="page">
      <span className="eyebrow">YOUR MUSIC · ON THIS DEVICE</span>
      <h1>Offline music.</h1>
      <p>
        Full files. Your ECHO player. No internet needed after importing and
        preparing this page.
      </p>
      <div className="search-controls">
        <label className="primary">
          {busy ? "Importing…" : "Add music files"}
          <input
            aria-label="Import music files"
            type="file"
            multiple
            accept="audio/*,video/mp4,.mp3,.m4a,.mp4,.wav,.ogg,.flac"
            disabled={busy}
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              setBusy(true);
              let count = 0;
              const failed = [];
              try {
                for (const file of files) {
                  try {
                    await importFile(file);
                    count++;
                  } catch {
                    failed.push(file.name);
                  }
                }
                await refresh();
                await prepareOfflineApp();
                setMessage(
                  `${count} files saved for offline playback.${failed.length ? " Could not import: " + failed.join(", ") : ""}`,
                );
              } catch (error) {
                setMessage(error.message);
              } finally {
                setBusy(false);
                e.target.value = "";
              }
            }}
          />
        </label>
        <button
          disabled={busy}
          onClick={() =>
            void prepareOfflineApp()
              .then(() =>
                setMessage("ECHO is ready to reopen offline in this browser."),
              )
              .catch((e) => setMessage(e.message))
          }
        >
          Prepare ECHO for offline use
        </button>
      </div>
      <p role="status">{message}</p>
      <input
        className="search-input"
        aria-label="Search offline songs"
        placeholder="Search your music…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="section-heading">
        <h2>{tracks.length} songs on this device</h2>
        <button
          className="primary"
          disabled={!shown.length}
          onClick={() => void player.play(shown)}
        >
          Play all
        </button>
      </div>
      <div className="cards">
        {shown.map((t, i) => (
          <article className="music-card" key={t._id}>
            <button
              className="art-button"
              aria-label={`Play ${t.title}`}
              onClick={() => void player.play(shown, i)}
            >
              <Art index={i} />
            </button>
            <strong>{t.title}</strong>
            <p>{time(t.duration)} · PERSONAL FILE</p>
            <button onClick={() => void removeSaved(t._id).then(refresh)}>
              Remove offline copy
            </button>
          </article>
        ))}
      </div>
      {!tracks.length && (
        <p>
          Add MP3, M4A, WAV or MP4 files from your computer. MP4 audio plays
          through ECHO without opening a video player.
        </p>
      )}
      <p>
        Files stay in this browser on this device. Clearing browser storage
        removes these copies; keep your original files. Cloud playlists and
        rooms require a connection.
      </p>
    </main>
  );
}
