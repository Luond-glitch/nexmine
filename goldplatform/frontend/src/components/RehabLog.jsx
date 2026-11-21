import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

const ST = { planned: "Planned", in_progress: "In progress", done: "Done" };
const today = () => new Date().toISOString().slice(0, 10);

export default function RehabLog() {
  const [rows, setRows] = useState(null); const [err, setErr] = useState(""); const [f, setF] = useState({ activity: "", description: "", area: "", status: "planned", activity_date: today() });
  const load = () => api("/tools/rehab").then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const add = async (e) => { e.preventDefault(); try { await api("/tools/rehab", { method: "POST", body: { ...f, description: f.description || null, area: f.area || null } }); setF({ activity: "", description: "", area: "", status: "planned", activity_date: today() }); setErr(""); load(); } catch (x) { setErr(x.message); } };
  const move = async (id, status) => { try { await api(`/tools/rehab/${id}`, { method: "PATCH", body: { status } }); load(); } catch (x) { setErr(x.message); } };
  const del = async (id) => { if (!window.confirm("Delete this record?")) return; try { await api(`/tools/rehab/${id}`, { method: "DELETE" }); load(); } catch (x) { setErr(x.message); } };
  const done = rows ? rows.filter((r) => r.status === "done").length : 0;
  return (
    <section className="pop space-y-4">
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">Rehabilitation log</h1>
      <p className="max-w-3xl">Record what you do to restore the land: refilling pits, fencing, replanting, erosion control. A written record helps you plan, and helps when you speak to NEMA or an EIA expert. Only you can see it.</p>
      <form onSubmit={add} className="panel space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="ra" className="label">What was done or planned?</label><input id="ra" required minLength={3} maxLength={120} className="field" value={f.activity} onChange={(e) => setF({ ...f, activity: e.target.value })} placeholder="Refilled the old pit" /></div>
          <div><label htmlFor="rd" className="label">Date</label><input id="rd" type="date" required className="field" value={f.activity_date} onChange={(e) => setF({ ...f, activity_date: e.target.value })} /></div>
          <div><label htmlFor="rr" className="label">Area (optional)</label><input id="rr" maxLength={120} className="field" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} placeholder="North pit" /></div>
          <div><label htmlFor="rs" className="label">Status</label><select id="rs" className="field" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div></div>
        <div><label htmlFor="rn" className="label">Notes (optional)</label><textarea id="rn" rows={3} maxLength={1500} className="field" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        {err && <p role="alert" className="rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}<button className="btn btn-gold">Add to log</button></form>
      {rows && <p className="text-moss">{done} of {rows.length} activities done</p>}
      {rows && !rows.length && <p className="panel">No records yet.</p>}
      <div className="space-y-3">{rows?.map((r) => (
        <article key={r.id} className="panel pop py-4 sm:py-4"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="font-display text-lg font-semibold text-goldhi">{r.activity}</h2><span className="text-sm text-moss">{r.date}{r.area && ` · ${r.area}`}</span></div>
          {r.description && <p className="mt-1 whitespace-pre-wrap text-sm">{r.description}</p>}
          <div className="mt-3 flex flex-wrap gap-2">{Object.entries(ST).map(([k, v]) => <button key={k} onClick={() => move(r.id, k)} aria-pressed={r.status === k} className={`rounded-full px-3 py-1 text-sm font-semibold transition ${r.status === k ? "bg-gradient-to-b from-goldhi to-gold text-canopy" : "bg-white/10 glow"}`}>{v}</button>)}
            <button onClick={() => del(r.id)} className="glow ml-auto text-sm font-semibold">Delete</button></div></article>))}</div>
    </section>
  );
}
