import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

const ST = { accepted: "In progress", closed: "Completed" };
const kb = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const when = (i) => new Date(i).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function Reports() {
  const [d, setD] = useState(null); const [err, setErr] = useState("");
  useEffect(() => { api("/expert/records").then(setD).catch((e) => setErr(e.message)); }, []);
  const csv = () => {
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Reference", "Service", "Location", "Status", "Date", "Rating", "Comment"], ...d.rows.map((r) => [r.ref, r.service, r.location, ST[r.status] || r.status, when(r.created), r.stars, r.comment])];
    const url = URL.createObjectURL(new Blob([lines.map((l) => l.map(q).join(",")).join("\n")], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "consultation-records.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const tiles = d && [["Accepted", d.stats.accepted], ["In progress", d.stats.active], ["Completed", d.stats.completed], ["Average rating", d.stats.rating ? `${d.stats.rating} / 5 (${d.stats.rating_count})` : "No ratings yet"]];
  return (
    <section className="pop space-y-5">
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">Reports and records</h1>
      {err && <p role="alert" className="rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
      {tiles && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{tiles.map(([l, v]) => <div key={l} className="panel py-4 text-center sm:py-4"><p className="text-sm text-moss">{l}</p><p className="font-display text-2xl font-extrabold text-goldhi">{v}</p></div>)}</div>}
      {d && <div className="panel overflow-x-auto"><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-semibold text-goldhi">Consultation history</h2>
        <button onClick={csv} disabled={!d.rows.length} className="btn btn-gold text-sm">Download CSV</button></div>
        {!d.rows.length ? <p>No consultations yet. Accept a request under Available Clients.</p> : (
          <table className="w-full min-w-[560px] text-left text-sm"><thead className="text-goldhi"><tr><th className="py-1 pr-3">Ref</th><th className="pr-3">Service</th><th className="pr-3">Place</th><th className="pr-3">Status</th><th className="pr-3">Date</th><th>Rating</th></tr></thead>
            <tbody>{d.rows.map((r) => <tr key={r.ref} className="border-t border-white/10"><td className="py-2 pr-3">{r.ref}</td><td className="pr-3">{r.service}</td><td className="pr-3">{r.location}</td><td className="pr-3">{ST[r.status] || r.status}</td><td className="pr-3">{when(r.created)}</td><td>{r.stars ? `${r.stars}/5` : "-"}</td></tr>)}</tbody></table>)}</div>}
      {d && <div className="panel"><h2 className="mb-2 font-display text-xl font-semibold text-goldhi">Documents</h2>
        {!d.files.length ? <p className="text-sm">Files shared in your consultations appear here.</p> : <ul className="space-y-2 text-sm">{d.files.map((f) => <li key={f.id}><a href={`/api/consult/files/${f.id}`} download className="glow font-semibold text-goldhi underline">{f.name}</a> <span className="text-moss">· {f.ref} · {kb(f.size)} · {when(f.at)}</span></li>)}</ul>}</div>}
    </section>
  );
}
