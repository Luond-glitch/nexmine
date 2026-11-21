import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Backdrop from "../components/Backdrop.jsx";
import { api } from "../lib/api.js";

function AdminMap() {
  const [rows, setRows] = useState([]); const [err, setErr] = useState("");
  const load = () => api("/admin/map?status=pending").then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const decide = async (id, status) => { try { await api(`/admin/map/${id}/decide`, { method: "POST", body: { status } }); load(); } catch (e) { setErr(e.message); } };
  return (
    <div className="space-y-3"><h2 className="font-display text-2xl font-extrabold text-goldhi shadow-text">Map points awaiting review</h2>
      {err && <p role="alert" className="rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
      {!rows.length && <p className="panel">Nothing waiting.</p>}
      {rows.map((p) => <div key={p.id} className="panel space-y-2 py-4 sm:py-4"><b>{p.title}</b> <span className="text-sm text-moss">{p.label} · {p.lat.toFixed(5)}, {p.lon.toFixed(5)}</span>
        {p.description && <p className="text-sm">{p.description}</p>}
        <div className="flex gap-2"><button onClick={() => decide(p.id, "approved")} className="btn btn-gold">Approve</button><button onClick={() => decide(p.id, "rejected")} className="btn bg-white/15 glow">Reject</button></div></div>)}</div>
  );
}

export default function AdminContent() {
  const [items, setItems] = useState([]); const [f, setF] = useState({ title: "", issuer: "", category: "", url: "https://", summary: "" }); const [err, setErr] = useState("");
  const load = () => api("/resources").then((d) => setItems(d.filter((x) => x.added)));
  useEffect(() => { load(); }, []);
  const add = async (e) => { e.preventDefault(); try { await api("/admin/resources", { method: "POST", body: { ...f, summary: f.summary || null } }); setF({ title: "", issuer: "", category: "", url: "https://", summary: "" }); setErr(""); load(); } catch (x) { setErr(x.message); } };
  const del = async (id) => { await api(`/admin/resources/${id}`, { method: "DELETE" }); load(); };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Backdrop src="/images/expert-bg.jpg" tint={0.35}>
      <header className="sticky top-0 z-30 border-b border-gold/30 bg-canopy/90 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <span className="font-display text-lg font-extrabold text-goldhi">Research library content</span><Link to="/admin" className="glow font-semibold">Expert verification</Link></div></header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <form onSubmit={add} className="panel space-y-3"><h1 className="font-display text-2xl font-extrabold text-goldhi">Add a source</h1>
          <p className="text-sm text-moss">Only add papers and documents you have opened and checked. The link must start with https://.</p>
          {[["title", "Title"], ["issuer", "Author or issuing institution"], ["category", "Category (for example Paper, Report, Law)"], ["url", "Link"], ["summary", "Short summary (optional)"]].map(([k, l]) => (
            <div key={k}><label htmlFor={`r${k}`} className="label">{l}</label><input id={`r${k}`} className="field" required={k !== "summary"} value={f[k]} onChange={set(k)} /></div>))}
          {err && <p role="alert" className="rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}<button className="btn btn-gold">Publish</button></form>
        <div className="space-y-3">{items.map((r) => <div key={r.id} className="panel flex items-center justify-between gap-3 py-3 sm:py-3"><span>{r.title}</span><button onClick={() => del(r.id)} className="btn bg-white/15 glow">Remove</button></div>)}</div>
        <AdminMap />
      </main>
    </Backdrop>
  );
}
