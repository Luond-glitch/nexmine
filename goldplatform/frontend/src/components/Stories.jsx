import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

const when = (i) => i && new Date(i).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const ST = { pending: ["Waiting for review", "bg-white/20 text-goldhi"], approved: ["Published", "bg-gradient-to-b from-goldhi to-gold text-canopy"], rejected: ["Not published", "bg-red-200 text-red-900"] };

function Reader({ id, back }) {
  const [s, setS] = useState(null); const [c, setC] = useState(""); const [err, setErr] = useState(""); const [rep, setRep] = useState(""); const [msg, setMsg] = useState("");
  useEffect(() => { api(`/stories/${id}`).then(setS).catch((e) => setErr(e.message)); }, [id]);
  const post = async (e) => { e.preventDefault(); try { setS(await api(`/stories/${id}/comments`, { method: "POST", body: { body: c } })); setC(""); setErr(""); } catch (x) { setErr(x.message); } };
  const report = async () => { try { await api(`/stories/${id}/report`, { method: "POST", body: { reason: rep } }); setRep(""); setMsg("Thank you. A moderator will review this story."); } catch (x) { setErr(x.message); } };
  if (!s) return <p className="panel">{err || "Loading…"}</p>;
  return (
    <article className="panel pop">
      <button onClick={back} className="glow mb-3 text-sm font-semibold">Back to stories</button>
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">{s.title}</h1>
      <p className="text-sm text-moss">{s.category} · by {s.author}{s.role && ` (${s.role})`} · {when(s.created)}{s.location && ` · ${s.location}`}</p>
      <p className="mt-4 whitespace-pre-wrap">{s.body}</p>
      <h2 className="mt-6 font-display text-xl font-semibold text-goldhi">Comments ({s.thread.length})</h2>
      <ul className="mt-2 space-y-2">{s.thread.map((t) => <li key={t.id} className="rounded-lg bg-white/10 p-3 text-sm"><b className="text-goldhi">{t.author}</b> · {when(t.at)}<br />{t.body}</li>)}</ul>
      {s.status === "approved" && <>
        <form onSubmit={post} className="mt-3 flex gap-2"><label htmlFor="cm" className="sr-only">Comment</label>
          <input id="cm" className="field" maxLength={1000} value={c} onChange={(e) => setC(e.target.value)} placeholder="Add a comment or question" />
          <button className="btn btn-gold" disabled={c.trim().length < 2}>Post</button></form>
        <details className="mt-4 text-sm"><summary className="glow cursor-pointer font-semibold">Report this story</summary>
          <div className="mt-2 flex gap-2"><input aria-label="Reason" className="field" maxLength={300} value={rep} onChange={(e) => setRep(e.target.value)} placeholder="Why should a moderator look at it?" />
            <button onClick={report} disabled={rep.trim().length < 3} className="btn bg-white/15 glow">Send</button></div></details></>}
      {msg && <p className="mt-3 rounded-lg bg-white/10 p-2 text-sm">{msg}</p>}
      {err && <p role="alert" className="mt-3 rounded-lg bg-red-100 p-2 text-sm text-red-800">{err}</p>}
    </article>
  );
}

