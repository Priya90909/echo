import { useState } from "react";
import { Cards, State, useData } from "../components/Catalog.jsx";
import { usePlayer } from "../player.jsx";
export function History() { const query = useData("/history"); return <section className="page-content"><h1>Recently in your world.</h1><State query={query}><Cards tracks={query.data} /></State></section>; }
export function MoodFlow() {
  const [mood, setMood] = useState("calm"), player = usePlayer();
  const query = useData(`/moodflow?mood=${mood}`);
  return <section className="page-content"><span className="eyebrow">TUNE INTO YOU</span><h1>A mood. A whole new world.</h1><div className="mood-options">{["calm", "focus", "energy", "reflective"].map(value => <button key={value} aria-pressed={mood === value} onClick={() => setMood(value)}>{value}</button>)}</div><State query={query}><button disabled={!query.data?.length} onClick={() => player.playQueue(query.data)}>Play this mood</button><Cards tracks={query.data} /></State></section>;
}
