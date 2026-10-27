import type { Job } from "./types";

/**
 * Public company job boards. All are free, need no key, and include full job
 * descriptions. A "board" is the company's slug on that service, e.g.
 * greenhouse "stripe" → boards.greenhouse.io/stripe.
 */
export type BoardSource = "greenhouse" | "lever" | "ashby" | "recruitee";
export type BoardRef = { source: BoardSource; board: string; company?: string };

/** Cap per board, so one giant employer can't crowd out everything else. */
const MAX_PER_BOARD = 400;
const TIMEOUT_MS = 15_000;

async function getJson<T>(url: string, label: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${label} returned ${res.status}`);
  return (await res.json()) as T;
}

const REMOTE = /\bremote\b/i;

function stripHtml(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type GreenhouseJob = {
  id: number;
  title: string;
  updated_at: string;
  first_published?: string;
  company_name?: string;
  absolute_url: string;
  location?: { name?: string };
  content?: string;
};

export async function fetchGreenhouse(board: string, company?: string): Promise<Job[]> {
  const data = await getJson<{ jobs: GreenhouseJob[] }>(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`,
    `Greenhouse board "${board}"`,
  );
  return data.jobs.slice(0, MAX_PER_BOARD).map((j) => {
    const location = j.location?.name ?? "";
    return {
      id: `gh-${board}-${j.id}`,
      title: j.title,
      company: company ?? j.company_name ?? board,
      location,
      remote: REMOTE.test(location),
      url: j.absolute_url,
      description: stripHtml(j.content ?? ""),
      postedAt: j.first_published ?? j.updated_at,
      source: "greenhouse",
      board: `greenhouse:${board}`,
    };
  });
}

type LeverJob = {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt: number;
  descriptionPlain?: string;
  additionalPlain?: string;
  lists?: { text: string; content: string }[];
  categories?: { location?: string; allLocations?: string[] };
  workplaceType?: string;
};

export async function fetchLever(board: string, company = board): Promise<Job[]> {
  const data = await getJson<LeverJob[]>(`https://api.lever.co/v0/postings/${encodeURIComponent(board)}?mode=json`, `Lever board "${board}"`);
  return data.slice(0, MAX_PER_BOARD).map((j) => {
    const location = j.categories?.location ?? j.categories?.allLocations?.join(", ") ?? "";
    const lists = (j.lists ?? []).map((l) => `${l.text} ${stripHtml(l.content)}`).join(" ");
    return {
      id: `lv-${board}-${j.id}`,
      title: j.text,
      company,
      location,
      remote: j.workplaceType === "remote" || REMOTE.test(location),
      url: j.hostedUrl,
      description: `${j.descriptionPlain ?? ""} ${lists} ${j.additionalPlain ?? ""}`.trim(),
      postedAt: new Date(j.createdAt).toISOString(),
      source: "lever",
      board: `lever:${board}`,
    };
  });
}

type AshbyJob = {
  id: string;
  title: string;
  location?: string;
  secondaryLocations?: { location?: string }[];
  isRemote?: boolean;
  workplaceType?: string;
  publishedAt: string;
  jobUrl: string;
  descriptionPlain?: string;
  isListed?: boolean;
  compensation?: { compensationTierSummary?: string };
};

