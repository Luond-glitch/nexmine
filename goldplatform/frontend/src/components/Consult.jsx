import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api.js";

const STATUS = { open: ["Waiting for an expert", "bg-white/20 text-goldhi"], accepted: ["Accepted", "bg-gradient-to-b from-goldhi to-gold text-canopy"],
                 declined: ["Declined", "bg-red-200 text-red-900"], closed: ["Completed", "bg-white/20 text-white"] };
const when = (iso) => iso && new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function Msgs({ id, open }) {
  const [msgs, setMsgs] = useState([]); const [text, setText] = useState(""); const [err, setErr] = useState(""); const end = useRef(null);
  const load = useCallback(() => api(`/consult/requests/${id}/messages`).then(setMsgs).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);   // near-real-time: refreshes every 5 seconds
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);
  const send = async (e) => {
    e.preventDefault(); if (!text.trim()) return;
    try { await api(`/consult/requests/${id}/messages`, { method: "POST", body: { body: text } }); setText(""); load(); } catch (x) { setErr(x.message); }
  };
  return (
    <div>
      <div className="gold-scroll max-h-64 space-y-2 overflow-y-auto" aria-live="polite">
        {!msgs.length && <p className="text-sm text-white/70">No messages yet. Say hello.</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : ""}`}>
            <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.mine ? "bg-gradient-to-b from-goldhi to-gold text-canopy" : "bg-white/15"}`}>{m.body}</p>
          </div>))}
        <div ref={end} />
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-red-200">{err}</p>}
      {open && <form onSubmit={send} className="mt-2 flex gap-2">
        <label htmlFor={`m${id}`} className="sr-only">Message</label>
        <input id={`m${id}`} className="field" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" />
        <button className="btn btn-gold" disabled={!text.trim()}>Send</button></form>}
    </div>
  );
}

