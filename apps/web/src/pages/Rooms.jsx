import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useSession } from "../session.jsx";
import { usePlayer } from "../player.jsx";
import { Link } from "react-router-dom";

export default function Rooms() {
  const { user } = useSession(), player = usePlayer();
  const [room, setRoom] = useState(null), [code, setCode] = useState(""), [error, setError] = useState(""), [connected, setConnected] = useState(false), [busy, setBusy] = useState(false);
  const socket = useRef(null), latest = useRef({ player, room });
  latest.current = { player, room };
  function receive(next) {
    setRoom(next);
    if (!next?.state || next.host === socket.current?.id) return;
    const state = next.state;
    const position = Math.min(state.track.duration, state.position + (state.playing ? Math.max(0, Date.now() - state.updatedAt) / 1000 : 0));
    void latest.current.player.sync(state.track, position, state.playing);
  }
  useEffect(() => {
    if (!user) return;
    const client = io({ withCredentials: true }); socket.current = client;
    client.on("connect", () => { setConnected(true); setError(""); });
    client.on("connect_error", failure => setError(failure.message));
    client.on("disconnect", () => { setConnected(false); setRoom(null); });
    client.on("room:updated", receive);
    return () => { client.disconnect(); socket.current = null; };
  }, [user?._id]);
  function publish() {
    const { player: current, room: active } = latest.current;
    if (!current.track || active?.host !== socket.current?.id) return;
    socket.current.timeout(5000).emit("room:state", { track: current.track._id, position: current.progress, playing: current.playing }, (failure, result) => {
      if (failure || result?.error) setError(result?.error || "Room synchronization timed out.");
    });
  }
  useEffect(() => {
    if (!room || room.host !== socket.current?.id) return;
    publish(); const timer = setInterval(publish, 2000); return () => clearInterval(timer);
  }, [room?.code, room?.host, player.track?._id, player.playing]);
  function request(event, payload = {}) {
    setBusy(true); setError("");
    socket.current.timeout(5000).emit(event, payload, (failure, result) => {
      setBusy(false);
      if (failure || result?.error) setError(result?.error || "Room request timed out. Try again.");
      else receive(result.room);
    });
  }
  return <section className="page-section"><p className="eyebrow">SHARED MOMENTS</p><h1>EchoRooms</h1>
    <p>Listen together. The host’s song, pause and playback position stay shared.</p>
    {!user ? <Link to="/login">Sign in to join a room</Link> : <>
      <p role="status">{connected ? "Connected" : "Connecting to rooms…"}</p>
      {room ? <><h2>Room {room.code}</h2><p>Share this code with a friend. {room.host === socket.current?.id ? "You control playback using the player." : "The host controls shared playback. Press Play if your browser asks."}</p>
        <ul>{room.members.map(member => <li key={member.id}>{member.name}{member.id === room.host ? " · Host" : ""}</li>)}</ul>
        <button disabled={busy || !connected} onClick={() => request("room:leave")}>Leave room</button>
      </> : <div className="room-entry"><button disabled={busy || !connected} onClick={() => request("room:create")}>Create a room</button>
        <form onSubmit={event => { event.preventDefault(); request("room:join", { code: code.trim().toUpperCase() }); }}><label htmlFor="room-code">Room code</label><input id="room-code" value={code} onChange={event => setCode(event.target.value)} maxLength={6} pattern="[A-Fa-f0-9]{6}" required autoComplete="off" /><button disabled={busy || !connected}>Join room</button></form></div>}
    </>}{error && <p role="alert">{error}</p>}
    <p>Rooms close when everyone leaves. Leaving this page leaves the room.</p>
  </section>;
}
