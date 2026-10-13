import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useData, State, Tracks, Cards } from "../components/Catalog.jsx";
export default function Search() {
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get("q") ?? "");
  const [q, setQ] = useState(text),
    [page, setPage] = useState(0),
    [genre, setGenre] = useState(params.get("genre") ?? "");
  const [view, setView] = useState("covers");
  const catalog = useData("/catalog");
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(text);
      setParams({ ...(text ? { q: text } : {}), ...(genre ? { genre } : {}) });
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [text, genre, setParams]);
  const data = useData(
    q
      ? `/search?q=${encodeURIComponent(q)}&page=${page}${genre ? `&genre=${encodeURIComponent(genre)}` : ""}`
      : `/tracks?page=${page}${genre ? `&genre=${encodeURIComponent(genre)}` : ""}`,
  );
  const tracks = q ? data.data?.tracks : data.data;
  return (
    <main className="page">
      <span className="eyebrow">FOLLOW YOUR CURIOSITY</span>
      <h1>Find your next favorite.</h1>
      <h2>Search the ECHO library</h2>
      <div className="search-controls">
        <input
          className="search-input"
          aria-label="Search music"
          placeholder="Songs, artists, albums, genres, playlists…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <select
          aria-label="Filter genre"
          value={genre}
          onChange={(e) => {
            setGenre(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All genres</option>
          {catalog.data?.genres.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </div>
      <div className="section-heading">
        <p>
          {catalog.data?.total ?? ""} songs to explore · full tracks with cover
          art
        </p>
        <button onClick={() => setView(view === "covers" ? "list" : "covers")}>
          {view === "covers" ? "List view" : "Cover view"}
        </button>
      </div>
      <State query={data}>
        {view === "covers" && tracks?.length ? (
          <Cards tracks={tracks} />
        ) : (
          <Tracks tracks={tracks} />
        )}
        {q &&
          ["artists", "albums", "playlists"].map((kind) => (
            <section key={kind}>
              <h2>{kind}</h2>
              <div className="collection-list">
                {data.data?.[kind].map((v) => (
                  <Link key={v._id} to={`/${kind}/${v._id}`}>
                    {v.name ?? v.title} →
                  </Link>
                ))}
              </div>
            </section>
          ))}
      </State>
      <div className="pagination">
        <button disabled={!page} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          disabled={!tracks || tracks.length < 24}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </main>
  );
}
