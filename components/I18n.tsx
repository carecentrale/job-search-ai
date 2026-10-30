"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { intlLocale, LOCALE_COOKIE, makeT, translateMessage, type Locale, type T } from "@/lib/i18n";

const Ctx = createContext<Locale>("en");

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

/** `t("English text", { vars })` in client components, plus helpers for messages and dates. */
export function useT(): { t: T; locale: Locale; msg: (s: string) => string; dateLocale: string } {
  const locale = useContext(Ctx);
  return { t: makeT(locale), locale, msg: (s) => translateMessage(locale, s), dateLocale: intlLocale(locale) };
}

/** EN | FR switch. Remembers the choice for a year. */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { locale } = useT();
  const router = useRouter();
  const set = (l: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
    router.refresh();
  };
  return (
    <span className={`lang-switch ${className}`} role="group" aria-label={locale === "fr" ? "Langue" : "Language"}>
      <button type="button" lang="en" aria-pressed={locale === "en"} onClick={() => set("en")}>EN</button>
      <button type="button" lang="fr" aria-pressed={locale === "fr"} onClick={() => set("fr")}>FR</button>
    </span>
  );
}
