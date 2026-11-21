import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Backdrop from "../components/Backdrop.jsx";
import { api } from "../lib/api.js";

const TABS = ["pending", "approved", "rejected", "all"];

export default function StoryModeration() {
  const [tab, setTab] = useState("pending"); const [rows, setRows] = useState([]); const [err, setErr] = useState(""); const [note, setNote] = useState({});
  const load = useCallback(() => api(`/admin/stories?status=${tab}`).then((d) => { setRows(d); setErr(""); }).catch((e) => setErr(e.message)), [tab]);
  useEffect(() => { load(); }, [load]);
  const decide = async (id, status) => { try { await api(`/admin/stories/${id}/decide`, { method: "POST", body: { status, note: note[id] || null } }); load(); } catch (e) { setErr(e.message); } };
  return (
    <Backdrop src="/images/expert-bg.jpg" tint={0.35}>
      <header className="sticky top-0 z-30 border-b border-gold/30 bg-canopy/90 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <span className="font-display text-lg font-extrabold text-goldhi">Story moderation</span><Link to="/admin" className="glow font-semibold">Expert verification</Link></div></header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <p className="text-moss">Reject allegations against named people or institutions, personal contact details and unverified claims. Anonymous authors are shown to you only.</p>
        <div role="tablist" className="mt-4 flex flex-wrap gap-2">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
          className={`rounded-full px-4 py-2 font-semibold capitalize transition ${tab === t ? "bg-gradient-to-b from-goldhi to-gold text-canopy" : "bg-white/10 glow"}`}>{t}</button>)}</div>
        {err && <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
        {!rows.length && <p className="panel mt-4">Nothing here.</p>}
        <div className="mt-4 space-y-4">{rows.map((s) => (
          <article key={s.id} className="panel pop">
            <h2 className="font-display text-xl font-semibold text-goldhi">{s.title}</h2>
            <p className="text-sm text-moss">{s.category} · author: {s.real_author}{s.author === "Anonymous" && " (shown as Anonymous)"} · {s.status}{s.reports > 0 && ` · ${s.reports} report(s)`}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{s.body}</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1"><label htmlFor={`n${s.id}`} className="label">Note to author (optional)</label><input id={`n${s.id}`} className="field" maxLength={500} value={note[s.id] ?? ""} onChange={(e) => setNote({ ...note, [s.id]: e.target.value })} /></div>
              {s.status !== "approved" && <button onClick={() => decide(s.id, "approved")} className="btn btn-gold">Approve</button>}
              {s.status !== "rejected" && <button onClick={() => decide(s.id, "rejected")} className="btn bg-white/15 glow">Reject</button>}
            </div></article>))}</div>
      </main>
    </Backdrop>
  );
}
