import { Link, NavLink, Route, Routes } from "react-router-dom";
import { AudioLines, Home, Search, Library, Heart, History, Radio, Users, Mic2, Settings, ArrowUpRight } from "lucide-react";
import { Brand, ButtonLink } from "./UI.jsx";
import Placeholder from "../pages/Placeholder.jsx";

const pages = [
  ["/home", "Discover", Home, "Your home for new sounds and familiar favorites."],
  ["/search", "Search", Search, "Find songs, artists and albums in one place."],
  ["/library", "Your library", Library, "A space for the music you want to keep close."],
  ["/offline", "Offline music", Library, "Your personal music, wherever you go."],
  ["/likes", "Liked songs", Heart, "All the songs that stay with you."],
  ["/history", "Listening history", History, "Find your way back to a recent discovery."],
  ["/moodflow", "MoodFlow", Radio, "Find a soundtrack for how you feel."],
  ["/rooms", "EchoRooms", Users, "A place to share a listening moment."],
  ["/studio", "Artist Studio", Mic2, "A home for your original sound."],
  ["/settings", "Settings", Settings, "Make ECHO feel like your own."],
];
export default function Shell() {
  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar">
        <Brand to="/home" />
        <p className="nav-label">YOUR WORLD OF SOUND</p>
        <nav aria-label="Main navigation">
          {pages.slice(0, -1).map(([path, title, Icon]) => <NavLink key={path} to={path}><Icon size={19} aria-hidden="true" /><span>{title}</span></NavLink>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="studio-callout"><Mic2 size={24} aria-hidden="true" /><strong>Your sound belongs here.</strong><p>Make room for your original music.</p><Link to="/studio">Explore Artist Studio <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
          <NavLink className="settings-link" to="/settings"><Settings size={18} aria-hidden="true" /> Settings</NavLink>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar"><span className="top-note">A little discovery, every day.</span><div className="account-links"><Link to="/login">Sign in</Link><ButtonLink to="/register">Join ECHO</ButtonLink></div></header>
        <main id="main-content" tabIndex={-1}>
          <Routes>
            {pages.map(([path, title, icon, description]) => <Route key={path} path={path} element={<Placeholder title={title} description={description} icon={icon} />} />)}
            <Route path="*" element={<Placeholder title="Page not found" description="This page is not available. Head back to Discover." />} />
          </Routes>
        </main>
        <footer className="shell-footer"><AudioLines size={16} aria-hidden="true" /><span>Find your frequency.</span><span>INDEPENDENT SOUND. SHARED MOMENTS.</span></footer>
      </div>
    </div>
  );
}
