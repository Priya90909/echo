import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api.js";
const SessionContext = createContext(null);
export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("/auth/me").then((value) => { if (active) setUser(value); })
      .catch((failure) => { if (active && failure.status !== 401) setError("Account connection unavailable. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function signOut() {
    setError("");
    try { await api("/auth/logout", { method: "POST" }); setUser(null); return true; }
    catch (failure) { setError(failure.message); return false; }
  }
  return <SessionContext.Provider value={{ user, setUser, loading, error, signOut }}>{children}</SessionContext.Provider>;
}
export function useSession() { return useContext(SessionContext); }
