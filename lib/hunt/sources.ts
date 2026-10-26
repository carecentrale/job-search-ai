import type { Job } from "./types";

/**
 * Public job boards. Both are free, need no key, and are used by many
 * tech and fintech companies. A "board" is the company's slug on that
 * service, e.g. greenhouse "stripe" → boards.greenhouse.io/stripe.
 */
export type BoardRef = { source: "greenhouse" | "lever"; board: string; company?: string };

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
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`,
  );
  if (!res.ok) throw new Error(`Greenhouse board "${board}" returned ${res.status}`);
  const data = (await res.json()) as { jobs: GreenhouseJob[] };
  return data.jobs.map((j) => {
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
  const res = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(board)}?mode=json`);
  if (!res.ok) throw new Error(`Lever board "${board}" returned ${res.status}`);
  const data = (await res.json()) as LeverJob[];
  return data.map((j) => {
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

/** Pull every board, skipping (and reporting) any that fail. */
export async function fetchBoards(refs: BoardRef[]): Promise<{ jobs: Job[]; errors: string[] }> {
  const results = await Promise.allSettled(
    refs.map((r) =>
      r.source === "greenhouse" ? fetchGreenhouse(r.board, r.company) : fetchLever(r.board, r.company),
    ),
  );
  const jobs: Job[] = [];
  const errors: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") jobs.push(...r.value);
    else errors.push(`${refs[i].source}/${refs[i].board}: ${(r.reason as Error).message}`);
  });
  return { jobs, errors };
}
