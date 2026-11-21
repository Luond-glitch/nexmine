import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export default function ExpertDirectory({ onRequest }) {
  const [cty, setCty] = useState(""); const [list, setList] = useState(null); const [err, setErr] = useState("");
  useEffect(() => { api("/experts").then(setList).catch((e) => setErr(e.message)); }, []);
  return (
    <section className="pop">
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">Find an EIA expert</h1>
      <p className="mt-1 text-moss">Only experts whose EIA licence has been verified by an administrator appear here.</p>
      {err && <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
      {list && !list.length && <p className="panel mt-4">No verified experts yet. Check back soon.</p>}
      <div className="mt-4"><label htmlFor="cty" className="label">Filter by county</label><select id="cty" className="field max-w-xs" value={cty} onChange={(e) => setCty(e.target.value)}><option value="">All counties</option>{[...new Set((list || []).map((x) => x.county))].sort().map((c) => <option key={c}>{c}</option>)}</select></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {list?.filter((x) => !cty || x.county === cty).map((e, i) => (
          <article key={e.id} className="panel pop transition duration-300 hover:-translate-y-1 hover:border-goldhi" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-xl font-semibold glow">{e.name}</h2>
              <span className="rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-canopy">Verified</span>
            </div>
            {e.firm && <p className="text-moss">{e.firm}</p>}
            {e.bio && <p className="mt-1 text-sm">{e.bio}</p>}
            <dl className="mt-3 space-y-1 text-sm">
              <div><dt className="inline font-semibold text-goldhi">Licence: </dt><dd className="inline">{e.licence}</dd></div>
              <div><dt className="inline font-semibold text-goldhi">Location: </dt><dd className="inline">{e.location}, {e.county}</dd></div>
              {e.years != null && <div><dt className="inline font-semibold text-goldhi">Experience: </dt><dd className="inline">{e.years} years</dd></div>}
              {e.rating_count > 0 && <div><dt className="inline font-semibold text-goldhi">Rating: </dt><dd className="inline">{e.rating} / 5 ({e.rating_count})</dd></div>}
              {e.availability && <div><dt className="inline font-semibold text-goldhi">Availability: </dt><dd className="inline capitalize">{e.availability}</dd></div>}
              {e.services?.length > 0 && <div><dt className="inline font-semibold text-goldhi">Services: </dt><dd className="inline">{e.services.join(", ")}</dd></div>}
              {e.expertise && <div><dt className="inline font-semibold text-goldhi">Expertise: </dt><dd className="inline">{e.expertise}</dd></div>}
              {e.qualifications && <div><dt className="inline font-semibold text-goldhi">Qualifications: </dt><dd className="inline">{e.qualifications}</dd></div>}
            </dl>
            <button onClick={() => onRequest(e)} className="btn btn-gold mt-4">Request consultation</button>
            <p className="mt-2 text-xs text-white/60">Private contact details stay hidden. Talk through messages on the platform.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
