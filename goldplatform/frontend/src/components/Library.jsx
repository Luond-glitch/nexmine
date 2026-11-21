import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";

const BADGE = {
  official: ["Link checked", "bg-gradient-to-b from-goldhi to-gold text-canopy"],
  secondary: ["Confirm on an official site", "bg-white/20 text-goldhi"],
  unchecked: ["Not yet checked", "bg-red-200 text-red-900"],
};

function Link({ url }) {
  return url ? <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-gold mt-3 text-sm">Open official source</a>
             : <p className="mt-3 text-sm text-white/60">No link yet.</p>;
}

export default function Library({ kind }) {
  const [data, setData] = useState(null); const [err, setErr] = useState(""); const [q, setQ] = useState("");
  useEffect(() => { setData(null); api(`/library/${kind}`).then(setData).catch((e) => setErr(e.message)); }, [kind]);
  const items = useMemo(() => (data?.items || []).filter((i) => JSON.stringify(i).toLowerCase().includes(q.toLowerCase())), [data, q]);
  const groups = kind === "sites" ? [...new Set(items.map((i) => i.group))] : [null];
  const title = kind === "regulations" ? "Environmental regulations and mining compliance in Kenya" : "Official websites and authorities";
  const when = data && new Date(data.checked).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <section className="pop">
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">{title}</h1>
      <p className="mt-1 max-w-3xl text-white">Summaries are general guidance, not legal advice. Always read the official text. Links were checked on {when || "…"}; each card shows how far.</p>
      <label htmlFor="lib-q" className="label mt-4">Search</label>
      <input id="lib-q" className="field max-w-md" value={q} onChange={(e) => setQ(e.target.value)} placeholder={kind === "regulations" ? "Try EIA, water, safety" : "Try NEMA, mining, Siaya"} />
      {err && <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
      {data && !items.length && <p className="panel mt-4">Nothing matches that search.</p>}
      {groups.map((g) => (
        <div key={g || "all"} className="mt-6">
          {g && <h2 className="mb-3 font-display text-xl font-semibold text-goldhi shadow-text">{g}</h2>}
          <div className="grid gap-4 md:grid-cols-2">
            {items.filter((i) => !g || i.group === g).map((i, n) => {
              const b = BADGE[i.status];
              return (
                <article key={i.id || i.name} className="panel pop transition duration-300 hover:-translate-y-1 hover:border-goldhi" style={{ animationDelay: `${n * 60}ms` }}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="glow font-display text-lg font-semibold">{i.title || i.name}</h3>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${b[1]}`}>{b[0]}</span>
                  </div>
                  {i.kind && <p className="text-sm text-moss">{i.kind} · Regulator: {i.regulator}</p>}
                  <p className="mt-2 text-sm">{i.purpose || i.what}</p>
                  {i.mining && <p className="mt-2 text-sm"><b className="text-goldhi">For miners: </b>{i.mining}</p>}
                  {i.contact && <p className="mt-2 text-sm"><b className="text-goldhi">Contact: </b>{i.contact}</p>}
                  {i.note && <p className="mt-2 rounded-lg bg-white/10 p-2 text-xs">{i.note}</p>}
                  {i.source && <p className="mt-2 text-xs text-white/60">Source: {i.source}</p>}
                  <Link url={i.link || i.url} />
                </article>);
            })}
          </div>
        </div>))}
    </section>
  );
}
