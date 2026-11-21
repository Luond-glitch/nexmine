import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

const TITLE = { safety: "Mining safety and shaft collapse prevention", environment: "Environmental protection and rehabilitation" };

export default function Guides({ topic }) {
  const [d, setD] = useState(null); const [err, setErr] = useState("");
  useEffect(() => { setD(null); api(`/library/guides/${topic}`).then(setD).catch((e) => setErr(e.message)); }, [topic]);
  return (
    <section className="pop">
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">{TITLE[topic]}</h1>
      <p className="mt-1 max-w-3xl">General good-practice guidance, not legal requirements and not a site assessment. Each card links to the law it relates to, where there is one. For your own site, consult a licensed EIA expert.</p>
      {d?.emergency && <p role="alert" className="mt-4 rounded-xl border-2 border-red-300 bg-red-700/90 p-4 text-lg font-semibold text-white">{d.emergency}</p>}
      {err && <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {d?.items.map((g, n) => (
          <article key={g.id} className="panel pop transition duration-300 hover:-translate-y-1 hover:border-goldhi" style={{ animationDelay: `${n * 60}ms` }}>
            <h2 className="glow font-display text-lg font-semibold">{g.title}</h2>
            <p className="mt-1 text-sm text-moss">{g.intro}</p>
            <h3 className="mt-3 text-sm font-bold text-goldhi">Do</h3>
            <ul className="ml-5 list-disc text-sm">{g.do.map((x) => <li key={x}>{x}</li>)}</ul>
            <h3 className="mt-3 text-sm font-bold text-goldhi">Do not</h3>
            <ul className="ml-5 list-disc text-sm">{g.dont.map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="mt-3 text-sm"><b className="text-goldhi">Get help: </b>{g.help}</p>
            {g.law && <a href={g.law.link} target="_blank" rel="noopener noreferrer" className="glow mt-2 inline-block text-sm font-semibold text-goldhi underline">Related law: {g.law.title}</a>}
          </article>))}
      </div>
    </section>
  );
}
