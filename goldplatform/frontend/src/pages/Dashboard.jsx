import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import Backdrop from "../components/Backdrop.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import MapView from "../components/MapView.jsx";
import Search from "../components/Search.jsx";
import Checklist from "../components/Checklist.jsx";
import RehabLog from "../components/RehabLog.jsx";
import Reports from "../components/Reports.jsx";
import { LanguageSwitcher, useI18n } from "../lib/i18n.jsx";
import Education from "../components/Education.jsx";
import ExpertProfile from "../components/ExpertProfile.jsx";
import Support from "../components/Support.jsx";
import { StoriesHub } from "../components/Stories.jsx";
import { Discussions, ResearchLibrary, Topics } from "../components/Research.jsx";
import Guides from "../components/Guides.jsx";
import { ExpertMine, ExpertOpen, MinerRequests, Notifications } from "../components/Consult.jsx";
import Library from "../components/Library.jsx";
import ExpertDirectory from "../components/ExpertDirectory.jsx";
import { useAuth } from "../lib/auth.jsx";
import { PORTALS } from "../lib/portals.js";

const VIEW = { "Reports and Records": "reports", "Self-Assessment": "checklist", "Rehabilitation Log": "rehab", Map: "map", "Contact and Support": "support", "Mining Education": "edu", "My Services": "profile", "Research Discussions": "discuss", "Research Library": "library", "Mining Topics": "topics", "Environmental Education": "environment", "Community Stories": "stories", "Share Your Story": "share", "My Requests": "requests", "Available Clients": "open", "Consultation Requests": "mine", Messages: "mine", Notifications: "notes", Home: "home", Dashboard: "home", "AI Mining Assistant": "chat", "AI Research Assistant": "chat", "EIA Experts": "experts",
  "Environmental Regulations": "regs", "Mining Safety": "safety", "Environmental Protection": "environment", "Environmental and Mining Authorities": "sites", Authorities: "sites", "Professional Resources": "sites" };
const STATUS = {
  pending: ["Pending verification", "bg-white/20 text-goldhi"], verified: ["Active", "bg-gradient-to-b from-goldhi to-gold text-canopy"],
  rejected: ["Verification rejected", "bg-red-200 text-red-900"], suspended: ["Suspended", "bg-red-700 text-white"],
};
const STARTER = {
  miner: "Hello. Ask me anything about responsible gold mining, safety, EIA or Kenyan environmental rules. You can type or tap the microphone.",
  researcher: "Hello. Ask me about artisanal gold mining, environmental impacts, EIA or sustainable mining. I will not invent references.",
};

