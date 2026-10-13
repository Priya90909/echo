import {} from "@echo/shared";
import { useData, State, Tracks } from "../components/Catalog.jsx";
export default function Collection({ history = false }) {
  const data = useData(history ? "/history" : "/likes");
  return (
    <main className="page">
      <span className="eyebrow">YOUR SOUNDPRINT</span>
      <h1>{history ? "Recently in your world." : "The ones you love."}</h1>
      <State query={data}>
        <Tracks
          tracks={
            history
              ? Array.from(
                  new Map(
                    data.data
                      ?.filter((e) => e.track)
                      .map((e) => [e.track._id, e.track]),
                  ).values(),
                )
              : data.data
          }
        />
      </State>
    </main>
  );
}
