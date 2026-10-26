import { STARTER_BOARDS } from "./boards";
import { nudgesFor, type Nudge } from "./followup";
import { shortlist } from "./score";
import { fetchBoards, type BoardRef } from "./sources";
import type { Application, Brief, Job, ScoredJob } from "./types";

/** One seeker, as the daily run sees them. */
export type Seeker = {
  id: string;
  brief: Brief;
  /** Companies they added on top of the starter list. */
  extraBoards: BoardRef[];
  /** Postings already shown to them, so the briefing only has new ones. */
  seenJobIds: string[];
  applications: Application[];
};

/** What the seeker reads in the morning. */
export type Briefing = {
  seekerId: string;
  date: string;
  postingsRead: number;
  newMatches: ScoredJob[];
  nudges: Nudge[];
  /** Boards that failed to load today; shown to admins, not seekers. */
  errors: string[];
};

/** Build one seeker's briefing from postings already fetched. Pure, so it is easy to test. */
export function buildBriefing(seeker: Seeker, jobs: Job[], today = new Date(), errors: string[] = []): Briefing {
  const seen = new Set(seeker.seenJobIds);
  const applied = new Set(seeker.applications.map((a) => a.job.id));
  const fresh = jobs.filter((j) => !seen.has(j.id) && !applied.has(j.id));
  return {
    seekerId: seeker.id,
    date: today.toISOString().slice(0, 10),
    postingsRead: fresh.length,
    newMatches: shortlist(seeker.brief, fresh, today, 5),
    nudges: nudgesFor(seeker.applications, today),
    errors,
  };
}

/**
 * The daily hunt for everyone. Each board is fetched once and shared
 * across seekers, so the run stays fast as the number of users grows.
 */
export async function runDailyHunt(seekers: Seeker[], today = new Date()): Promise<Briefing[]> {
  const key = (b: BoardRef) => `${b.source}:${b.board}`;
  const boards = new Map<string, BoardRef>();
  for (const b of STARTER_BOARDS) boards.set(key(b), b);
  for (const s of seekers) for (const b of s.extraBoards) boards.set(key(b), b);

  const { jobs, errors } = await fetchBoards([...boards.values()]);

  return seekers.map((s) => {
    const mine = new Set([...STARTER_BOARDS, ...s.extraBoards].map(key));
    const theirJobs = jobs.filter((j) => mine.has(j.board));
    return buildBriefing(s, theirJobs, today, errors);
  });
}