export default function Dashboard({ portal }) {
  const cfg = PORTALS[portal];
  const { user, logout } = useAuth(); const { t } = useI18n();
  const [view, setView] = useState("home"); const [menu, setMenu] = useState(false);
  const [q, setQ] = useState(""); const [sq, setSq] = useState("");
  const [target, setTarget] = useState(null); const [seed, setSeed] = useState(null); const [unread, setUnread] = useState(0);
  useEffect(() => { const f = () => api("/notifications").then((d) => setUnread(d.unread)).catch(() => {}); f(); const t = setInterval(f, 20000); return () => clearInterval(t); }, []);
  const name = user.full_name || user.username;
  const st = user.verification && STATUS[user.verification];
  const locked = portal === "expert" && user.verification !== "verified";

  return (
    <Backdrop src={cfg.bg} tint={0.22}>
      <header className="sticky top-0 z-30 border-b border-gold/30 bg-canopy/90 shadow-lg shadow-black/30 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <span className="hidden font-display text-lg font-extrabold text-goldhi md:inline">{t("Responsible Gold Mining")}</span>
          <form role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim().length >= 2 && !(locked)) { setSq(q.trim()); setView("search"); } }} className="flex-1 sm:max-w-xs">
            <label htmlFor="gs" className="sr-only">Search the platform</label>
            <input id="gs" type="search" value={q} onChange={(e) => setQ(e.target.value)} disabled={locked} placeholder={t("Search laws, experts, stories")} className="field py-1.5 text-sm" /></form>
          <button onClick={() => setView("notes")} aria-label={`Notifications, ${unread} unread`} className="glow relative ml-auto rounded-full p-2 text-xl">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11a6 6 0 0 0-5-5.900V4a1 1 0 0 0-2 0v1.100A6 6 0 0 0 6 11v5l-2 2v1h16v-1z" /></svg>
            {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">{unread}</span>}</button>
          <LanguageSwitcher />
          <div className="relative">
            <button onClick={() => setMenu(!menu)} aria-expanded={menu} aria-haspopup="menu"
              className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-4 transition hover:bg-white/20">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-b from-goldhi to-gold font-bold text-canopy">{name[0].toUpperCase()}</span>
              <span className="hidden sm:inline">{name}</span>
            </button>
            {menu && (
              <div role="menu" className="pop absolute right-0 mt-2 w-64 rounded-xl border border-gold/40 bg-canopy p-2 shadow-xl">
                <p className="px-3 py-2 font-semibold text-goldhi">{name}</p>
                {st && <p className={`mx-3 mb-2 rounded px-2 py-1 text-sm font-semibold ${st[1]}`}>{st[0]}</p>}
                <button role="menuitem" onClick={logout} className="glow w-full rounded px-3 py-2 text-left font-semibold">{t("Logout")}</button>
              </div>)}
          </div>
        </div>
        {/* Navbar sits at the top, scrolls sideways on small screens */}
        <nav aria-label="Portal" className="gold-scroll mx-auto max-w-7xl overflow-x-auto px-4 pb-2">
          <ul className="flex w-max gap-1">
            {cfg.nav.map((item) => {
              const v = item === "My Profile" && portal !== "expert" ? undefined : item === "My Profile" ? "profile" : VIEW[item]; const on = v && !(locked && v !== "home" && v !== "profile");
              return (<li key={item}>
                {on ? <button onClick={() => { if (v === "chat") setSeed(null); setView(v); }} aria-current={view === v ? "page" : undefined}
                    className={`whitespace-nowrap rounded-lg px-3.5 py-2 font-semibold transition duration-300 ${view === v ? "bg-gradient-to-b from-goldhi to-gold text-canopy shadow shadow-gold/40" : "glow"}`}>{t(item)}</button>
                  : <span aria-disabled="true" title="Coming in a later phase" className="block cursor-not-allowed whitespace-nowrap rounded-lg px-3.5 py-2 text-white/45">{t(item)}</span>}
              </li>);
            })}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6" key={view}>
        {view === "discuss" && <Discussions />}
        {view === "library" && <ResearchLibrary />}
        {view === "topics" && <Topics ask={(q) => { setSeed(q); setView("chat"); }} />}
        {view === "chat" && <ChatPanel key={seed || "c"} seed={seed} title={portal === "miner" ? "AI Mining Assistant" : "AI Research Assistant"} starter={STARTER[portal]} />}
        {view === "experts" && <ExpertDirectory onRequest={(e) => { setTarget(e); setView("requests"); }} />}
        {view === "requests" && <MinerRequests target={target} clearTarget={() => setTarget(null)} />}
        {view === "open" && <ExpertOpen />}
        {view === "mine" && <ExpertMine />}
        {view === "notes" && <Notifications onRead={() => setUnread(0)} />}
        {view === "safety" && <Guides topic="safety" />}
        {view === "environment" && <Guides topic="environment" />}
        {view === "stories" && <StoriesHub start="read" />}
        {view === "share" && <StoriesHub start="share" />}
        {view === "map" && <MapView />}
        {view === "reports" && <Reports />}
        {view === "checklist" && <Checklist go={(v) => setView(v)} />}
        {view === "rehab" && <RehabLog />}
        {view === "search" && <Search q={sq} go={(v) => { if (v === "chat") setSeed(null); setView(v); }} />}
        {view === "support" && <Support />}
        {view === "edu" && <Education />}
        {view === "profile" && <ExpertProfile />}
        {view === "regs" && <Library kind="regulations" />}
        {view === "sites" && <Library kind="sites" />}
        {view === "home" && (
          <section className="panel pop">
            <h1 className="font-display text-3xl font-extrabold text-goldhi shadow-text sm:text-4xl">{t("Welcome")}, {name}</h1>
            {st && <p className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-bold ${st[1]}`}>Account status: {st[0]}</p>}
            <p className="mt-3 max-w-2xl text-lg text-white">
              {portal === "miner" && "Before you dig, consult. Use the AI Mining Assistant for guidance and EIA Experts to find a verified professional."}
              {portal === "expert" && (user.verification === "verified" ? "Your account is Active and your profile is visible to miners." : "Your EIA licence is awaiting review by the administrator. Your profile stays hidden from miners until you are approved.")}
              {portal === "researcher" && "Use the AI Research Assistant to explore mining and environmental topics. The library and discussions come next."}
            </p>
          </section>)}
      </main>
    </Backdrop>
  );
}
