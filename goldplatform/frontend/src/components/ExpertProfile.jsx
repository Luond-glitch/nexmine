import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

const AV = { available: "Available", busy: "Busy", away: "Away" };

export default function ExpertProfile() {
  const [p, setP] = useState(null); const [err, setErr] = useState(""); const [ok, setOk] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { api("/expert/me").then(setP).catch((e) => setErr(e.message)); }, []);
  if (!p) return <p className="panel">{err || "Loading…"}</p>;
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });
  const toggle = (s) => setP({ ...p, services: p.services.includes(s) ? p.services.filter((x) => x !== s) : [...p.services, s] });
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr(""); setOk("");
    try { const { firm_name, location, county, qualifications, expertise, years_experience, bio, availability, services, whatsapp } = p;
      setP(await api("/expert/me", { method: "PUT", body: { firm_name, location, county, qualifications, expertise, years_experience: years_experience === "" ? null : Number(years_experience), bio, availability, services, whatsapp } })); setOk("Saved."); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const T = ({ id, label, k, type = "text" }) => (<div><label htmlFor={id} className="label">{label}</label><input id={id} type={type} className="field" value={p[k] ?? ""} onChange={set(k)} /></div>);
  return (
    <form onSubmit={save} className="panel pop space-y-4">
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">My profile and services</h1>
      <p className="rounded-lg bg-white/10 p-3 text-sm">Name: <b>{p.name}</b> · EIA licence: <b>{p.licence}</b> · Status: <b className="text-goldhi">{p.verification === "verified" ? "Active" : p.verification}</b>. Your name and licence number can only be changed by an administrator.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <T id="firm" label="Consultancy or firm" k="firm_name" /><T id="loc" label="Physical location" k="location" /><T id="cty" label="County" k="county" />
        <T id="yrs" label="Years of experience" k="years_experience" type="number" /><T id="qual" label="Professional qualifications" k="qualifications" /><T id="exp" label="Areas of expertise" k="expertise" /></div>
      <div><label htmlFor="bio" className="label">Short professional biography</label><textarea id="bio" rows={4} maxLength={1200} className="field" value={p.bio ?? ""} onChange={set("bio")} /></div>
      <div><label htmlFor="av" className="label">Availability</label><select id="av" className="field max-w-xs" value={p.availability} onChange={set("availability")}>{Object.entries(AV).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={!!p.whatsapp} onChange={(e) => setP({ ...p, whatsapp: e.target.checked })} /> Allow a miner to start a WhatsApp chat with me after I accept their request. Your number is shared only then, and only with that miner.</label>
      <fieldset><legend className="label">Services you offer</legend><div className="grid gap-2 sm:grid-cols-2">{p.all_services.map((s) => (
        <label key={s} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.services.includes(s)} onChange={() => toggle(s)} /> {s}</label>))}</div></fieldset>
      {err && <p role="alert" className="rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}{ok && <p className="rounded-lg bg-white/15 p-3">{ok}</p>}
      <button className="btn btn-gold" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
    </form>
  );
}
