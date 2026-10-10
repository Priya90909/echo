import { Cards, State, useData } from "../components/Catalog.jsx";
export default function Home() {
  const catalog = useData("/catalog");
  return <section className="page-content"><span className="eyebrow">YOUR DAILY DOSE OF DISCOVERY</span>
    <h1>Good music. Better moments.</h1><p>Discover a new sound in the ECHO library.</p>
    <h2>Fresh frequencies</h2><State query={catalog}><p>{catalog.data?.total ?? 0} songs to explore.</p><Cards tracks={catalog.data?.tracks} /></State>
  </section>;
}
