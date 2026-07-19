import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { flatEn } from "./i18n.strings.mjs";
import es from "./i18n.es.json";
import ga from "./i18n.ga.json";

export const LANGS = [
  { code: "en", label: "EN", name: "English" },
  { code: "es", label: "ES", name: "Español" },
  { code: "ga", label: "GA", name: "Gaeilge" },
];

const DICTS = { en: flatEn, es, ga };
const STORE_KEY = "eirim_lang";

const I18nContext = createContext({ lang: "en", setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved && DICTS[saved]) return saved;
      const nav = (navigator.language || "en").slice(0, 2);
      return DICTS[nav] ? nav : "en";
    } catch {
      return "en";
    }
  });

  const setLang = useCallback((code) => {
    if (!DICTS[code]) return;
    setLangState(code);
    try {
      localStorage.setItem(STORE_KEY, code);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Per-key fallback: current language → English → the key itself.
  const t = useCallback(
    (key) => (DICTS[lang] && DICTS[lang][key]) || flatEn[key] || key,
    [lang]
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function LangSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l.code}
          className={"lang-btn" + (lang === l.code ? " on" : "")}
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          title={l.name}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