export async function fetchAshby(board: string, company = board): Promise<Job[]> {
  const data = await getJson<{ jobs: AshbyJob[] }>(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`,
    `Ashby board "${board}"`,
  );
  return data.jobs
    .filter((j) => j.isListed !== false)
    .slice(0, MAX_PER_BOARD)
    .map((j) => {
      const location = [j.location, ...(j.secondaryLocations ?? []).map((l) => l.location)].filter(Boolean).join("; ");
      const pay = j.compensation?.compensationTierSummary;
      return {
        id: `ab-${board}-${j.id}`,
        title: j.title.trim(),
        company,
        location,
        remote: Boolean(j.isRemote) || j.workplaceType === "Remote" || REMOTE.test(location),
        url: j.jobUrl,
        description: `${pay ? `Pay: ${pay}. ` : ""}${(j.descriptionPlain ?? "").replace(/\s+/g, " ").trim()}`,
        postedAt: j.publishedAt,
        source: "ashby",
        board: `ashby:${board}`,
      };
    });
}

type RecruiteeOffer = {
  id: number;
  title: string;
  location?: string;
  city?: string;
  country?: string;
  remote?: boolean;
  careers_url: string;
  description?: string;
  requirements?: string;
  published_at?: string;
  created_at?: string;
  company_name?: string;
};

/** Recruitee dates look like "2026-10-26 13:13:39 UTC". */
function recruiteeDate(d?: string): string {
  const t = d ? new Date(d.replace(" UTC", "Z").replace(" ", "T")) : new Date();
  return Number.isNaN(t.getTime()) ? new Date().toISOString() : t.toISOString();
}

export async function fetchRecruitee(board: string, company?: string): Promise<Job[]> {
  const data = await getJson<{ offers: RecruiteeOffer[] }>(
    `https://${encodeURIComponent(board)}.recruitee.com/api/offers/`,
    `Recruitee board "${board}"`,
  );
  return data.offers.slice(0, MAX_PER_BOARD).map((j) => {
    const location = j.location || [j.city, j.country].filter(Boolean).join(", ");
    return {
      id: `rc-${board}-${j.id}`,
      title: j.title,
      company: company ?? j.company_name ?? board,
      location,
      remote: Boolean(j.remote) || REMOTE.test(location),
      url: j.careers_url,
      description: stripHtml(`${j.description ?? ""} ${j.requirements ?? ""}`),
      postedAt: recruiteeDate(j.published_at ?? j.created_at),
      source: "recruitee",
      board: `recruitee:${board}`,
    };
  });
}

const FETCHERS: Record<BoardSource, (board: string, company?: string) => Promise<Job[]>> = {
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  ashby: fetchAshby,
  recruitee: fetchRecruitee,
};

/** Pull every board, a few at a time, skipping (and reporting) any that fail. */
export async function fetchBoards(refs: BoardRef[], concurrency = 12): Promise<{ jobs: Job[]; errors: string[] }> {
  const jobs: Job[] = [];
  const errors: string[] = [];
  let next = 0;
  async function worker() {
    while (next < refs.length) {
      const r = refs[next++];
      try {
        jobs.push(...(await FETCHERS[r.source](r.board, r.company)));
      } catch (e) {
        errors.push(`${r.source}/${r.board}: ${(e as Error).message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, refs.length) }, worker));
  return { jobs, errors };
}

/**
 * Work out which board a careers-page or job link belongs to, e.g.
 * https://jobs.ashbyhq.com/ramp/123 → { source: "ashby", board: "ramp" }.
 */
export function boardFromUrl(raw: string): (BoardRef & { jobId?: string }) | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const parts = u.pathname.split("/").filter(Boolean);
  if (/(^|\.)greenhouse\.io$/.test(host)) {
    const ghJid = u.searchParams.get("gh_jid") ?? undefined;
    const fromQuery = u.searchParams.get("for");
    if (fromQuery) return { source: "greenhouse", board: fromQuery, jobId: ghJid };
    if (parts[0] && parts[0] !== "embed") return { source: "greenhouse", board: parts[0], jobId: parts[1] === "jobs" ? parts[2] : ghJid };
  }
  if (host === "jobs.lever.co" && parts[0]) return { source: "lever", board: parts[0], jobId: parts[1] };
  if (host === "jobs.ashbyhq.com" && parts[0]) return { source: "ashby", board: parts[0], jobId: parts[1] };
  const rc = /^([a-z0-9-]+)\.recruitee\.com$/.exec(host);
  if (rc) return { source: "recruitee", board: rc[1], jobId: parts[0] === "o" ? parts[1] : undefined };
  return null;
}
