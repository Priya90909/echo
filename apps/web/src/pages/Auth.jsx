import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Brand } from "../components/UI.jsx";
import { api } from "../api.js";
import { useSession } from "../session.jsx";
export default function Auth({ register = false }) {
  const { user, setUser, loading } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  if (loading) return <main className="auth-page"><p role="status">Connecting to ECHO…</p></main>;
  if (user) return <Navigate to="/home" replace />;
  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError("");
    try {
      const account = await api(register ? "/auth/register" : "/auth/login", { method: "POST", body: JSON.stringify(data) });
      setUser(account);
      navigate("/home", { replace: true });
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return (
    <main className="auth-page">
      <Brand /><h1>{register ? "Find your people." : "Welcome back."}</h1>
      <p>{register ? "Start a new chapter in sound." : "Your world of sound is waiting."}</p>
      <form onSubmit={submit}>
        {register && <label>Your name<input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>}
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
        <label>Password<input name="password" type="password" required minLength={12} maxLength={128} autoComplete={register ? "new-password" : "current-password"} /></label>
        <small>At least 12 characters</small>
        {error && <p role="alert">{error}</p>}
        <button className="button-link" disabled={busy}>{busy ? "Connecting…" : register ? "Create account" : "Sign in"}</button>
      </form>
      <p>{register ? "Already listening?" : "New to ECHO?"} <Link to={register ? "/login" : "/register"}>{register ? "Sign in" : "Create an account"}</Link></p>
      <Link to="/home">Explore ECHO →</Link>
    </main>
  );
}
