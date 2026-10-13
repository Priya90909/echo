import { useState, useEffect, lazy, Suspense } from "react";
import { Link, NavLink, Routes, Route, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AudioLines,
  Home,
  Search,
  Library,
  Heart,
  Radio,
  Users,
  Mic2,
  History,
  Settings,
  Shield,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Shuffle,
  Repeat,
  ListMusic,
  LogOut,
} from "lucide-react";
import { api, json } from "./api.js";
import { usePlayer } from "./player.js";
import {
  offlineAccount,
  rememberAccount,
  subscribeAccount,
} from "./offline-account.js";
import PlayerLike from "./components/PlayerLike.jsx";
const Pages = lazy(() => import("./Pages.jsx"));
const FullPlayer = lazy(() => import("./components/FullPlayer.jsx"));
const links = [
  ["/home", "Discover", Home],
  ["/search", "Search", Search],
  ["/library", "Your library", Library],
  ["/offline", "Offline music", Library],
  ["/likes", "Liked songs", Heart],
  ["/history", "Listening history", History],
  ["/moodflow", "MoodFlow", Radio],
  ["/rooms", "EchoRooms", Users],
  ["/studio", "Artist Studio", Mic2],
];
import { time } from "./format.js";
function Player() {
  const [full, setFull] = useState(false);
  const s = usePlayer();
  const [queue, setQueue] = useState(false);
  return (
    <>
      <footer className="player">
        <div className="now">
          <button
            className="expand-player"
            aria-label="Open full-screen player"
            onClick={() => setFull(true)}
          >
            ↗
          </button>
          <div className="mini-art">
            {s.track?.cover ? (
              <img
                src={s.track.cover}
                alt="Current song cover"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
            ) : (
              <AudioLines />
            )}
          </div>
          <div>
            <strong>{s.track?.title ?? "Your next discovery awaits"}</strong>
            <small>
              {s.error ||
                s.track?.artist.name ||
                "Choose a track to find your frequency"}
            </small>
          </div>
        </div>
        <div className="transport">
          <div className="controls">
            <button
              aria-label="Shuffle"
              aria-pressed={s.shuffle}
              onClick={s.setShuffle}
            >
              <Shuffle size={17} />
            </button>
            <button aria-label="Previous track" onClick={s.previous}>
              <SkipBack size={19} />
            </button>
            <button
              className="play-circle"
              disabled={!s.track}
              aria-label={s.playing ? "Pause" : "Play"}
              onClick={s.toggle}
            >
              {s.loading ? (
                <span className="spinner" />
              ) : s.playing ? (
                <Pause size={20} />
              ) : (
                <Play size={20} />
              )}
            </button>
            <button aria-label="Next track" onClick={s.next}>
              <SkipForward size={19} />
            </button>
            <button
              aria-label={`Repeat ${s.repeat}`}
              aria-pressed={s.repeat !== "off"}
              onClick={s.setRepeat}
            >
              <Repeat size={17} />
              {s.repeat === "one" && <sup>1</sup>}
            </button>
          </div>
          <div className="seek">
            <span>{time(s.progress)}</span>
            <input
              aria-label="Playback position"
              type="range"
              min="0"
              max={s.duration || 1}
              step="0.1"
              value={s.progress}
              onChange={(e) => s.seek(+e.target.value)}
            />
            <span>{time(s.duration)}</span>
          </div>
        </div>
        <div className="volume">
          <PlayerLike />
          <button aria-label="Show queue" onClick={() => setQueue(!queue)}>
            <ListMusic size={19} />
          </button>
          <button
            aria-label="Mute"
            onClick={() => s.setVolume(s.volume ? 0 : 0.7)}
          >
            <Volume2 size={19} />
          </button>
          <input
            aria-label="Volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={s.volume}
            onChange={(e) => s.setVolume(+e.target.value)}
          />
        </div>
      </footer>
      {full && (
        <Suspense fallback={null}>
          <FullPlayer close={() => setFull(false)} />
        </Suspense>
      )}
      {queue && (
        <aside className="queue">
          <h2>Up next</h2>
          <button onClick={() => setQueue(false)}>Close queue</button>
          {s.queue.map((t, i) => (
            <button key={t._id + i} onClick={() => void s.play(s.queue, i)}>
              {i === s.index ? "▶ " : ""}
              {t.title}
              <small>{t.artist.name}</small>
            </button>
          ))}
        </aside>
      )}
    </>
  );
}
export function Auth({ register = false }) {
  const providers = useQuery({
    queryKey: ["providers"],
    queryFn: () => api("/auth/providers"),
  });
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <main className="auth">
      <Link className="brand" to="/">
        <AudioLines /> ECHO
      </Link>
      <h1>{register ? "Find your people." : "Welcome back."}</h1>
      <p>
        {register
          ? "Start a new chapter in sound."
          : "Your world of sound is waiting."}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const data = Object.fromEntries(new FormData(e.currentTarget));
          try {
            const u = await api(`/auth/${register ? "register" : "login"}`, {
              method: "POST",
              body: json(data),
            });
            await qc.cancelQueries();
            qc.removeQueries({
              predicate: (query) =>
                !["me", "providers"].includes(query.queryKey[0]),
            });
            rememberAccount(u);
            qc.setQueryData(["me"], u);
            navigate("/home");
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {register && (
          <label>
            Your name
            <input name="name" required minLength={2} autoComplete="name" />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete={register ? "new-password" : "current-password"}
          />
        </label>
        <small>At least 12 characters</small>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "Connecting…" : register ? "Create account" : "Sign in"}
        </button>
      </form>
      {providers.data?.google && (
        <a className="oauth-button" href="/api/auth/google">
          Continue with Google
        </a>
      )}
      {new URLSearchParams(location.search).get("error") === "google" && (
        <p className="error">
          Google sign-in could not be completed. If you already have a password
          account, use it to sign in.
        </p>
      )}
      <p>
        {register ? "Already listening?" : "New to ECHO?"}{" "}
        <Link to={register ? "/login" : "/register"}>
          {register ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </main>
  );
}
function Landing() {
  return (
    <main className="landing">
      <nav>
        <Link className="brand" to="/">
          <AudioLines /> ECHO
        </Link>
        <Link to="/login">Sign in</Link>
      </nav>
      <div className="landing-content">
        <span className="eyebrow">INDEPENDENT SOUND. SHARED MOMENTS.</span>
        <h1>
          Find your
          <br />
          <em>frequency.</em>
        </h1>
        <p>
          A home for independent music, mood-led discovery, and the people you
          share it with.
        </p>
        <Link className="primary" to="/register">
          Start listening <Play size={16} />
        </Link>
        <Link className="text-link" to="/home">
          Explore ECHO →
        </Link>
      </div>
      <div className="orb orb-landing">
        <AudioLines size={170} />
      </div>
      <div className="landing-foot">
        <span>01 / DISCOVER YOUR SOUND</span>
        <span>MOODFLOW · ECHOROOMS · ARTIST STUDIO</span>
      </div>
    </main>
  );
}
export default function App() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: async ({ signal }) => {
      try {
        const user = await api("/auth/me", { signal });
        rememberAccount(user);
        return user;
      } catch (error) {
        if (error.status === 401) rememberAccount(null);
        const cached = offlineAccount();
        if (cached && error instanceof TypeError)
          return { ...cached, offline: true };
        throw error;
      }
    },
    retry: false,
  });
  const qc = useQueryClient();
  useEffect(
    () =>
      subscribeAccount((event) => {
        qc.removeQueries({
          predicate: (query) =>
            !["me", "providers"].includes(query.queryKey[0]),
        });
        if (event.type === "storage")
          void qc.resetQueries({ queryKey: ["me"] });
      }),
    [qc],
  );
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth register />} />
      <Route
        path="/*"
        element={
          <div className="shell">
            <aside className="sidebar">
              <Link className="brand" to="/home">
                <AudioLines size={32} /> ECHO<span>®</span>
              </Link>
              <small className="nav-label">YOUR WORLD OF SOUND</small>
              <nav>
                {links.map(([url, label, Icon], i) => (
                  <NavLink key={url} to={url}>
                    <Icon size={19} />
                    {label}
                  </NavLink>
                ))}
              </nav>
              <div className="sidebar-bottom">
                <div className="studio-callout">
                  <Mic2 size={24} />
                  <strong>Your sound belongs here.</strong>
                  <p>Publish your original music.</p>
                  <Link to="/studio">Open Artist Studio ↗</Link>
                </div>
                <NavLink to="/settings">
                  <Settings size={18} /> Settings
                </NavLink>
                {me.data?.role === "admin" && (
                  <NavLink to="/admin">
                    <Shield size={18} /> Administration
                  </NavLink>
                )}
              </div>
            </aside>
            <div className="workspace">
              <header className="topbar">
                <span className="top-note">A little discovery, every day.</span>
                <div>
                  {me.data ? (
                    <>
                      <Link className="avatar" to="/settings">
                        {me.data.name[0]}
                      </Link>
                      <span>{me.data.name}</span>
                      <button
                        aria-label="Sign out"
                        onClick={async () => {
                          try {
                            if (!me.data.offline)
                              await api("/auth/logout", { method: "POST" });
                          } finally {
                            rememberAccount(null);
                            usePlayer.getState().reset();
                            qc.clear();
                            location.assign("/login");
                          }
                        }}
                      >
                        <LogOut size={17} />
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login">Sign in</Link>
                      <Link className="pill" to="/register">
                        Join ECHO
                      </Link>
                    </>
                  )}
                </div>
              </header>
              <Suspense fallback={<div className="skeleton" />}>
                <Pages user={me.data} />
              </Suspense>
            </div>
            <Player />
          </div>
        }
      />
    </Routes>
  );
}
