import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

const when = (i) => i && new Date(i).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function Discussions() {
  const [list, setList] = useState(null); const [open, setOpen] = useState(null); const [t, setT] = useState(null); const [topics, setTopics] = useState([]);
  const [f, setF] = useState({ title: "", body: "", topic: "" }); const [r, setR] = useState(""); const [err, setErr] = useState(""); const [form, setForm] = useState(false);
  const load = () => api("/discuss").then(setList).catch((e) => setErr(e.message));
  useEffect(() => { load(); api("/discuss/topics").then(setTopics); }, []);
  useEffect(() => { if (open) api(`/discuss/${open}`).then(setT).catch((e) => setErr(e.message)); else setT(null); }, [open]);
  const create = async (e) => { e.preventDefault(); try { await api("/discuss", { method: "POST", body: f }); setF({ title: "", body: "", topic: "" }); setForm(false); setErr(""); load(); } catch (x) { setErr(x.message); } };
  const reply = async (e) => { e.preventDefault(); try { setT(await api(`/discuss/${open}/replies`, { method: "POST", body: { body: r } })); setR(""); setErr(""); } catch (x) { setErr(x.message); } };

  if (open && t) return (
    <article className="panel pop">
      <button onClick={() => { setOpen(null); load(); }} className="glow mb-3 text-sm font-semibold">Back to discussions</button>
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">{t.title}</h1>
      <p className="text-sm text-moss">{t.topic} · {t.author} ({t.role}) · {when(t.created)}</p>
      <p className="mt-4 whitespace-pre-wrap">{t.body}</p>
      <h2 className="mt-6 font-display text-xl font-semibold text-goldhi">Replies ({t.thread.length})</h2>
      <ul className="mt-2 space-y-2">{t.thread.map((x) => <li key={x.id} className="rounded-lg bg-white/10 p-3 text-sm"><b className="text-goldhi">{x.author}</b> · {when(x.at)}<br />{x.body}</li>)}</ul>
      <form onSubmit={reply} className="mt-3 flex gap-2"><label htmlFor="rp" className="sr-only">Reply</label>
        <input id="rp" className="field" maxLength={2000} value={r} onChange={(e) => setR(e.target.value)} placeholder="Write a reply" /><button className="btn btn-gold" disabled={r.trim().length < 2}>Reply</button></form>
      {err && <p role="alert" className="mt-3 rounded-lg bg-red-100 p-2 text-sm text-red-800">{err}</p>}
    </article>);

  return (
    <section className="pop">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">Research discussions</h1>
        <button onClick={() => setForm(!form)} className="btn btn-gold" aria-expanded={form}>{form ? "Cancel" : "Start a discussion"}</button></div>
      <p className="mt-1 text-moss">Ask questions, share methods and look for collaborators. Do not post phone numbers or accuse named people.</p>
      {form && <form onSubmit={create} className="panel mt-4 space-y-3">
        <div><label htmlFor="dt" className="label">Title</label><input id="dt" required minLength={5} maxLength={140} className="field" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><label htmlFor="dp" className="label">Topic</label><select id="dp" required className="field" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}><option value="">Choose a topic</option>{topics.map((x) => <option key={x}>{x}</option>)}</select></div>
        <div><label htmlFor="db" className="label">Your question or idea</label><textarea id="db" required minLength={20} maxLength={4000} rows={5} className="field" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
        <button className="btn btn-gold">Post</button></form>}
      {err && <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
      {list && !list.length && <p className="panel mt-4">No discussions yet. Start the first one.</p>}
      <div className="mt-4 space-y-3">{list?.map((d, n) => (
        <button key={d.id} onClick={() => setOpen(d.id)} style={{ animationDelay: `${n * 50}ms` }} className="panel pop block w-full py-4 text-left transition duration-300 hover:-translate-y-0.5 hover:border-goldhi sm:py-4">
          <h2 className="glow font-display text-lg font-semibold">{d.title}</h2>
          <p className="text-xs text-moss">{d.topic} · {d.author} ({d.role}) · {when(d.created)} · {d.replies} replies</p></button>))}</div>
    </section>
  );
}

export function ResearchLibrary() {
  const [items, setItems] = useState(null); const [q, setQ] = useState(""); const [err, setErr] = useState("");
  useEffect(() => { api("/resources").then(setItems).catch((e) => setErr(e.message)); }, []);
  const shown = (items || []).filter((i) => JSON.stringify(i).toLowerCase().includes(q.toLowerCase()));
  return (
    <section className="pop">
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">Research library</h1>
      <p className="mt-1 max-w-3xl">Links to official and authoritative sources. Academic papers are added by administrators once checked; the AI assistant never invents references.</p>
      <label htmlFor="rq" className="label mt-4">Search</label><input id="rq" className="field max-w-md" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">{shown.map((r, n) => (
        <article key={r.id ?? r.url} className="panel pop transition duration-300 hover:-translate-y-1 hover:border-goldhi" style={{ animationDelay: `${n * 50}ms` }}>
          <p className="text-xs font-bold text-goldhi">{r.category}{r.added && " · added by administrator"}</p>
          <h2 className="glow font-display text-lg font-semibold">{r.title}</h2><p className="text-sm text-moss">{r.issuer}</p>
          {r.summary && <p className="mt-2 text-sm">{r.summary}</p>}
          <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn btn-gold mt-3 text-sm">Open source</a></article>))}</div>
    </section>
  );
}

const TOPICS = ["Environmental impacts of artisanal gold mining", "Gold mining and water quality", "Gold mining and soil contamination", "Gold mining and biodiversity",
  "Environmental Impact Assessment", "Environmental legislation in Kenya", "Mining waste and tailings", "Mercury use and pollution", "Mine rehabilitation",
  "Sustainable mining practices", "Community participation in environmental governance", "Climate change and mining", "Occupational safety in small-scale mining"];

export function Topics({ ask }) {
  return (
    <section className="pop">
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">Mining and environmental topics</h1>
      <p className="mt-1 text-moss">Choose a topic and the AI assistant will give an overview, key terms and where to read more. For laws and official documents see the Research Library.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{TOPICS.map((t, n) => (
        <article key={t} className="panel pop flex flex-col justify-between transition duration-300 hover:-translate-y-1 hover:border-goldhi" style={{ animationDelay: `${n * 40}ms` }}>
          <h2 className="glow font-display text-lg font-semibold">{t}</h2>
          <button onClick={() => ask(`Give me an overview of: ${t}. Include key terms and what to read next.`)} className="btn btn-gold mt-4 text-sm">Ask the assistant</button></article>))}</div>
    </section>
  );
}
