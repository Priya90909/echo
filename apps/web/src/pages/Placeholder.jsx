import { AudioLines } from "lucide-react";
import { Brand, ButtonLink } from "../components/UI.jsx";
export default function Placeholder({ title, description, icon: Icon = AudioLines, standalone = false }) {
  const content = (
    <section className="page-content">
      <span className="eyebrow">YOUR WORLD OF SOUND</span><h1>{title}</h1><p className="page-description">{description}</p>
      <div className="empty-state"><div className="empty-icon"><Icon size={36} aria-hidden="true" /></div><h2>A little more is on the way.</h2><p>This space is taking shape. For now, explore ECHO and find your way around.</p><ButtonLink to={standalone ? "/home" : "/"} secondary>{standalone ? "Explore ECHO" : "Back to the welcome page"}</ButtonLink></div>
    </section>
  );
  return standalone ? <main className="standalone"><Brand />{content}</main> : content;
}
