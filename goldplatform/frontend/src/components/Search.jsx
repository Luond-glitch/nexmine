import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export default function Search({ q, go }) {
  const [d, setD] = useState(null); const [err, setErr] = useState("");
  useEffect(() => { setD(null); setErr(""); api(`/search?q=${encodeURIComponent(q)}`).then(setD).catch((e) => setErr(e.message)); }, [q]);
  return (
    <section className="pop">
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">Search: {q}</h1>
      {err && <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
      {d && !d.groups.length && <p className="panel mt-4">Nothing found. Try a different word, such as mercury, NEMA, permit or shaft.</p>}
      {d?.groups.map((g) => (
        <div key={g.name} className="mt-5"><h2 className="mb-2 font-display text-xl font-semibold text-goldhi shadow-text">{g.name}</h2>
          <ul className="space-y-2">{g.items.map((i, n) => (
            <li key={n} className="panel py-3 sm:py-3"><button onClick={() => go(i.view)} className="glow text-left font-display text-lg font-semibold">{i.title}</button>
              {i.snippet && <p className="text-sm">{i.snippet}</p>}
              {i.url && <a href={i.url} target="_blank" rel="noopener noreferrer" className="glow text-sm font-semibold text-goldhi underline">Open source</a>}</li>))}</ul></div>))}
    </section>
  );
}
