/**
 * Lightweight i18n: English + Marathi interface strings with a persisted
 * language preference. `t(key, vars)` falls back to English, then to the
 * key itself. Interface language is separate from stored DATA: receipts,
 * notes and readings keep their original language and are never translated
 * silently.
 */

import { useCallback, useContext, useMemo, useSyncExternalStore, createContext } from "react";
import { en, type LocaleStrings, type TranslationKey } from "./locales/en";
import { mr } from "./locales/mr";

export type Locale = "en" | "mr";

const STRINGS: Record<Locale, LocaleStrings> = { en, mr };
export const LOCALE_LABELS: Record<Locale, string> = { en: "English", mr: "मराठी" };

const localeStore = (() => {
  let value: Locale = "en";
  let initialized = false;
  const listeners = new Set<() => void>();
  const init = () => {
    if (initialized || typeof window === "undefined") return;
    initialized = true;
    try {
      const saved = window.localStorage.getItem("jallekha.locale");
      if (saved === "mr" || saved === "en") value = saved;
    } catch {
      // Storage unavailable: keep English.
    }
  };
  return {
    subscribe(l: () => void): () => void {
      listeners.add(l);
      return () => { listeners.delete(l); };
    },
    get(): Locale { init(); return value; },
    getServer(): Locale { return "en"; },
    set(v: Locale): void {
      value = v;
      initialized = true;
      try {
        window.localStorage.setItem("jallekha.locale", v);
      } catch {
        // Storage unavailable: language stays for this session only.
      }
      for (const l of listeners) l();
    },
  };
})();

interface LocaleCtxValue { locale: Locale; setLocale(l: Locale): void; }
const LocaleCtx = createContext<LocaleCtxValue>({ locale: "en", setLocale: () => {} });

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(
    (cb) => localeStore.subscribe(cb),
    () => localeStore.get(),
    () => localeStore.getServer(),
  );
  const setLocale = useCallback((v: Locale) => localeStore.set(v), []);
  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}

export interface Translator {
  locale: Locale;
  setLocale(l: Locale): void;
  t(key: TranslationKey, vars?: Record<string, string | number>): string;
}

/** Hook form for client components. */
export function useI18n(): Translator {
  const { locale, setLocale } = useContext(LocaleCtx);
  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const table = STRINGS[locale] ?? STRINGS.en;
      let out = table[key] ?? en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          out = out.replace(new RegExp("\\{" + k + "\\}", "g"), String(v));
        }
      }
      return out;
    },
    [locale],
  );
  return { locale, setLocale, t };
}

/** Non-hook form for helpers outside React. */
export function translate(locale: Locale, key: TranslationKey, vars?: Record<string, string | number>): string {
  const table = STRINGS[locale] ?? STRINGS.en;
  let out = table[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(new RegExp("\\{" + k + "\\}", "g"), String(v));
    }
  }
  return out;
}

export type { TranslationKey, LocaleStrings };
