import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, json } from "../api.js";
import { usePlayer } from "../player.js";
import { useData, State } from "../components/Catalog.jsx";
export default function Admin() {
  const player = usePlayer();
  const data = useData("/admin");
  const qc = useQueryClient();
  const [error, setError] = useState("");
  async function action(path, body) {
    try {
      await api(path, { method: "PATCH", body: json(body) });
      await qc.invalidateQueries();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <main className="page">
      <h1>Curator desk.</h1>
      {error && <p className="error">{error}</p>}
      <State query={data}>
        <p>
          {data.data?.metrics.users} users · {data.data?.metrics.published}{" "}
          published tracks · {data.data?.metrics.plays} qualified plays
        </p>
        <h2>Publication review</h2>
        {data.data?.tracks.map((t) => (
          <div className="panel" key={t._id}>
            <h3>
              {t.title} · {t.artist.name}
            </h3>
            <button onClick={() => void player.play([t])}>
              Preview recording
            </button>
            <p>
              {t.license} · {t.attribution}
            </p>
            <button
              onClick={() =>
                void action(`/admin/tracks/${t._id}`, { status: "published" })
              }
            >
              Approve
            </button>
            <button
              onClick={() =>
                void action(`/admin/tracks/${t._id}`, { status: "rejected" })
              }
            >
              Reject
            </button>
          </div>
        ))}
        <h2>Reports</h2>
        {data.data?.reports.map((r) => (
          <div className="panel" key={r._id}>
            <strong>{r.track?.title}</strong>
            <p>{r.reason}</p>
            <button
              onClick={() =>
                void action(`/admin/tracks/${r.track?._id}`, {
                  status: "unpublished",
                })
              }
            >
              Remove from catalog
            </button>
            <button onClick={() => void action(`/admin/reports/${r._id}`, {})}>
              Resolve report
            </button>
          </div>
        ))}
        <h2>Accounts</h2>
        <h2>Reported rooms</h2>
        {data.data?.roomReports?.map((r) => (
          <div className="panel" key={r._id}>
            <p>{r.reason}</p>
            <button
              onClick={() => void action(`/admin/rooms/${r.room.code}`, {})}
            >
              Close room {r.room.code}
            </button>
          </div>
        ))}
        {data.data?.users.map((u) => (
          <div className="collection-list" key={u._id}>
            <div>
              <strong>{u.name}</strong>
              <span>{u.role}</span>
              <button
                onClick={() =>
                  void action(`/admin/users/${u._id}`, {
                    suspended: !u.suspended,
                  })
                }
              >
                {u.suspended ? "Restore" : "Suspend"}
              </button>
            </div>
          </div>
        ))}
      </State>
    </main>
  );
}
