import "server-only";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, makeT, type Locale } from "./i18n";

/**
 * The visitor's language. A choice made with the language switch (a cookie)
 * always wins. Otherwise visitors in Quebec, by IP location, get French, and
 * everyone else English. Locally, FUZZY_DEV_REGION=QC stands in for Quebec.
 */
export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (c === "fr" || c === "en") return c;
  const h = await headers();
  const country = h.get("x-vercel-ip-country") ?? (!process.env.VERCEL ? process.env.FUZZY_DEV_COUNTRY || "CA" : null);
  const region = h.get("x-vercel-ip-country-region") ?? (!process.env.VERCEL ? process.env.FUZZY_DEV_REGION || null : null);
  return country?.toUpperCase() === "CA" && region?.toUpperCase() === "QC" ? "fr" : "en";
}

export async function getT() {
  const locale = await getLocale();
  return { locale, t: makeT(locale) };
}
