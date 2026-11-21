import { createContext, useContext, useEffect, useState } from "react";
import sw from "../locales/sw.js";
import luo from "../locales/luo.js";

const DICT = { en: {}, sw, luo };
export const LANGS = { en: "English", sw: "Kiswahili", luo: "Dholuo" };
export const luoReady = Object.keys(luo).length > 0;
const Ctx = createContext({ lang: "en", setLang: () => {}, t: (s) => s });
export const useI18n = () => useContext(Ctx);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem("gp_lang") || "en"; } catch { return "en"; } });
  useEffect(() => { try { localStorage.setItem("gp_lang", lang); } catch { /* storage may be blocked */ } document.documentElement.lang = lang; }, [lang]);
  const t = (s) => DICT[lang]?.[s] ?? s;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="text-sm">
      <label className="sr-only" htmlFor="lang">{t("Language")}</label>
      <select id="lang" value={lang} onChange={(e) => setLang(e.target.value)} className="rounded bg-white px-2 py-1 text-canopy">
        {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      {lang === "luo" && !luoReady && <p className="mt-1 max-w-[12rem] text-xs text-white/80">Dholuo translations are being prepared by a native speaker. English is shown for now.</p>}
    </div>
  );
}
