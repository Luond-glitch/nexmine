import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export default function Education() {
  const [items, setItems] = useState(null); const [err, setErr] = useState("");
  useEffect(() => { api("/library/education").then((d) => setItems(d.items)).catch((e) => setErr(e.message)); }, []);
  return (
    <section className="pop">
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">Mining education</h1>
      <p className="mt-1 max-w-3xl">General learning material for small-scale gold miners. It is not a substitute for a site assessment. It gives principles, not sizes or designs: those must come from a qualified mining engineer or a licensed EIA expert.</p>
      {err && <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
      <div className="mt-5 space-y-3">{items?.map((m, n) => (
        <details key={m.id} open={n === 0} className="panel pop group" style={{ animationDelay: `${n * 60}ms` }}>
          <summary className="glow cursor-pointer font-display text-xl font-semibold">{m.title}</summary>
          <p className="mt-2 text-moss">{m.summary}</p>
          <ul className="mt-3 ml-5 list-disc space-y-1.5 text-sm">{m.points.map((p) => <li key={p}>{p}</li>)}</ul>
          <p className="mt-3 rounded-lg bg-gold/20 p-3 text-sm"><b className="text-goldhi">Remember: </b>{m.caution}</p></details>))}</div>
    </section>
  );
}
