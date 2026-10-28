import "server-only";
import { headers } from "next/headers";
import type { Currency } from "./billing";

/**
 * Where a visitor is, from Vercel's IP geolocation header. Personal is sold in
 * Canada (CAD) and the United States (USD) only, for now.
 * Locally there's no header, so FUZZY_DEV_COUNTRY (default CA) stands in.
 */
export async function visitorCountry(): Promise<string | null> {
  const h = await headers();
  const c = h.get("x-vercel-ip-country");
  if (c) return c.toUpperCase();
  if (!process.env.VERCEL) return (process.env.FUZZY_DEV_COUNTRY || "CA").toUpperCase();
  return null;
}

export function currencyFor(country: string | null): Currency | null {
  if (country === "CA") return "cad";
  if (country === "US") return "usd";
  return null;
}

export async function visitorCurrency(): Promise<Currency | null> {
  return currencyFor(await visitorCountry());
}
