import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

const BADGE = { official: ["From an official document", "bg-gradient-to-b from-goldhi to-gold text-canopy"], multi: ["Published by several sources", "bg-white/20 text-goldhi"],
                single: ["One source: confirm", "bg-white/20 text-white"], unchecked: ["Not yet verified", "bg-red-200 text-red-900"] };
const tel = (p) => `tel:${p.replace(/[^\d+]/g, "")}`;

export default function Support() {
  const [d, setD] = useState(null); const [err, setErr] = useState("");
  useEffect(() => { api("/library/support").then(setD).catch((e) => setErr(e.message)); }, []);
  return (
    <section className="pop">
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">Contact and support</h1>
      <p role="alert" className="mt-3 rounded-xl border-2 border-red-300 bg-red-700/90 p-4 text-lg font-semibold text-white">Someone hurt, trapped or in danger? Call 999 or 112 now. Do not wait to use the website.</p>
      <p className="mt-2 text-sm text-moss">Tap a number to call on a phone. Numbers are shown with how well they were confirmed, so check anything marked as one source.</p>
      {err && <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
      {d?.groups.map((g) => (
        <div key={g.group} className="mt-6"><h2 className="mb-3 font-display text-xl font-semibold text-goldhi shadow-text">{g.group}</h2>
          <div className="grid gap-4 md:grid-cols-2">{g.items.map((i) => { const b = BADGE[i.status]; return (
            <article key={i.name} className="panel pop transition duration-300 hover:-translate-y-1 hover:border-goldhi">
              <div className="flex items-start justify-between gap-2"><h3 className="glow font-display text-lg font-semibold">{i.name}</h3><span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${b[1]}`}>{b[0]}</span></div>
              <p className="mt-1 text-sm"><b className="text-goldhi">When to call: </b>{i.when}</p>
              <div className="mt-3 flex flex-wrap gap-2">{i.phones.map((p) => <a key={p} href={tel(p)} className="btn btn-gold text-sm">Call {p}</a>)}
                {i.email && <a href={`mailto:${i.email}`} className="btn bg-white/15 text-sm glow">{i.email}</a>}</div>
              {i.extra && <p className="mt-2 text-sm">Also: {i.extra.join(" · ")}</p>}
              {i.note && <p className="mt-2 rounded-lg bg-white/10 p-2 text-xs">{i.note}</p>}</article>); })}</div></div>))}
      <div className="mt-6"><h2 className="mb-3 font-display text-xl font-semibold text-goldhi shadow-text">This platform</h2>
        <article className="panel"><p>Ask the <b className="text-goldhi">AI Mining Assistant</b> a question, or open <b className="text-goldhi">EIA Experts</b> and send a consultation request. Experts reply through messages on the platform.</p>
          {(d?.platform.email || d?.platform.phone) && <p className="mt-2">Platform support: {d.platform.email && <a className="glow underline" href={`mailto:${d.platform.email}`}>{d.platform.email}</a>} {d.platform.phone && <a className="glow underline" href={tel(d.platform.phone)}>{d.platform.phone}</a>}</p>}</article></div>
    </section>
  );
}
