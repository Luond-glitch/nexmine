import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

const HELP = { safety: "Mining Safety", environment: "Environmental Protection", regs: "Environmental Regulations", experts: "EIA Experts", edu: "Mining Education", support: "Contact and Support", stories: "Community Stories" };

export default function Checklist({ go }) {
  const [d, setD] = useState(null); const [a, setA] = useState({}); const [score, setScore] = useState(null); const [err, setErr] = useState(""); const [saved, setSaved] = useState("");
  useEffect(() => { api("/tools/checklist").then((x) => { setD(x); setA(x.answers); setScore(x.score); }).catch((e) => setErr(e.message)); }, []);
  const pick = async (id, v) => {
    const next = { ...a, [id]: v }; setA(next); setSaved("");
    try { const r = await api("/tools/checklist", { method: "PUT", body: { answers: next } }); setScore(r.score); setSaved("Saved"); } catch (e) { setErr(e.message); }
  };
  const todo = d ? d.groups.flatMap((g) => g.items).filter((i) => a[i.id] !== "yes") : [];
  return (
    <section className="pop space-y-4">
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">Environmental self-assessment</h1>
      <p className="max-w-3xl">Answer honestly. This is a good-practice check for you, not a legal compliance test or a certificate. Your answers are saved automatically and only you can see them.</p>
      {err && <p role="alert" className="rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
      {score && <div className="panel"><div className="flex items-center justify-between"><b className="text-goldhi">{score.yes} of {score.total} in place</b><span className="text-sm text-moss">{saved}</span></div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={score.percent} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-gradient-to-r from-gold to-goldhi transition-all duration-700" style={{ width: `${score.percent}%` }} /></div></div>}
      {d?.groups.map((g) => (
        <fieldset key={g.group} className="panel"><legend className="px-2 font-display text-xl font-semibold text-goldhi">{g.group}</legend>
          <ul className="space-y-4">{g.items.map((i) => (
            <li key={i.id}><p>{i.text}</p>
              <div role="radiogroup" aria-label={i.text} className="mt-2 flex flex-wrap gap-2">{[["yes", "Yes"], ["no", "No"], ["unsure", "Not sure"]].map(([v, l]) => (
                <button key={v} role="radio" aria-checked={a[i.id] === v} onClick={() => pick(i.id, v)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${a[i.id] === v ? "bg-gradient-to-b from-goldhi to-gold text-canopy" : "bg-white/10 glow"}`}>{l}</button>))}</div></li>))}</ul></fieldset>))}
      {d && todo.length > 0 && <div className="panel"><h2 className="font-display text-xl font-semibold text-goldhi">What to work on ({todo.length})</h2>
        <ul className="mt-2 space-y-1.5 text-sm">{todo.map((i) => <li key={i.id}>{i.text} <button onClick={() => go(i.help === "stories" ? "stories" : i.help)} className="glow font-semibold text-goldhi underline">{HELP[i.help]}</button></li>)}</ul></div>}
    </section>
  );
}
