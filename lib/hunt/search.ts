import type { Brief, Job } from "./types";

/**
 * Job search sites with free API keys. Each one only runs when its keys are set
 * in the server's environment, so the hunt works without them.
 *
 *   Adzuna  ADZUNA_APP_ID + ADZUNA_APP_KEY   (developer.adzuna.com)
 *   Jooble  JOOBLE_API_KEY                   (jooble.org/api/about)
 *
 * Their postings carry a snippet rather than the full description, which is
 * enough to score against a brief. The tailoring step tells the user when it
 * only had a snippet to work from.
 */

export type SearchQuery = { what: string; where: string; country: Country };
type Country = "ca" | "us" | "gb" | "fr" | "de" | "au";

const TIMEOUT_MS = 12_000;
/** Queries per seeker per site: a few titles × a few places, so free quotas last. */
const MAX_QUERIES = 4;

export function searchSitesOn(): { adzuna: boolean; jooble: boolean } {
  return {
    adzuna: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
    jooble: Boolean(process.env.JOOBLE_API_KEY),
  };
}

const CA = /\b(canada|montr[eé]al|toronto|vancouver|ottawa|calgary|edmonton|qu[eé]bec|winnipeg|halifax|waterloo|kitchener|victoria|laval|gatineau|mississauga|ontario|alberta|british columbia|nova scotia|manitoba|saskatchewan)\b/i;
const US = /\b(usa|united states|new york|nyc|san francisco|bay area|seattle|boston|austin|chicago|los angeles|denver|atlanta|miami|washington|dallas|houston|portland|philadelphia|california|texas)\b/i;
const GB = /\b(uk|united kingdom|london|manchester|edinburgh|glasgow|bristol|england|scotland)\b/i;
const FR = /\b(france|paris|lyon|marseille|toulouse|bordeaux|lille|nantes)\b/i;
const DE = /\b(germany|deutschland|berlin|munich|m[uü]nchen|hamburg|frankfurt|cologne|k[oö]ln)\b/i;
const AU = /\b(australia|sydney|melbourne|brisbane|perth|adelaide)\b/i;

export function countryOf(place: string): Country | null {
  if (CA.test(place)) return "ca";
  if (US.test(place)) return "us";
  if (GB.test(place)) return "gb";
  if (FR.test(place)) return "fr";
  if (DE.test(place)) return "de";
  if (AU.test(place)) return "au";
  return null;
}

/** Turn a brief into a handful of searches: top titles × named places (or the whole country for remote). */
export function queriesFor(brief: Brief): SearchQuery[] {
  const titles = brief.targetTitles.map((t) => t.trim()).filter(Boolean).slice(0, 2);
  const places = brief.locations
    .map((l) => l.trim())
    .filter((l) => l && !/^remote$/i.test(l))
    .map((l) => ({ where: l.replace(/\b(canada|usa|united states)\b/i, "").replace(/[,\s]+$/, "").trim() || l, country: countryOf(l) ?? "ca" }))
    .slice(0, 2);
  if (!places.length || brief.remoteOk) places.push({ where: "", country: places[0]?.country ?? "ca" });
  const out: SearchQuery[] = [];
  // Places first, so with two titles both get searched in the seeker's main city.
  for (const p of places) for (const what of titles) out.push({ what, where: p.where, country: p.country });
  const seen = new Set<string>();
  return out.filter((q) => {
    const k = queryKey(q);
    return !seen.has(k) && seen.add(k);
  }).slice(0, MAX_QUERIES);
}

export const queryKey = (q: SearchQuery) => `${q.country}|${q.what.toLowerCase()}|${q.where.toLowerCase()}`;

const REMOTE = /\bremote\b/i;
const clean = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

type AdzunaResult = {
  id: string;
  title: string;
  description?: string;
  created: string;
  redirect_url: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string | number;
};

