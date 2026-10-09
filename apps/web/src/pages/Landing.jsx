import { AudioLines, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Brand, ButtonLink } from "../components/UI.jsx";
export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav"><Brand /><Link to="/login">Sign in</Link></header>
      <main className="landing-content">
        <div><span className="eyebrow">INDEPENDENT SOUND. SHARED MOMENTS.</span><h1>Find your<br /><em>frequency.</em></h1><p>A home for independent music, mood-led discovery, and the people you share it with.</p><div className="landing-actions"><ButtonLink to="/register">Start listening <ArrowUpRight size={18} aria-hidden="true" /></ButtonLink><Link className="text-link" to="/home">Explore ECHO →</Link></div></div>
        <div className="orb" aria-hidden="true"><AudioLines /></div>
      </main>
      <footer className="landing-foot"><span>01 / DISCOVER YOUR SOUND</span><span>MOODFLOW · ECHOROOMS · ARTIST STUDIO</span></footer>
    </div>
  );
}
