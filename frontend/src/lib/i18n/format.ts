import { EN } from "./en";
import { TH } from "./th";

/** Translator signature shared by the hook and by plain (non-React) helpers. */
export type Tr = (key: string, params?: Record<string, string | number>) => string;

export type Locale = "th" | "en";
export const LOCALE_COOKIE = "locale";

// Thai text -> key, so places that still hold a literal Thai label (nav items,
// status maps) keep resolving. Prefer passing the key (see th.ts / en.ts).
const KEY_BY_THAI: Record<string, string> = Object.fromEntries(
  Object.entries(TH).map(([k, v]) => [v, k]),
);

/** Looks up `key` (an id from th.ts / en.ts) for the locale and fills `{name}` placeholders. */
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const id = key in TH ? key : (KEY_BY_THAI[key] ?? key);
  const text = (locale === "en" ? EN[id] : TH[id]) ?? key;
  return params
    ? text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m))
    : text;
}

/** Default (Thai) translator for non-React helpers and tests. */
export const plainT: Tr = (key, params) => translate("th", key, params);
