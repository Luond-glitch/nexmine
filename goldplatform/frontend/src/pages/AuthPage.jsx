import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import Backdrop from "../components/Backdrop.jsx";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { LanguageSwitcher, useI18n } from "../lib/i18n.jsx";
import { PORTALS } from "../lib/portals.js";

const MINPW = { miner: 4, expert: 6, researcher: 4 };
const pwProblem = (pw, role) => (pw.length < MINPW[role] || !/[^A-Za-z0-9\s]/.test(pw))
  ? `Use at least ${MINPW[role]} characters and include one special character, for example @ # ! ? $ %.` : "";

function Field({ id, label, type = "text", value, onChange, required, autoComplete }) {
  const { t } = useI18n();
  return (
    <div>
      <label htmlFor={id} className="label">{t(label)}{required && <span className="text-goldhi"> {t("(required)")}</span>}</label>
      <input id={id} name={id} type={type} className="field" value={value ?? ""} required={required} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function PasswordField({ id, label, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false); const { t } = useI18n();
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} className="field pr-20" value={value} required autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
        <button type="button" onClick={() => setShow(!show)} aria-pressed={show} className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-sm font-semibold text-goldhi glow hover:bg-white/10">{show ? t("Hide") : t("Show")}</button>
      </div>
    </div>
  );
}

export default function AuthPage() {
  const { portal } = useParams();
  const cfg = PORTALS[portal];
  const { user, setUser } = useAuth(); const { t } = useI18n(); const nav = useNavigate();
  const [mode, setMode] = useState("login"); const [f, setF] = useState({}); const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState({ type: "", text: "" });
  const [forgot, setForgot] = useState(false); const [ch, setCh] = useState("email");

  if (!cfg) return <Navigate to="/" replace />;
  if (user && user.role === portal) return <Navigate to={`/${portal}`} replace />;
  const isAdmin = portal === "admin";
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const run = async (fn) => { setBusy(true); setMsg({ type: "", text: "" }); try { await fn(); } catch (e) { setMsg({ type: "error", text: e.message }); } finally { setBusy(false); } };
  const done = (u) => { setUser(u); nav(`/${portal}`); };

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      if (forgot) {   // reset by email OR phone number
        const r = await api("/auth/forgot-password", { method: "POST", body: ch === "email" ? { email: f.rv } : { phone: f.rv } });
        return setMsg({ type: "ok", text: r.message });
      }
      if (mode === "login") return done(await api("/auth/login", { method: "POST", body: { role: portal, identifier: f.identifier, password: f.password, remember } }));
      const bad = pwProblem(f.password || "", portal); if (bad) throw new Error(bad);
      const body = { ...f }; if (body.years_experience) body.years_experience = Number(body.years_experience);
      done(await api(`/auth/register/${portal}`, { method: "POST", body }));
    });
  };

  return (
    <Backdrop src={cfg.bg} tint={0.25}>
      <div className="fixed right-3 top-3 z-30"><LanguageSwitcher /></div>
      <div className="fixed inset-0 z-20 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <section className="pop gold-scroll w-full max-w-lg overflow-y-auto rounded-2xl border border-gold/40 bg-canopy/85 p-5 text-white shadow-2xl shadow-black/40 backdrop-blur-md sm:p-8" style={{ maxHeight: "88vh" }} aria-labelledby="t">
          <Link to="/" className="glow text-sm font-semibold text-goldhi">{t("Back to home")}</Link>
          <h1 id="t" className="mt-2 font-display text-3xl font-extrabold text-goldhi">{t(forgot ? "Reset your password" : cfg.label)}</h1>

          {!forgot && !isAdmin && (
            <div role="tablist" className="mt-4 grid grid-cols-2 rounded-lg bg-white/10 p-1">
              {["login", "register"].map((m) => (
                <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setMsg({}); }} className={`rounded-md py-2 font-semibold transition duration-300 ${mode === m ? "bg-gold text-canopy shadow" : "text-white glow"}`}>
                  {m === "login" ? t("Sign in") : t("Create account")}</button>))}
            </div>)}

          <form onSubmit={submit} className="mt-5 space-y-4" key={`${mode}${forgot}${ch}`}>
            {forgot ? (
              <>
                <p>{t("We will send a reset link that works for 30 minutes.")}</p>
                <fieldset><legend className="label">{t("Reset by")}</legend>
                  <div className="flex gap-5">{[["email", "Email address"], ["phone", "Phone number"]].map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2"><input type="radio" name="ch" checked={ch === k} onChange={() => { setCh(k); setF({}); setMsg({}); }} /> {t(l)}</label>))}</div></fieldset>
                <Field id="rv" label={ch === "email" ? "Email address" : "Phone number"} type={ch === "email" ? "email" : "tel"} required value={f.rv} onChange={set("rv")} />
                <p className="text-xs text-white/70">{t(ch === "email" ? "Enter the email address on your account." : "Enter the phone number on your account.")}</p>
              </>
            ) : mode === "login" ? (
              <>
                <Field id="identifier" label={cfg.idLabel} required value={f.identifier} onChange={set("identifier")} autoComplete="username" />
                <PasswordField id="password" label={t("Password")} value={f.password ?? ""} onChange={set("password")} autoComplete="current-password" />
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> {t("Remember me")}</label>
                  <button type="button" onClick={() => { setForgot(true); setF({}); setMsg({}); }} className="glow font-semibold text-goldhi">{t("Forgot password?")}</button>
                </div>
              </>
            ) : (
              <>
                {cfg.register.map(([k, label, type, req]) => <Field key={k} id={k} label={label} type={type} required={req} value={f[k]} onChange={set(k)} />)}
                <PasswordField id="password" label={t("Password (at least {n} characters, including one special character such as @ # !)").replace("{n}", MINPW[portal])} value={f.password ?? ""} onChange={set("password")} autoComplete="new-password" />
                <PasswordField id="confirm_password" label={t("Confirm password")} value={f.confirm_password ?? ""} onChange={set("confirm_password")} autoComplete="new-password" />
                {portal === "expert" && <p className="rounded-lg bg-gold/20 p-3 text-sm">Your account starts as <b>pending verification</b>. Your EIA licence is checked before your profile appears publicly as verified.</p>}
              </>
            )}
            {msg.text && <p role="alert" className={`pop rounded-lg p-3 text-sm font-medium ${msg.type === "ok" ? "bg-moss text-canopy" : "bg-red-100 text-red-800"}`}>{msg.text}</p>}
            <button className="btn btn-green w-full" disabled={busy}>{busy ? t("Please wait…") : forgot ? t("Send reset link") : mode === "login" ? t("Sign in") : t("Create account")}</button>
            {forgot && <button type="button" onClick={() => { setForgot(false); setMsg({}); setF({}); }} className="glow w-full text-sm font-semibold text-goldhi">{t("Back to sign in")}</button>}
          </form>
        </section>
      </div></div>
    </Backdrop>
  );
}
