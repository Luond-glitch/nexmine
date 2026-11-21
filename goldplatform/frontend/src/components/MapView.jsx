import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../lib/api.js";

const COLORS = { abandoned_pit: "#c2410c", incident: "#dc2626", rehabilitation: "#16a34a" };
const ST = { pending: "Waiting for review", approved: "Shown on the map", rejected: "Not shown" };

function popup(p) {   // built with textContent so user text can never run as HTML
  const d = document.createElement("div"); const b = document.createElement("b"); b.textContent = p.title; d.append(b);
  const k = document.createElement("div"); k.textContent = p.label + (p.exact ? "" : " (approximate location)"); d.append(k);
  if (p.description) { const t = document.createElement("div"); t.textContent = p.description; d.append(t); }
  return d;
}

export default function MapView() {
  const el = useRef(null), map = useRef(null), layer = useRef(null), pin = useRef(null);
  const [cfg, setCfg] = useState(null), [pts, setPts] = useState([]), [sel, setSel] = useState(null), [err, setErr] = useState(""), [ok, setOk] = useState("");
  const [f, setF] = useState({ kind: "", title: "", description: "" }), [busy, setBusy] = useState(false);
  const load = () => api("/map/points").then(setPts).catch((e) => setErr(e.message));
  useEffect(() => { api("/map/config").then(setCfg).catch((e) => setErr(e.message)); load(); }, []);

  useEffect(() => {
    if (!cfg || !el.current || map.current) return;
    const m = L.map(el.current).setView(cfg.center, cfg.zoom); map.current = m;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", (e) => setSel(e.latlng));
    return () => { m.remove(); map.current = null; };
  }, [cfg]);

  useEffect(() => {
    layer.current?.clearLayers();
    pts.forEach((p) => L.circleMarker([p.lat, p.lon], { radius: 9, color: "#fff", weight: 2, fillColor: COLORS[p.kind], fillOpacity: p.status === "pending" ? 0.5 : 0.95 }).bindPopup(popup(p)).addTo(layer.current));
  }, [pts, cfg]);

  useEffect(() => {
    if (!map.current) return; pin.current?.remove();
    if (sel) pin.current = L.circleMarker(sel, { radius: 11, color: "#ffd84d", weight: 4, fillColor: "#ffd84d", fillOpacity: 0.3 }).addTo(map.current);
  }, [sel]);

  const submit = async (e) => {
    e.preventDefault(); if (!sel) return setErr("Tap the map to choose the spot first.");
    setBusy(true); setErr(""); setOk("");
    try { await api("/map/points", { method: "POST", body: { ...f, description: f.description || null, lat: sel.lat, lon: sel.lng } });
      setF({ kind: "", title: "", description: "" }); setSel(null); setOk("Sent for review. Only you and moderators can see the exact spot. Once approved, others see it only as an approximate location."); load(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const mine = pts.filter((p) => p.mine);

  return (
    <section className="pop space-y-4">
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">Map</h1>
      <p className="max-w-3xl">Abandoned pits, environmental incidents and rehabilitation sites reported by the community. Points are reviewed before they are shown. To protect mining sites, other people see only an approximate location (about 1 km).</p>
      <div className="panel overflow-hidden p-0 sm:p-0"><div ref={el} className="h-[55vh] min-h-[320px] w-full" aria-label="Map of the Bondo area" /></div>
      <ul className="flex flex-wrap gap-4 text-sm">{cfg && Object.entries(cfg.kinds).map(([k, v]) => <li key={k} className="flex items-center gap-2"><span className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: COLORS[k] }} />{v}</li>)}</ul>
      <p className="text-xs text-white/70">The map starts near Bondo town. Abimbo's exact boundary needs an official dataset and is not loaded yet.</p>
      <form onSubmit={submit} className="panel space-y-3">
        <h2 className="font-display text-xl font-semibold text-goldhi">Report a location</h2>
        <p className="text-sm">{sel ? `Spot chosen: ${sel.lat.toFixed(5)}, ${sel.lng.toFixed(5)}` : "Tap the map to choose the spot."}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="mk" className="label">What is it?</label><select id="mk" required className="field" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="">Choose</option>{cfg && Object.entries(cfg.kinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label htmlFor="mt" className="label">Short title</label><input id="mt" required minLength={3} maxLength={120} className="field" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div></div>
        <div><label htmlFor="md" className="label">Details (optional, no phone numbers or names)</label><textarea id="md" rows={3} maxLength={1000} className="field" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        {err && <p role="alert" className="rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}{ok && <p className="rounded-lg bg-white/15 p-3 text-sm">{ok}</p>}
        <button className="btn btn-gold" disabled={busy}>{busy ? "Sending…" : "Submit for review"}</button></form>
      {mine.length > 0 && <div><h2 className="mb-2 font-display text-xl font-semibold text-goldhi">My points</h2><ul className="space-y-2">{mine.map((p) => <li key={p.id} className="panel py-3 sm:py-3">{p.title} <span className="text-sm text-moss">· {p.label} · {ST[p.status]}</span></li>)}</ul></div>}
    </section>
  );
}
