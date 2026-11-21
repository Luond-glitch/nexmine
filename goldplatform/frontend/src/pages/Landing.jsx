import { useState } from "react";
import { Link } from "react-router-dom";
import Backdrop from "../components/Backdrop.jsx";
import { LanguageSwitcher, useI18n } from "../lib/i18n.jsx";
import { PORTALS } from "../lib/portals.js";

const LEAVES = Array.from({ length: 9 }, (_, i) => ({ left: `${(i * 11 + 6) % 96}%`, size: 14 + (i % 3) * 8, fall: 14 + (i % 4) * 5, sway: 5 + (i % 3) * 2, delay: -i * 2.3 }));

export default function Landing() {
  const [open, setOpen] = useState(false); const { t } = useI18n();
  return (
    <Backdrop src="/images/landing-bg.jpg" tint={0.15}>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        {LEAVES.map((l, i) => (
          <svg key={i} className="leaf text-goldhi/70" width={l.size} height={l.size} viewBox="0 0 24 24" fill="currentColor"
            style={{ left: l.left, animationDuration: `${l.fall}s, ${l.sway}s`, animationDelay: `${l.delay}s` }}>
            <path d="M20 3C9 3 4 9 4 15c0 2 .6 3.8 1.7 5.3C7 18 9 14 14 12c-4 3-6 6-7 8.5C8.2 21.5 9.8 22 11.5 22 18 22 21 15 20 3z" /></svg>))}
      </div>
      <div className="fixed right-3 top-3 z-30"><LanguageSwitcher /></div>
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
        <h1 className="rise font-display text-4xl font-extrabold leading-[1.05] text-goldhi shadow-text sm:text-6xl" style={{ animationDelay: ".3s" }}>
          {t("Responsible Gold Mining and Environmental Protection Platform")}</h1>
        <p className="rise mt-5 max-w-2xl rounded-xl bg-canopy/55 p-3 text-lg text-white backdrop-blur-sm" style={{ animationDelay: ".6s" }}>
          {t("An intelligent platform connecting miners, environmental experts and researchers to promote safe, sustainable and responsible gold mining.")}</p>
        <p className="rise mt-3 font-semibold text-goldhi shadow-text" style={{ animationDelay: ".9s" }}>{t("Consult before you mine. Protect lives. Protect the environment.")}</p>
        <div className="rise mt-9" style={{ animationDelay: "1.2s" }}>
          <button className="btn btn-gold px-8 py-3.5 text-lg" aria-expanded={open} onClick={() => setOpen(!open)}>{t("Get started")}</button></div>
        {open && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {["miner", "expert", "researcher"].map((k, i) => { const p = PORTALS[k]; return (
              <Link key={k} to={`/auth/${k}`} style={{ animationDelay: `${i * 110}ms` }}
                className="pop group rounded-2xl border border-gold/40 bg-canopy/70 p-5 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-goldhi hover:shadow-lg hover:shadow-goldhi/30">
                <h2 className="glow font-display text-xl font-semibold text-goldhi group-hover:text-white">{t(p.label)}</h2>
                <p className="mt-1 text-sm text-white">{t(p.blurb)}</p>
                <span className="glow mt-3 inline-block text-sm font-semibold text-goldhi">{t("Sign in or register")}</span></Link>); })}
          </div>)}
        <Link to="/auth/admin" className="glow mt-10 text-sm font-semibold text-goldhi/80">{t("Administrator sign in")}</Link>
      </main>
    </Backdrop>
  );
}
