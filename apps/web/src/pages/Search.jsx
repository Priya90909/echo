import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Cards, State, useData } from "../components/Catalog.jsx";
export default function Search() {
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get("q") ?? "");
  const q = params.get("q") ?? "", genre = params.get("genre") ?? "";
  const page = Number(params.get("page") ?? 0) || 0;
  const catalog = useData("/catalog");
  const query = useData(`${q ? "/search" : "/tracks"}?${new URLSearchParams({ q, genre, page: String(page) })}`);
  const tracks = q ? query.data?.tracks : query.data;
  const change = (values) => setParams({ q, genre, page: "0", ...values });
  return <section className="page-content"><h1>Find your next favorite.</h1>
    <form className="search-controls" onSubmit={event => { event.preventDefault(); change({ q: text.trim() }); }}>
      <input aria-label="Search music" placeholder="Songs, artists, albums…" value={text} onChange={event => setText(event.target.value)} />
      <button>Search</button><select aria-label="Filter genre" value={genre} onChange={event => change({ genre: event.target.value })}><option value="">All genres</option>{catalog.data?.genres.map(value => <option key={value}>{value}</option>)}</select>
    </form><State query={query}><Cards tracks={tracks} />{q && ["artists", "albums"].map(kind => <section key={kind}><h2>{kind}</h2>{query.data?.[kind]?.length ? query.data[kind].map(item => <p key={item._id}><Link to={`/${kind}/${item._id}`}>{item.name ?? item.title} →</Link></p>) : <p>No {kind} found.</p>}</section>)}</State>
    <div className="pagination"><button disabled={!page || query.loading} onClick={() => change({ page: String(page - 1) })}>Previous</button><span>Page {page + 1}</span><button disabled={query.loading || (tracks?.length ?? 0) < 24} onClick={() => change({ page: String(page + 1) })}>Next</button></div>
  </section>;
}
