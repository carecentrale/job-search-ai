import type { Brief, Job, ScoredJob } from "./types";

const STALE_AFTER_DAYS = 30;
const MIN_FIT = 55;
const STALE_PENALTY = 12;

const STOP = new Set(["and", "or", "of", "the", "a", "an", "to", "for", "in", "with", "&", "-", "/"]);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));
}

function contains(haystack: string, phrase: string): boolean {
  const h = ` ${words(haystack).join(" ")} `;
  const p = words(phrase).join(" ");
  return p.length > 0 && h.includes(` ${p} `);
}

export function daysBetween(fromIso: string, to: Date): number {
  return Math.floor((to.getTime() - new Date(fromIso).getTime()) / 86_400_000);
}

/** Share of a target title's words that appear in the job title, best match wins. */
function titleScore(brief: Brief, job: Job): { score: number; match?: string } {
  const jobWords = new Set(words(job.title));
  let best = { score: 0, match: undefined as string | undefined };
  for (const t of brief.targetTitles) {
    const tw = words(t);
    if (!tw.length) continue;
    const hit = tw.filter((w) => jobWords.has(w)).length / tw.length;
    if (hit > best.score) best = { score: hit, match: t };
  }
  return best;
}

function locationScore(brief: Brief, job: Job): { score: number; label?: string } {
  if (job.remote && brief.remoteOk) return { score: 1, label: "Remote" };
  const hit = brief.locations.find((l) => contains(job.location, l));
  if (hit) return { score: 1, label: hit };
  return { score: 0 };
}

/**
 * Rate a posting against the brief. Returns null when the posting should be
 * dropped outright (it mentions something the seeker asked to avoid).
 */
export function scoreJob(brief: Brief, job: Job, today = new Date()): ScoredJob | null {
  const text = `${job.title} ${job.description}`;
  if (brief.avoid.some((a) => contains(text, a))) return null;

  const title = titleScore(brief, job);
  const loc = locationScore(brief, job);
  const skillsHit = brief.skills.filter((s) => contains(text, s));
  const skillScore = brief.skills.length
    ? Math.min(1, skillsHit.length / Math.min(brief.skills.length, 5))
    : 0;

  const age = daysBetween(job.postedAt, today);
  const raw = 100 * (0.45 * title.score + 0.35 * skillScore + 0.2 * loc.score);
  const fit = Math.max(0, Math.min(99, Math.round(raw - (age > STALE_AFTER_DAYS ? STALE_PENALTY : 0))));

  const reasons: string[] = [];
  if (title.match && title.score >= 0.6) reasons.push(`Matches your target title, ${title.match}`);
  if (skillsHit.length) reasons.push(`Asks for ${skillsHit.slice(0, 3).join(", ")}`);
  if (loc.label) reasons.push(loc.label === "Remote" ? "Remote" : `In ${loc.label}`);

  const warnings: string[] = [];
  if (age > STALE_AFTER_DAYS) warnings.push(`Posted ${age} days ago. It may already be filled.`);
  if (job.description.trim().length < 200) warnings.push("Very short posting. Details are thin.");
  if (!loc.label) warnings.push(`Location is ${job.location || "not stated"}, outside your brief.`);

  return { ...job, fit, reasons, warnings };
}

/** Score, drop poor fits, best first. */
export function shortlist(brief: Brief, jobs: Job[], today = new Date(), limit = 10): ScoredJob[] {
  return jobs
    .map((j) => scoreJob(brief, j, today))
    .filter((j): j is ScoredJob => j !== null && j.fit >= MIN_FIT)
    .sort((a, b) => b.fit - a.fit || a.postedAt.localeCompare(b.postedAt) * -1)
    .slice(0, limit);
}
