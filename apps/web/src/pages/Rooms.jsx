import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Play } from "lucide-react";
import { roomPosition } from "@echo/shared";
import { io } from "socket.io-client";
import { usePlayer } from "../player.js";
import { useData } from "../components/Catalog.jsx";
export default function Rooms({ user }) {
  const [params, setParams] = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? ""),
    [socket, setSocket] = useState(),
    [connected, setConnected] = useState(false),
    [state, setState] = useState(),
    [participants, setParticipants] = useState([]),
    [messages, setMessages] = useState([]),
    [text, setText] = useState(""),
    [error, setError] = useState("");
  const catalog = useData("/catalog");
  const tracks = { ...catalog, data: catalog.data?.tracks };
  const stateRef = useRef(null);
  stateRef.current = state;
  useEffect(() => {
    const ended = () => {
      const current = stateRef.current;
      if (!current || current.host !== user?._id) return;
      socket?.emit(
        "control",
        {
          revision: current.revision,
          position: 0,
          index:
            current.index < current.queue.length - 1
              ? current.index + 1
              : current.index,
          playing: current.index < current.queue.length - 1,
        },
        (r) => {
          if (!r.ok) setError(r.error);
        },
      );
    };
    window.addEventListener("echo:ended", ended);
    return () => window.removeEventListener("echo:ended", ended);
  }, [socket, user?._id]);
  useEffect(() => {
    const s = io({ withCredentials: true, autoConnect: false });
    setSocket(s);
    const sync = (payload) => {
      setState(payload.state);
      usePlayer.setState({ roomActive: true });
      const remote = payload.state;
      const track = tracks.data?.find(
        (t) => t._id === remote.queue[remote.index],
      );
      const target = roomPosition(remote, payload.serverTime);
      const p = usePlayer.getState();
      if (track && p.track?._id !== track._id)
        void p
          .play(
            remote.queue
              .map((id) => tracks.data.find((t) => t._id === id))
              .filter(Boolean),
            remote.index,
          )
          .then(() => {
            usePlayer.getState().seek(target);
            if (!remote.playing && usePlayer.getState().playing)
              usePlayer.getState().toggle();
          });
      else {
        if (Math.abs(p.progress - target) > 1.5) p.seek(target);
        if (p.playing !== remote.playing && p.track) p.toggle();
      }
    };
    s.on("connect", () => {
      setConnected(true);
      const saved = params.get("code");
      if (saved)
        s.emit("join", { code: saved }, (r) =>
          r.ok ? sync(r) : setError(r.error),
        );
    });
    s.on("disconnect", () => setConnected(false));
    s.on("closed", () => {
      setState(undefined);
      setParams({});
      setError("This room was closed by a moderator.");
    });
    s.on("connect_error", (e) => setError(e.message));
    s.on("state", sync);
    s.on("participants", setParticipants);
    s.on("chat", (m) => setMessages((old) => [...old.slice(-99), m]));
    s.connect();
    const timer = setInterval(() => {
      if (s.connected && params.get("code")) {
        const sentAt = Date.now();
        s.emit("sync", {}, (r) => {
          if (r.ok)
            sync({
              ...r,
              serverTime: r.serverTime + (Date.now() - sentAt) / 2,
            });
        });
      }
    }, 5000);
    return () => {
      clearInterval(timer);
      s.disconnect();
      usePlayer.setState({ roomActive: false });
    };
  }, [tracks.data, params.get("code")]);
  function command(event, data) {
    socket?.emit(event, data, (r) => {
      if (!r.ok) setError(r.error);
      else {
        setError("");
        if (r.code) {
          setCode(r.code);
          setParams({ code: r.code });
        }
        if (r.state) setState(r.state);
      }
    });
  }
  const host = state?.host === user?._id;
  return (
    <main className="page">
      <span className="eyebrow">SAME SOUND. SHARED MOMENT.</span>
      <h1>Come together.</h1>
      <p className={connected ? "connected" : "error"}>
        {connected ? "● Connected" : "○ Connecting"}
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="inline-form">
        <button
          className="primary"
          disabled={!connected}
          onClick={() => command("create", {})}
        >
          Create a room
        </button>
        <input
          aria-label="Room code"
          placeholder="8-character room code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          disabled={!connected || !code}
          onClick={() => setParams({ code })}
        >
          Join room
        </button>
      </div>
      {state && (
        <div className="room-grid">
          <section className="panel">
            <h2>Room {code}</h2>
            <button
              onClick={() =>
                void navigator.clipboard
                  .writeText(location.href)
                  .catch(() => setError("Copy the current browser address."))
              }
            >
              Copy invitation
            </button>
            <button
              onClick={() => {
                setParams({});
                setState(undefined);
                setParticipants([]);
              }}
            >
              Leave room
            </button>
            <button
              onClick={() => {
                const reason = prompt(
                  "Describe the room issue (at least 10 characters)",
                );
                if (reason) command("report", { reason });
              }}
            >
              Report room
            </button>
            <h3>Listening together</h3>
            {participants.map((p) => (
              <p key={p.id}>
                {p.name}
                {p.user === state.host ? " · host" : ""}
              </p>
            ))}
            {host ? (
              <>
                <h3>Host controls</h3>
                <button
                  disabled={!tracks.data?.length}
                  onClick={() =>
                    command("control", {
                      queue: tracks.data.map((t) => t._id),
                      index: 0,
                      position: 0,
                      playing: true,
                      revision: state.revision,
                    })
                  }
                >
                  Queue catalog
                </button>
                <button
                  disabled={state.index >= state.queue.length - 1}
                  onClick={() =>
                    command("control", {
                      index: state.index + 1,
                      position: 0,
                      playing: state.playing,
                      revision: state.revision,
                    })
                  }
                >
                  Skip track
                </button>
                <select
                  aria-label="Room track"
                  value={state.queue[state.index] ?? ""}
                  onChange={(e) =>
                    command("control", {
                      queue: [e.target.value],
                      index: 0,
                      position: 0,
                      playing: true,
                      revision: state.revision,
                    })
                  }
                >
                  <option value="">Choose a track</option>
                  {tracks.data?.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    command("control", {
                      playing: !state.playing,
                      revision: state.revision,
                    })
                  }
                >
                  {state.playing ? "Pause room" : "Play room"}
                </button>
                <button
                  onClick={() =>
                    command("control", {
                      position: usePlayer.getState().progress,
                      revision: state.revision,
                    })
                  }
                >
                  Sync to my position
                </button>
              </>
            ) : (
              <p>
                The host controls room playback. Browser audio may need one
                click on the player to begin.
              </p>
            )}
          </section>
          <section className="panel">
            <h2>Room chat</h2>
            <div className="chat" aria-live="polite">
              {messages.map((m, i) => (
                <p key={i}>
                  <strong>{m.name}</strong>
                  <br />
                  {m.text}
                </p>
              ))}
            </div>
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                command("chat", { text });
                setText("");
              }}
            >
              <input
                aria-label="Chat message"
                value={text}
                maxLength={500}
                onChange={(e) => setText(e.target.value)}
              />
              <button disabled={!text.trim()}>Send</button>
            </form>
            <p>Room reports reach the curator desk. Chat is ephemeral.</p>
          </section>
        </div>
      )}
    </main>
  );
}
