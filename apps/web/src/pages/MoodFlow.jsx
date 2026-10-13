import { useState } from "react";
import { Play } from "lucide-react";
import { moods } from "@echo/shared";
import { usePlayer } from "../player.js";
import { useData, State, Cards } from "../components/Catalog.jsx";
export default function MoodFlow() {
  const [mood, setMood] = useState("Focused");
  const data = useData(`/recommendations?mood=${mood}`);
  const p = usePlayer();
  return (
    <main className="page">
      <span className="eyebrow">MUSIC THAT MEETS YOU WHERE YOU ARE</span>
      <h1>How are you feeling?</h1>
      <p>One mood. A new way to discover.</p>
      <div className="moods">
        {moods.map((m, i) => (
          <button
            className={mood === m ? "selected" : ""}
            onClick={() => setMood(m)}
            key={m}
          >
            <span>{["◈", "☾", "ϟ", "◎", "☀", "≈"][i]}</span>
            {m}
          </button>
        ))}
      </div>
      <div className="section-heading">
        <h2>Your {mood.toLowerCase()} flow</h2>
        <button
          className="primary"
          disabled={!data.data?.length}
          onClick={() => void p.play(data.data)}
        >
          Play flow
        </button>
      </div>
      <State query={data}>
        {data.data?.length ? (
          <Cards tracks={data.data} />
        ) : (
          <p>No songs match this mood yet.</p>
        )}
        <div className="explanations">
          {data.data?.map((t) => (
            <p key={t._id}>
              <strong>{t.title}</strong> ·{" "}
              {t.reasons.join(" · ") || "A fresh discovery"}{" "}
              <small>Score {t.score}</small>
            </p>
          ))}
        </div>
      </State>
    </main>
  );
}