export function StoryFeed() {
  const [list, setList] = useState(null); const [open, setOpen] = useState(null); const [err, setErr] = useState("");
  useEffect(() => { api("/stories").then(setList).catch((e) => setErr(e.message)); }, []);
  if (open) return <Reader id={open} back={() => setOpen(null)} />;
  return (
    <section className="pop">
      <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">Community stories and mining experiences</h1>
      <p className="mt-1 text-moss">Stories are reviewed by a moderator before they appear. They are personal experiences, not verified facts or advice.</p>
      {err && <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
      {list && !list.length && <p className="panel mt-4">No stories have been published yet. Be the first to share one.</p>}
      <div className="mt-5 grid gap-4 md:grid-cols-2">{list?.map((s, n) => (
        <button key={s.id} onClick={() => setOpen(s.id)} style={{ animationDelay: `${n * 60}ms` }}
          className="panel pop text-left transition duration-300 hover:-translate-y-1 hover:border-goldhi">
          <h2 className="glow font-display text-xl font-semibold">{s.title}</h2>
          <p className="text-xs text-moss">{s.category} · {s.author} · {when(s.created)} · {s.comments} comments</p>
          <p className="mt-2 text-sm">{s.excerpt}</p></button>))}</div>
    </section>
  );
}

export function StoriesHub({ start = "read" }) {
  const [tab, setTab] = useState(start);
  return (
    <div>
      <div role="tablist" className="mb-4 flex gap-2">{[["read", "Read stories"], ["share", "Share your story"]].map(([k, l]) => (
        <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
          className={`rounded-full px-5 py-2 font-semibold transition ${tab === k ? "bg-gradient-to-b from-goldhi to-gold text-canopy" : "bg-white/10 glow"}`}>{l}</button>))}</div>
      {tab === "read" ? <StoryFeed /> : <ShareStory />}
    </div>
  );
}

export function ShareStory() {
  const [cats, setCats] = useState([]); const [mine, setMine] = useState([]); const [f, setF] = useState({ title: "", body: "", category: "", location: "", anonymous: false });
  const [err, setErr] = useState(""); const [ok, setOk] = useState(""); const [busy, setBusy] = useState(false);
  const load = () => api("/stories/mine").then(setMine).catch(() => {});
  useEffect(() => { api("/stories/categories").then(setCats); load(); }, []);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr(""); setOk("");
    try { await api("/stories", { method: "POST", body: f }); setF({ title: "", body: "", category: "", location: "", anonymous: false }); setOk("Thank you. Your story was sent to a moderator and will appear once approved."); load(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <section className="pop space-y-6">
      <form onSubmit={submit} className="panel space-y-4">
        <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text">Share your story</h1>
        <p className="rounded-lg bg-white/10 p-3 text-sm">Do not include phone numbers, and do not accuse named people or organisations. Moderators check every story before it is published. Photo upload is coming later.</p>
        <div><label htmlFor="st" className="label">Title</label><input id="st" required minLength={5} maxLength={120} className="field" value={f.title} onChange={set("title")} /></div>
        <div><label htmlFor="sc" className="label">Category</label>
          <select id="sc" required className="field" value={f.category} onChange={set("category")}><option value="">Choose a category</option>{cats.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label htmlFor="sb" className="label">Your story (at least 30 characters)</label><textarea id="sb" required minLength={30} maxLength={5000} rows={7} className="field" value={f.body} onChange={set("body")} /></div>
        <div><label htmlFor="sl" className="label">General location (optional)</label><input id="sl" maxLength={120} className="field" value={f.location} onChange={set("location")} /></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.anonymous} onChange={(e) => setF({ ...f, anonymous: e.target.checked })} /> Publish anonymously</label>
        {err && <p role="alert" className="rounded-lg bg-red-100 p-3 text-red-800">{err}</p>}
        {ok && <p className="rounded-lg bg-white/15 p-3">{ok}</p>}
        <button className="btn btn-gold" disabled={busy}>{busy ? "Sending…" : "Submit for review"}</button>
      </form>
      <div><h2 className="mb-3 font-display text-2xl font-semibold text-goldhi shadow-text">My submissions</h2>
        {!mine.length && <p className="panel">You have not submitted a story yet.</p>}
        <div className="space-y-3">{mine.map((s) => (<div key={s.id} className="panel py-3 sm:py-3"><div className="flex flex-wrap justify-between gap-2"><b>{s.title}</b>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ST[s.status][1]}`}>{ST[s.status][0]}</span></div>
          {s.note && <p className="mt-1 text-sm text-moss">Moderator note: {s.note}</p>}</div>))}</div></div>
    </section>
  );
}
