import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Backdrop from "../components/Backdrop.jsx";
import { api } from "../lib/api.js";

const TABS = ["Analytics", "Users", "Audit log"];
const Group = ({ title, data }) => (
  <div className="panel py-4 sm:py-4"><h3 className="mb-2 font-semibold text-goldhi">{title}</h3>
    {Object.keys(data || {}).length ? <ul className="space-y-1 text-sm">{Object.entries(data).map(([k, v]) => <li key={k} className="flex justify-between"><span className="capitalize">{k.replace("_", " ")}</span><b>{v}</b></li>)}</ul> : <p className="text-sm text-moss">No data yet.</p>}</div>
);

export default function AdminUsers() {
  const [tab, setTab] = useState("Analytics"); const [an, setAn] = useState(null); const [users, setUsers] = useState([]); const [audit, setAudit] = useState([]);
  const [role, setRole] = useState(""); const [q, setQ] = useState(""); const [err, setErr] = useState("");
  const loadUsers = useCallback(() => api(`/admin/users?${role ? `role=${role}&` : ""}${q ? `q=${encodeURIComponent(q)}` : ""}`).then(setUsers).catch((e) => setErr(e.message)), [role, q]);
  useEffect(() => { if (tab === "Analytics") api("/admin/analytics").then(setAn).catch((e) => setErr(e.message)); if (tab === "Audit log") api("/admin/audit").then(setAudit).catch((e) => setErr(e.message)); }, [tab]);
  useEffect(() => { if (tab === "Users") loadUsers(); }, [tab, loadUsers]);
  const toggle = async (u) => { try { await api(`/admin/users/${u.id}/active`, { method: "POST", body: { active: !u.active } }); loadUsers(); } catch (e) { setErr(e.message); } };
  return (
    <Backdrop src="/images/expert-bg.jpg" tint={0.35}>
      <header className="sticky top-0 z-30 border-b border-gold/30 bg-canopy/90 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <span className="font-display text-lg font-extrabold text-goldhi">Users and analytics</span><Link to="/admin" className="glow font-semibold">Expert verification</Link></div></header>
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div role="tablist" className="flex flex-wrap gap-2">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setErr(""); }} className={`rounded-full px-4 py-2 font-semibold transition ${tab === t ? "bg-gradient-to-b from-goldhi to-gold text-canopy" : "bg-white/10 glow"}`}>{t}</button>)}</div>
        {err && <p role="alert" className="rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
        {tab === "Analytics" && an && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Group title="Users by portal" data={an.users} /><Group title="Experts by status" data={an.experts} /><Group title="Consultation requests" data={an.requests} />
          <Group title="Stories" data={an.stories} /><Group title="Map points" data={an.map_points} /><Group title="AI answers, last 30 days" data={an.ai_30_days} />
          <Group title="Activity" data={{ discussions: an.discussions, messages: an.messages, files: an.files, deactivated_users: an.inactive_users, average_rating: an.average_rating ?? "none" }} /></div>}
        {tab === "Users" && <>
          <div className="flex flex-wrap items-end gap-3"><div><label htmlFor="ur" className="label">Portal</label><select id="ur" className="field" value={role} onChange={(e) => setRole(e.target.value)}><option value="">All</option>{["miner", "expert", "researcher", "admin"].map((r) => <option key={r}>{r}</option>)}</select></div>
            <div className="min-w-[200px] flex-1"><label htmlFor="uq" className="label">Search name, email or phone</label><input id="uq" className="field" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
          <div className="panel overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="text-goldhi"><tr><th className="py-1 pr-3">Name</th><th className="pr-3">Portal</th><th className="pr-3">Email</th><th className="pr-3">Phone</th><th className="pr-3">Status</th><th /></tr></thead>
            <tbody>{users.map((u) => <tr key={u.id} className="border-t border-white/10"><td className="py-2 pr-3">{u.name}</td><td className="pr-3 capitalize">{u.role}</td><td className="pr-3">{u.email || "-"}</td><td className="pr-3">{u.phone || "-"}</td>
              <td className="pr-3">{u.active ? "Active" : "Deactivated"}</td><td><button onClick={() => toggle(u)} className="glow font-semibold text-goldhi underline">{u.active ? "Deactivate" : "Reactivate"}</button></td></tr>)}</tbody></table>
            {!users.length && <p className="p-3">No users match.</p>}</div></>}
        {tab === "Audit log" && <div className="panel overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="text-goldhi"><tr><th className="py-1 pr-3">When</th><th className="pr-3">Action</th><th className="pr-3">Detail</th><th>IP</th></tr></thead>
          <tbody>{audit.map((a) => <tr key={a.id} className="border-t border-white/10"><td className="py-2 pr-3">{a.at && new Date(a.at).toLocaleString("en-GB")}</td><td className="pr-3">{a.action}</td><td className="pr-3">{a.detail}</td><td>{a.ip}</td></tr>)}</tbody></table></div>}
      </main>
    </Backdrop>
  );
}
