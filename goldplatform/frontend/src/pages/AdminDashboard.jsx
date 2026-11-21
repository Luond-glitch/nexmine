import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Backdrop from "../components/Backdrop.jsx";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";

const TABS = ["all", "pending", "verified", "rejected", "suspended"];
const LABEL = { all: "All", pending: "Pending verification", verified: "Active", rejected: "Rejected", suspended: "Suspended" };
const ACTIONS = { pending: [["verified", "Approve"], ["rejected", "Reject"]], verified: [["suspended", "Suspend"]],
                  rejected: [["verified", "Approve"]], suspended: [["verified", "Reinstate"]] };

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("all"); const [rows, setRows] = useState([]); const [counts, setCounts] = useState({});
  const [ai, setAi] = useState(null);
  const [err, setErr] = useState(""); const [note, setNote] = useState({});
  const load = useCallback(() => api(`/admin/experts?status=${tab}`).then((d) => { setRows(d.items); setCounts(d.counts); setErr(""); }).catch((e) => setErr(e.message)), [tab]);
  useEffect(() => { load(); }, [load]);
  const decide = async (id, status) => {
    try { await api(`/admin/experts/${id}/status`, { method: "POST", body: { status, note: note[id] || null } }); setNote({}); load(); }
    catch (e) { setErr(e.message); }
  };
  return (
    <Backdrop src="/images/expert-bg.jpg" tint={0.35}>
      <header className="sticky top-0 z-30 border-b border-gold/30 bg-canopy/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="font-display text-lg font-extrabold text-goldhi">Super Administrator</span>
          <div className="flex items-center gap-3"><Link to="/admin/overview" className="glow font-semibold">Users and analytics</Link><Link to="/admin/stories" className="glow font-semibold">Story moderation</Link><Link to="/admin/content" className="glow hidden font-semibold sm:inline">Research content</Link><span className="hidden sm:inline">{user.full_name}</span>
            <button onClick={logout} className="glow rounded px-3 py-1.5 font-semibold">Logout</button></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">Expert verification</h1>
        <p className="mt-1 text-moss">Check each EIA licence against the official register before approving. Approved experts become Active and appear to miners.</p>
        <div role="tablist" className="mt-5 flex flex-wrap gap-2">
          {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setErr(""); }}
            className={`rounded-full px-4 py-2 font-semibold transition ${tab === t ? "bg-gradient-to-b from-goldhi to-gold text-canopy" : "bg-white/10 glow"}`}>{LABEL[t]}{t !== "all" && ` (${counts[t] ?? 0})`}</button>)}
          <button onClick={() => api("/chat/health").then(setAi).catch((e) => setAi([{ provider: "Error", ok: false, error: e.message }]))} className="ml-auto rounded-full bg-white/10 px-4 py-2 font-semibold glow">Test AI providers</button>
        </div>
        {ai && <ul className="panel mt-4 space-y-1 text-sm">{ai.map((p) => <li key={p.provider}><b className="text-goldhi">{p.provider}</b>: {p.ok ? `working (${p.model})` : p.error}</li>)}</ul>}
        {err && <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
        {!rows.length && <p className="panel mt-4">Nobody in this list.</p>}
        <div className="mt-4 space-y-4">
          {rows.map((e) => (
            <article key={e.id} className="panel pop">
              <h2 className="font-display text-xl font-semibold text-goldhi">{e.name} <span className="rounded-full bg-white/15 px-2 py-0.5 align-middle text-xs text-white">{LABEL[e.status]}</span> <span className="text-base font-normal text-moss">{e.firm}</span></h2>
              <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div><dt className="inline font-semibold text-goldhi">Licence: </dt><dd className="inline">{e.licence}</dd></div>
                <div><dt className="inline font-semibold text-goldhi">Email: </dt><dd className="inline">{e.email}</dd></div>
                <div><dt className="inline font-semibold text-goldhi">Phone: </dt><dd className="inline">{e.phone}</dd></div>
                <div><dt className="inline font-semibold text-goldhi">Where: </dt><dd className="inline">{e.location}, {e.county}</dd></div>
                <div><dt className="inline font-semibold text-goldhi">Experience: </dt><dd className="inline">{e.years ?? "n/a"} years</dd></div>
                <div><dt className="inline font-semibold text-goldhi">Expertise: </dt><dd className="inline">{e.expertise || "n/a"}</dd></div>
                <div className="sm:col-span-2"><dt className="inline font-semibold text-goldhi">Qualifications: </dt><dd className="inline">{e.qualifications || "n/a"}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1"><label htmlFor={`n${e.id}`} className="label">Note (optional)</label>
                  <input id={`n${e.id}`} className="field" maxLength={500} value={note[e.id] ?? ""} onChange={(x) => setNote({ ...note, [e.id]: x.target.value })} /></div>
                {ACTIONS[e.status].map(([s, l]) => <button key={s} onClick={() => decide(e.id, s)} className={`btn ${s === "verified" ? "btn-gold" : "bg-white/15 glow"}`}>{l}</button>)}
              </div>
            </article>))}
        </div>
      </main>
    </Backdrop>
  );
}
