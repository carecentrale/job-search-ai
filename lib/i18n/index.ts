import { FR, FR_PATTERNS } from "./fr";

/**
 * Translations, gettext style: the English text is the key, so English needs no
 * dictionary and a missing French entry falls back to English instead of breaking.
 * `{name}` placeholders are filled from `vars`.
 */

export type Locale = "en" | "fr";
export const LOCALES: Locale[] = ["en", "fr"];
export const LOCALE_COOKIE = "fz_lang";

export type Vars = Record<string, string | number>;

function fill(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function translate(locale: Locale, text: string, vars?: Vars): string {
  if (locale === "en") return fill(text, vars);
  return fill(FR[text] ?? text, vars);
}

/**
 * Translate a finished sentence that may contain names and numbers, e.g. an
 * error from the server or a match reason saved in English. Exact matches
 * first, then patterns; untranslated text comes back as is.
 */
export function translateMessage(locale: Locale, text: string): string {
  if (locale === "en" || !text) return text;
  if (FR[text]) return FR[text];
  for (const [re, out] of FR_PATTERNS) {
    const m = re.exec(text);
    if (m) return typeof out === "function" ? out(m) : text.replace(re, out);
  }
  return text;
}

export type T = (text: string, vars?: Vars) => string;
export const makeT = (locale: Locale): T => (text, vars) => translate(locale, text, vars);

/** Date and number formatting for each language. */
export const intlLocale = (locale: Locale) => (locale === "fr" ? "fr-CA" : "en-CA");
