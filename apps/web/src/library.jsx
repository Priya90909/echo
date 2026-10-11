import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api.js";
import { useSession } from "./session.jsx";
const LibraryContext = createContext(null);
export const useLibrary = () => useContext(LibraryContext);
export function LibraryProvider({ children }) {
  const { user } = useSession();
  const [likes, setLikes] = useState([]), [playlists, setPlaylists] = useState([]), [error, setError] = useState("");
  async function refresh() { if (!user) return; const [songs, lists] = await Promise.all([api("/likes"), api("/playlists")]); setLikes(songs); setPlaylists(lists); }
  useEffect(() => { let active = true; setLikes([]); setPlaylists([]); setError(""); if (user) Promise.all([api("/likes"), api("/playlists")]).then(([songs, lists]) => { if (active) { setLikes(songs); setPlaylists(lists); } }).catch(() => { if (active) setError("Couldn’t load your library."); }); return () => { active = false; }; }, [user?._id]);
  async function mutate(path, options) { if (!user) throw Error("Sign in to save music."); setError(""); await api(path, options); await refresh(); }
  return <LibraryContext.Provider value={{ likes, playlists, error, refresh, mutate, signedIn: !!user }}>{children}</LibraryContext.Provider>;
}