function Files({ id, open }) {
  const [files, setFiles] = useState([]); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(() => api(`/consult/requests/${id}/files`).then(setFiles).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { load(); }, [load]);
  const upload = async (e) => {
    const file = e.target.files[0]; e.target.value = ""; if (!file) return;
    setBusy(true); setErr(""); const fd = new FormData(); fd.append("file", file);
    try { const r = await fetch(`/api/consult/requests/${id}/files`, { method: "POST", body: fd, credentials: "include" }); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || "Upload failed."); load(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div>{!files.length && <p className="text-sm text-white/70">No files yet.</p>}
      <ul className="space-y-1 text-sm">{files.map((f) => <li key={f.id}><a href={`/api/consult/files/${f.id}`} download className="glow font-semibold text-goldhi underline">{f.name}</a> <span className="text-moss">· {f.mine ? "you" : "other person"} · {Math.max(1, Math.round(f.size / 1024))} KB</span></li>)}</ul>
      {open && <div className="mt-3"><label htmlFor={`f${id}`} className="label">Add a file (PDF, PNG, JPG or DOCX, up to 5 MB)</label>
        <input id={`f${id}`} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" disabled={busy} onChange={upload} className="text-sm" /></div>}
      {err && <p role="alert" className="mt-2 text-sm text-red-200">{err}</p>}</div>
  );
}

function Meetings({ id, open }) {
  const [list, setList] = useState([]); const [err, setErr] = useState(""); const [when, setWhen] = useState(""); const [note, setNote] = useState("");
  const load = useCallback(() => api(`/consult/requests/${id}/appointments`).then(setList).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { load(); }, [load]);
  const propose = async (e) => { e.preventDefault(); try { await api(`/consult/requests/${id}/appointments`, { method: "POST", body: { starts_at: when, note: note || null } }); setWhen(""); setNote(""); setErr(""); load(); } catch (x) { setErr(x.message); } };
  const act = async (aid, action) => { try { await api(`/consult/appointments/${aid}/respond`, { method: "POST", body: { action } }); load(); } catch (x) { setErr(x.message); } };
  const S = { proposed: "Waiting for answer", confirmed: "Confirmed", declined: "Declined", cancelled: "Cancelled" };
  return (
    <div>{!list.length && <p className="text-sm text-white/70">No meetings planned.</p>}
      <ul className="space-y-2 text-sm">{list.map((a) => (
        <li key={a.id} className="rounded-lg bg-white/10 p-2"><b className="text-goldhi">{new Date(a.starts_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</b> (East Africa Time) · {S[a.status]}{a.mine && a.status === "proposed" && " (you proposed)"}
          {a.note && <p>{a.note}</p>}
          <div className="mt-1 flex gap-3">{a.status === "proposed" && !a.mine && <><button onClick={() => act(a.id, "accept")} className="glow font-semibold text-goldhi underline">Accept</button><button onClick={() => act(a.id, "decline")} className="glow font-semibold underline">Decline</button></>}
            {open && ["proposed", "confirmed"].includes(a.status) && <button onClick={() => act(a.id, "cancel")} className="glow font-semibold underline">Cancel</button>}</div></li>))}</ul>
      {open && <form onSubmit={propose} className="mt-3 space-y-2"><label htmlFor={`m${id}w`} className="label">Propose a time (East Africa Time)</label>
        <input id={`m${id}w`} type="datetime-local" required className="field" value={when} onChange={(e) => setWhen(e.target.value)} />
        <input aria-label="Note" className="field" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Where or how, for example a site visit or a phone call" />
        <button className="btn btn-gold text-sm">Propose</button></form>}
      {err && <p role="alert" className="mt-2 text-sm text-red-200">{err}</p>}</div>
  );
}

function Thread({ id, open }) {
  const [tab, setTab] = useState("msg");
  return (
    <div className="mt-3 rounded-xl border border-gold/30 bg-black/20 p-3">
      <div role="tablist" className="mb-3 flex gap-2 text-sm">{[["msg", "Messages"], ["files", "Files"], ["meet", "Meetings"]].map(([k, l]) => (
        <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-3 py-1 font-semibold transition ${tab === k ? "bg-gradient-to-b from-goldhi to-gold text-canopy" : "bg-white/10 glow"}`}>{l}</button>))}</div>
      {tab === "msg" && <Msgs id={id} open={open} />}{tab === "files" && <Files id={id} open={open} />}{tab === "meet" && <Meetings id={id} open={open} />}
    </div>
  );
}

function RatingBox({ id, done }) {
  const [stars, setStars] = useState(0); const [comment, setComment] = useState(""); const [err, setErr] = useState("");
  const send = async () => { try { await api(`/consult/requests/${id}/rating`, { method: "POST", body: { stars, comment: comment || null } }); done(); } catch (x) { setErr(x.message); } };
  return (
    <div className="w-full rounded-lg bg-white/10 p-3"><p className="text-sm font-semibold text-goldhi">Rate this expert</p>
      <div role="radiogroup" aria-label="Stars" className="mt-1 flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setStars(n)} className={`text-2xl transition ${n <= stars ? "text-goldhi" : "text-white/40"}`}>★</button>)}</div>
      <input aria-label="Comment" className="field mt-2" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment (optional)" />
      {err && <p role="alert" className="mt-1 text-sm text-red-200">{err}</p>}<button onClick={send} disabled={!stars} className="btn btn-gold mt-2 text-sm">Send rating</button></div>
  );
}

function WhatsApp({ id }) {
  const [err, setErr] = useState("");
  const go = async () => { try { const r = await api(`/consult/requests/${id}/whatsapp`); window.open(r.url, "_blank", "noopener,noreferrer"); } catch (x) { setErr(x.message); } };
  return <><button onClick={go} className="btn btn-gold">Start WhatsApp chat</button>{err && <span role="alert" className="text-sm text-red-200">{err}</span>}</>;
}

function RequestCard({ r, children, who }) {
  const [chat, setChat] = useState(false); const st = STATUS[r.status];
  return (
    <article className="panel pop">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-goldhi">{r.ref}: {r.service}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st[1]}`}>{st[0]}</span></div>
      <p className="text-sm text-moss">{r.location} · {when(r.created)}{r.directed && " · sent to one expert"}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm">{r.description}</p>
      {who && <p className="mt-2 text-sm"><b className="text-goldhi">{who.label}: </b>{who.text}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {children}
        {["accepted", "closed"].includes(r.status) && <button onClick={() => setChat(!chat)} className="btn bg-white/15 glow" aria-expanded={chat}>{chat ? "Hide messages" : "Messages"}</button>}
      </div>
      {chat && <Thread id={r.id} open={r.status === "accepted"} />}
    </article>
  );
}

function useList(path) {
  const [items, setItems] = useState(null); const [err, setErr] = useState("");
  const load = useCallback(() => api(path).then((d) => { setItems(d); setErr(""); }).catch((e) => setErr(e.message)), [path]);
  useEffect(() => { load(); }, [load]);
  return { items, err, load, setErr };
}

export function MinerRequests({ target, clearTarget }) {
  const { items, err, load, setErr } = useList("/consult/requests/mine");
  const [services, setServices] = useState([]); const [f, setF] = useState({ service_type: "", location: "", description: "" }); const [busy, setBusy] = useState(false);
  useEffect(() => { api("/consult/services").then(setServices); }, []);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    try { await api("/consult/requests", { method: "POST", body: { ...f, target_expert_id: target?.id ?? null } }); setF({ service_type: "", location: "", description: "" }); clearTarget(); load(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const close = async (id) => { try { await api(`/consult/requests/${id}/close`, { method: "POST" }); load(); } catch (x) { setErr(x.message); } };
  return (
    <section className="pop space-y-6">
      <form onSubmit={submit} className="panel space-y-4">
        <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">Request a consultation</h1>
        {target ? <p className="rounded-lg bg-white/10 p-3">Sending to <b className="text-goldhi">{target.name}</b>. <button type="button" onClick={clearTarget} className="glow underline">Send to any verified expert instead</button></p>
                : <p className="text-sm text-moss">Your request goes to all verified experts. The first to accept can message you. Your phone number is never shared.</p>}
        <div><label htmlFor="svc" className="label">What do you need?</label>
          <select id="svc" required className="field" value={f.service_type} onChange={(e) => setF({ ...f, service_type: e.target.value })}>
            <option value="">Choose a service</option>{services.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label htmlFor="loc" className="label">General location (village or ward, no exact coordinates)</label>
          <input id="loc" required className="field" maxLength={160} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
        <div><label htmlFor="desc" className="label">Describe the help you need</label>
          <textarea id="desc" required minLength={10} rows={4} maxLength={2000} className="field" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <button className="btn btn-gold" disabled={busy}>{busy ? "Sending…" : "Send request"}</button>
      </form>
      {err && <p role="alert" className="rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
      <div><h2 className="mb-3 font-display text-2xl font-semibold text-goldhi shadow-text">My requests</h2>
        {items && !items.length && <p className="panel">You have not sent any requests yet.</p>}
        <div className="space-y-4">{items?.map((r) => (
          <RequestCard key={r.id} r={r} who={r.expert && { label: "Expert", text: `${r.expert.name}${r.expert.firm ? `, ${r.expert.firm}` : ""}` }}>
            {r.status === "accepted" && <button onClick={() => close(r.id)} className="btn bg-white/15 glow">Mark complete</button>}
            {r.whatsapp && <WhatsApp id={r.id} />}
            {r.status === "closed" && r.expert && (r.rating ? <span className="text-sm text-goldhi">You rated {r.rating} / 5</span> : <RatingBox id={r.id} done={load} />)}
          </RequestCard>))}</div></div>
    </section>
  );
}

export function ExpertOpen() {
  const { items, err, load, setErr } = useList("/consult/requests/open");
  const act = async (id, a) => { try { await api(`/consult/requests/${id}/${a}`, { method: "POST" }); load(); } catch (x) { setErr(x.message); load(); } };
  return (
    <section className="pop">
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">Available clients</h1>
      <p className="mt-1 text-moss">Client names and phone numbers stay hidden. After you accept, you can message the client by username.</p>
      {err && <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
      {items && !items.length && <p className="panel mt-4">No open requests right now.</p>}
      <div className="mt-4 space-y-4">{items?.map((r) => (
        <RequestCard key={r.id} r={r}>
          <button onClick={() => act(r.id, "accept")} className="btn btn-gold">Accept</button>
          {r.directed && <button onClick={() => act(r.id, "decline")} className="btn bg-white/15 glow">Decline</button>}
        </RequestCard>))}</div>
    </section>
  );
}

export function ExpertMine() {
  const { items, err, load, setErr } = useList("/consult/requests/mine");
  const close = async (id) => { try { await api(`/consult/requests/${id}/close`, { method: "POST" }); load(); } catch (x) { setErr(x.message); } };
  return (
    <section className="pop">
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">My consultations and messages</h1>
      {err && <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
      {items && !items.length && <p className="panel mt-4">Accept a request under Available Clients to start a conversation.</p>}
      <div className="mt-4 space-y-4">{items?.map((r) => (
        <RequestCard key={r.id} r={r} who={r.miner && { label: "Client", text: r.miner }}>
          {r.status === "accepted" && <button onClick={() => close(r.id)} className="btn btn-gold">Mark complete</button>}
        </RequestCard>))}</div>
    </section>
  );
}

export function Notifications({ onRead }) {
  const [d, setD] = useState(null);
  useEffect(() => { api("/notifications").then(async (x) => { setD(x); await api("/notifications/read", { method: "POST" }); onRead(); }); }, []);   // eslint-disable-line
  return (
    <section className="pop">
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">Notifications</h1>
      {d && !d.items.length && <p className="panel mt-4">Nothing new.</p>}
      <ul className="mt-4 space-y-2">{d?.items.map((n) => (
        <li key={n.id} className={`panel py-3 sm:py-3 ${n.read ? "opacity-70" : "border-goldhi"}`}>{n.text}<span className="ml-2 text-xs text-white/60">{when(n.at)}</span></li>))}</ul>
    </section>
  );
}
