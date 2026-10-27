import { STARTER_BOARDS } from "./boards";
import { nudgesFor, type Nudge } from "./followup";
import { sampleJobs } from "./sample";
import { shortlist } from "./score";
import { dedupe, queriesFor, queryKey, runSearches, searchSitesOn } from "./search";
import { fetchBoards, type BoardRef } from "./sources";
import type { AgentSettings, Application, Brief, Job, ScoredJob } from "./types";

/** How far back the first hunt (or a rescan after the brief changes) looks. */
export const FIRST_HUNT_DAYS = 21;
/** Matches older than this drop off the shortlist. */
const MATCH_MAX_AGE_DAYS = 45;
const MAX_MATCHES = 40;

/** One seeker, as the hunt sees them. */
export type Seeker = {
  id: string;
  brief: Brief;
  /** Companies they added on top of the starter list. */
  extraBoards: BoardRef[];
  /** When their last hunt ran. Only postings published after it count as new. */
  lastHuntAt: string | null;
  applications: Application[];
  /** Job ids they passed on. */
  passed: string[];
  /** Their current shortlist, built up across hunts. */
  matches: ScoredJob[];
  /** Autopilot and its limits. */
  agent: AgentSettings;
};

/** What the seeker reads in the morning. */
export type Briefing = {
  seekerId: string;
  date: string;
  postingsRead: number;
  newMatches: ScoredJob[];
  nudges: Nudge[];
  /** Boards that failed to load; shown to admins, not seekers. */
  errors: string[];
};

const DAY = 86_400_000;

/**
 * Build one seeker's briefing from postings already fetched. Pure, so it is easy to test.
 * `rescan` ignores lastHuntAt and looks back FIRST_HUNT_DAYS, used after the brief changes.
 */
export function buildBriefing(
  seeker: Seeker,
  jobs: Job[],
  today = new Date(),
  errors: string[] = [],
  rescan = false,
): Briefing {
  const since = rescan || !seeker.lastHuntAt ? today.getTime() - FIRST_HUNT_DAYS * DAY : new Date(seeker.lastHuntAt).getTime();
  const excluded = new Set([...seeker.passed, ...seeker.applications.map((a) => a.job.id)]);
  const fresh = jobs.filter((j) => new Date(j.postedAt).getTime() > since && !excluded.has(j.id));
  return {
    seekerId: seeker.id,
    date: today.toISOString().slice(0, 10),
    postingsRead: fresh.length,
    newMatches: shortlist(seeker.brief, fresh, today, 15),
    nudges: nudgesFor(seeker.applications, today),
    errors,
  };
}

/**
 * Shortlist order: AI recommendations first, then roles it hasn't looked at yet
 * and "maybe"s, then the ones it advised skipping. Within each, best fit first.
 */
export function rankMatches(matches: ScoredJob[]): ScoredJob[] {
  const tier = (m: ScoredJob) => (m.review?.verdict === "recommend" ? 0 : m.review?.verdict === "skip" ? 2 : 1);
  const score = (m: ScoredJob) => m.review?.fit ?? m.fit;
  return [...matches].sort((a, b) => tier(a) - tier(b) || score(b) - score(a));
}

/** Fold a briefing's matches into the running shortlist: no repeats, nothing stale, best first. */
export function mergeMatches(seeker: Seeker, incoming: ScoredJob[], today = new Date(), replace = false): ScoredJob[] {
  const excluded = new Set([...seeker.passed, ...seeker.applications.map((a) => a.job.id)]);
  const byId = new Map<string, ScoredJob>();
  // Keep anything the seeker added themselves, even on a rescan.
  const kept = replace ? seeker.matches.filter((m) => m.addedByYou) : seeker.matches;
  for (const m of kept) byId.set(m.id, m);
  // A posting seen again keeps its AI review.
  for (const m of incoming) byId.set(m.id, { ...m, review: byId.get(m.id)?.review });
  return rankMatches(
    [...byId.values()].filter(
      (m) => !excluded.has(m.id) && (m.addedByYou || today.getTime() - new Date(m.postedAt).getTime() < MATCH_MAX_AGE_DAYS * DAY),
    ),
  ).filter((m, i) => i < MAX_MATCHES || m.addedByYou);
}

type Pool = { boardJobs: Job[]; searchJobs: Map<string, Job[]>; errors: string[] };

/**
 * Fetch every board and search the seekers need, once each, in parallel.
 * Outside Vercel, FUZZY_SAMPLE_JOBS=1 swaps everything for sample postings (for local testing).
 */
async function loadPool(seekers: Seeker[]): Promise<Pool> {
  if (!process.env.VERCEL && process.env.FUZZY_SAMPLE_JOBS === "1") return { boardJobs: sampleJobs(), searchJobs: new Map(), errors: [] };
  const on = searchSitesOn();
  const [boards, search] = await Promise.all([
    fetchBoards(boardsFor(seekers)),
    on.adzuna || on.jooble ? runSearches(seekers.flatMap((s) => queriesFor(s.brief))) : Promise.resolve({ byQuery: new Map<string, Job[]>(), errors: [] }),
  ]);
  return { boardJobs: boards.jobs, searchJobs: search.byQuery, errors: [...boards.errors, ...search.errors] };
}

const key = (b: BoardRef) => `${b.source}:${b.board}`;

function boardsFor(seekers: Seeker[]): BoardRef[] {
  const boards = new Map<string, BoardRef>();
  for (const b of STARTER_BOARDS) boards.set(key(b), b);
  for (const s of seekers) for (const b of s.extraBoards) boards.set(key(b), b);
  return [...boards.values()];
}

function jobsFor(seeker: Seeker, pool: Pool): Job[] {
  const mine = new Set([...STARTER_BOARDS, ...seeker.extraBoards].map(key));
  const fromBoards = pool.boardJobs.filter((j) => j.source === "sample" || mine.has(j.board));
  const fromSearch = queriesFor(seeker.brief).flatMap((q) => pool.searchJobs.get(queryKey(q)) ?? []);
  return dedupe([...fromBoards, ...fromSearch]);
}

/**
 * The daily hunt for everyone. Each board and search is fetched once and shared
 * across seekers, so the run stays fast as the number of users grows.
 */
export async function runDailyHunt(seekers: Seeker[], today = new Date()): Promise<Briefing[]> {
  const pool = await loadPool(seekers);
  return seekers.map((s) => buildBriefing(s, jobsFor(s, pool), today, pool.errors));
}

/** One seeker's hunt, on demand (after onboarding, a brief change, or "Hunt now"). */
export async function huntFor(seeker: Seeker, rescan: boolean, today = new Date()): Promise<Briefing> {
  const pool = await loadPool([seeker]);
  return buildBriefing(seeker, jobsFor(seeker, pool), today, pool.errors, rescan);
}
