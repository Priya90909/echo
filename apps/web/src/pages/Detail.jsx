import { useParams } from "react-router-dom";
import { Cards, State, useData } from "../components/Catalog.jsx";
export default function Detail({ kind }) {
  const { id } = useParams();
  const query = useData(`/${kind}/${id}`);
  return <section className="page-content"><State query={query}><span className="eyebrow">{kind}</span><h1>{query.data?.item.name ?? query.data?.item.title}</h1><p>{query.data?.item.bio}</p><Cards tracks={query.data?.tracks} /></State></section>;
}
