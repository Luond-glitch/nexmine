import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api.js";
import { useI18n } from "../lib/i18n.jsx";

const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
const LANGS = { "en-KE": "English", "sw-KE": "Kiswahili" };

export default function ChatPanel({ title, starter, seed }) {
  const [msgs, setMsgs] = useState([{ role: "assistant", content: starter }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const { lang: appLang, t } = useI18n();
  const [lang, setLang] = useState(appLang === "sw" ? "sw-KE" : "en-KE");
  const [err, setErr] = useState("");
  const seeded = useRef(false);
  const end = useRef(null); const rec = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const send = async (q) => {
    q = (q ?? text).trim(); if (!q || busy) return;
    const history = msgs.slice(1).map(({ role, content }) => ({ role, content })).slice(-10);
    setMsgs((m) => [...m, { role: "user", content: q }]); setText(""); setErr(""); setBusy(true);
    try {
      const r = await api("/chat", { method: "POST", body: { message: q, history, language: appLang } });
      setMsgs((m) => [...m, { role: "assistant", content: r.answer, by: r.provider, issues: r.provider ? [] : r.errors, offline: r.offline, sources: r.sources }]);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  useEffect(() => { if (seed && !seeded.current) { seeded.current = true; send(seed); } }, []);   // eslint-disable-line

  const mic = () => {
    if (listening) return rec.current?.stop();
    const r = new SR(); rec.current = r; r.lang = lang; r.interimResults = true; r.continuous = false;
    let final = "";
    r.onstart = () => { setListening(true); setErr(""); };
    r.onresult = (e) => { final = Array.from(e.results).map((x) => x[0].transcript).join(" "); setText(final); };   // text appears in the box as you speak
    r.onerror = (e) => setErr(e.error === "not-allowed" ? "Microphone blocked. Allow microphone access in your browser, then try again." : "Could not hear you. Try again.");
    r.onend = () => { setListening(false); if (final.trim()) send(final); };   // then it is sent and answered
    r.start();
  };

  return (
    <section className="panel pop flex h-[72vh] min-h-[420px] flex-col" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gold/30 pb-3">
        <h1 className="font-display text-2xl font-extrabold text-goldhi shadow-text">{title}</h1>
        <label className="flex items-center gap-2 text-sm">{t("Voice language")}
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded bg-white px-2 py-1 text-canopy">
            {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></label>
      </div>
      <div className="gold-scroll flex-1 space-y-3 overflow-y-auto py-4 pr-1" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`pop flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-gradient-to-b from-goldhi to-gold text-canopy" : "border border-gold/30 bg-white/10"}`}>
              {m.content}
              {m.sources?.length > 0 && (<p className="mt-3 text-xs"><b className="text-goldhi">From this platform: </b>{m.sources.map((s, i) => s.url
                ? <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="glow mr-3 inline-block underline">{s.title}</a>
                : <span key={i} className="mr-3 inline-block">{s.title} (guide)</span>)}</p>)}
              {m.offline && <p className="mt-2 text-xs text-goldhi/80">Answered from the platform's own library because the AI service is unavailable right now.</p>}
              {import.meta.env.DEV && m.issues?.length > 0 && <p className="mt-2 text-xs text-white/60">Technical detail: {m.issues.join("; ")}</p>}
              {m.by && <p className="mt-2 text-xs text-goldhi/80">AI-generated, answered by {m.by}. Not legal or engineering advice.</p>}
            </div>
          </div>
        ))}
        {busy && <div className="flex gap-1 px-4 text-2xl text-goldhi" aria-label="Thinking"><span className="dot">.</span><span className="dot">.</span><span className="dot">.</span></div>}
        <div ref={end} />
      </div>
      {err && <p role="alert" className="mb-2 rounded-lg bg-red-100 p-2 text-sm text-red-800">{err}</p>}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2 border-t border-gold/30 pt-3">
        <label htmlFor="q" className="sr-only">Your question</label>
        <textarea id="q" rows={1} maxLength={2000} className="field max-h-32 resize-none" value={text} disabled={busy}
          placeholder={listening ? t("Listening… speak now") : t("Ask about mining, safety, EIA or the law")}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        {SR && (
          <button type="button" onClick={mic} aria-pressed={listening} aria-label={listening ? "Stop listening" : "Speak your question"}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-canopy transition hover:bg-goldhi ${listening ? "listening bg-goldhi" : ""}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.900V22h2v-3.100A7 7 0 0 0 19 12h-2z" /></svg>
          </button>)}
        <button className="btn btn-gold h-11" disabled={busy || !text.trim()}>{t("Send")}</button>
      </form>
      {!SR && <p className="mt-2 text-xs text-white/70">Voice input works in Chrome, Edge and Safari.</p>}
    </section>
  );
}
