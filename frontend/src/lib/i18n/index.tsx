"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { LOCALE_COOKIE, translate, type Locale } from "./format";

export { LOCALE_COOKIE, type Locale };

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue>({
  locale: "th",
  setLocale: () => {},
  t: (key, params) => translate("th", key, params),
});

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t: (key, params) => translate(locale, key, params) }),
    [locale, setLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

export function useT() {
  return useContext(I18nContext).t;
}

export function LocaleSwitcher({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { locale, setLocale } = useI18n();
  const base = tone === "dark" ? "text-ink-300 hover:text-white" : "text-ink-500 hover:text-ink-900";
  const on = tone === "dark" ? "bg-white/15 text-white" : "bg-white text-ink-900 shadow-sm";
  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex rounded-full p-0.5 text-xs font-semibold ${tone === "dark" ? "bg-white/5" : "bg-black/5"}`}
    >
      {(["th", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={locale === l}
          onClick={() => setLocale(l)}
          className={`rounded-full px-3 py-1 transition-colors ${locale === l ? on : base}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
