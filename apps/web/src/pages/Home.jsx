import { Link } from "react-router-dom";
import { AudioLines, ArrowUpRight, Play, Radio, Users } from "lucide-react";
import { usePlayer } from "../player.js";
import { useData, State, Empty, Cards } from "../components/Catalog.jsx";
export default function Home() {
  const catalog = useData("/catalog");
  const tracks = { ...catalog, data: catalog.data?.tracks };
  const p = usePlayer();
  return (
    <main className="page">
      <div className="page-intro">
        <span className="eyebrow">YOUR DAILY DOSE OF DISCOVERY</span>
        <h1>
          Good music.
          <br />
          <span>Better moments.</span>
        </h1>
        <p>Step out of the familiar. Find something that feels like you.</p>
      </div>
      <section className="hero">
        <div>
          <span className="eyebrow">THE ECHO EDIT · VOL. 01</span>
          <h2>
            Lose yourself.
            <br />
            Find your sound.
          </h2>
          <p>
            A new space for independent voices.
            <br />
            Made for curious ears.
          </p>
          <button
            className="primary"
            disabled={!tracks.data?.length}
            onClick={() => void p.play(tracks.data)}
          >
            <Play size={17} fill="currentColor" /> Play the ECHO edit
          </button>
          <span className="hero-caption">
            FULL SONGS · INDEPENDENT MUSIC · ORIGINAL ECHO COVER ART
          </span>
        </div>
        <div className="orb">
          <div className="orbit-line" />
          <AudioLines size={120} />
        </div>
        <span className="hero-index">E / 001</span>
      </section>
      <section>
        <div className="section-heading">
          <div>
            <h2>Fresh frequencies</h2>
            <p>
              {catalog.data?.total ?? ""} songs across{" "}
              {catalog.data?.genres.length ?? ""} genres. Find your next
              favorite.
            </p>
          </div>
          <Link to="/search">
            Explore catalog <ArrowUpRight size={17} />
          </Link>
        </div>
        <State query={tracks}>
          {tracks.data?.length ? <Cards tracks={tracks.data} /> : <Empty />}
        </State>
      </section>
      <section className="feature-grid">
        <Link to="/moodflow" className="feature mood">
          <Radio />
          <span className="eyebrow">TUNE INTO YOU</span>
          <h2>
            A mood.
            <br />A whole new world.
          </h2>
          <p>Let MoodFlow follow your feeling.</p>
          <ArrowUpRight />
        </Link>
        <Link to="/rooms" className="feature rooms">
          <Users />
          <span className="eyebrow">LISTEN TOGETHER</span>
          <h2>
            Different places.
            <br />
            Same frequency.
          </h2>
          <p>Bring your people into EchoRooms.</p>
          <ArrowUpRight />
        </Link>
      </section>
    </main>
  );
}