export async function searchAdzuna(q: SearchQuery): Promise<Job[]> {
  const id = process.env.ADZUNA_APP_ID;
  const key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) return [];
  const params = new URLSearchParams({
    app_id: id,
    app_key: key,
    results_per_page: "50",
    what: q.what,
    max_days_old: "21",
    sort_by: "date",
    "content-type": "application/json",
  });
  if (q.where) params.set("where", q.where);
  const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${q.country}/search/1?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Adzuna returned ${res.status}`);
  const data = (await res.json()) as { results?: AdzunaResult[] };
  return (data.results ?? []).map((r) => {
    const location = r.location?.display_name ?? "";
    const desc = clean(r.description ?? "");
    const pay =
      r.salary_min && String(r.salary_is_predicted) !== "1"
        ? `Pay: ${Math.round(r.salary_min).toLocaleString("en-CA")}${r.salary_max && r.salary_max !== r.salary_min ? `–${Math.round(r.salary_max).toLocaleString("en-CA")}` : ""}. `
        : "";
    return {
      id: `az-${r.id}`,
      title: clean(r.title),
      company: r.company?.display_name ?? "Company not named",
      location,
      remote: REMOTE.test(`${r.title} ${location} ${desc}`),
      url: r.redirect_url,
      description: `${pay}${desc}`,
      postedAt: r.created,
      source: "adzuna" as const,
      board: `adzuna:${q.country}`,
    };
  });
}

type JoobleJob = {
  id: number | string;
  title: string;
  location?: string;
  snippet?: string;
  salary?: string;
  link: string;
  company?: string;
  updated?: string;
  type?: string;
};

export async function searchJooble(q: SearchQuery): Promise<Job[]> {
  const key = process.env.JOOBLE_API_KEY;
  if (!key) return [];
  const location = q.where || { ca: "Canada", us: "USA", gb: "United Kingdom", fr: "France", de: "Germany", au: "Australia" }[q.country];
  const res = await fetch(`https://jooble.org/api/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ keywords: q.what, location, page: "1" }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Jooble returned ${res.status}`);
  const data = (await res.json()) as { jobs?: JoobleJob[] };
  return (data.jobs ?? []).map((j) => {
    const desc = clean(j.snippet ?? "");
    return {
      id: `jb-${j.id}`,
      title: clean(j.title),
      company: j.company?.trim() || "Company not named",
      location: j.location ?? "",
      remote: REMOTE.test(`${j.title} ${j.location} ${desc} ${j.type}`),
      url: j.link,
      description: `${j.salary ? `Pay: ${j.salary}. ` : ""}${desc}`,
      postedAt: j.updated ? new Date(j.updated).toISOString() : new Date().toISOString(),
      source: "jooble" as const,
      board: `jooble:${q.country}`,
    };
  });
}

/** Run each distinct query once on each site that is switched on. */
export async function runSearches(queries: SearchQuery[]): Promise<{ byQuery: Map<string, Job[]>; errors: string[] }> {
  const on = searchSitesOn();
  const byQuery = new Map<string, Job[]>();
  const errors: string[] = [];
  const unique = new Map(queries.map((q) => [queryKey(q), q]));
  await Promise.all(
    [...unique.entries()].map(async ([k, q]) => {
      const runs: Promise<Job[]>[] = [];
      if (on.adzuna) runs.push(searchAdzuna(q));
      if (on.jooble) runs.push(searchJooble(q));
      const settled = await Promise.allSettled(runs);
      const jobs: Job[] = [];
      for (const r of settled) {
        if (r.status === "fulfilled") jobs.push(...r.value);
        else errors.push(`search "${q.what}" ${q.where}: ${(r.reason as Error).message}`);
      }
      byQuery.set(k, jobs);
    }),
  );
  return { byQuery, errors };
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(inc|incorporated|ltd|limited|llc|corp|corporation|co|company|gmbh|sa|plc)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * The same role often shows up on a company board and on several search sites.
 * Company-board copies always stay (they have the full description); a search-site
 * copy is dropped when the same company and title is already there.
 */
export function dedupe(jobs: Job[]): Job[] {
  const isSearch = (j: Job) => j.source === "adzuna" || j.source === "jooble";
  const key = (j: Job) => `${norm(j.company)}|${norm(j.title)}`;
  const seen = new Set(jobs.filter((j) => !isSearch(j)).map(key));
  const out = jobs.filter((j) => !isSearch(j));
  for (const j of jobs.filter(isSearch)) {
    const k = key(j);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(j);
  }
  return out;
}
