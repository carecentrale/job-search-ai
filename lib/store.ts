import { hasDb } from "./db";
import { mergeMatches, type Briefing, type Seeker } from "./hunt/run";
import { sampleApplications, sampleBrief } from "./hunt/sample";
import * as seekers from "./seekers";

/**
 * What the daily hunt reads and writes. Uses the database when DATABASE_URL is
 * set; otherwise one demo seeker in memory, so the hunt can still be exercised.
 */

const demoBriefings = new Map<string, Briefing>();

export async function listActiveSeekers(): Promise<Seeker[]> {
  if (hasDb()) return seekers.listActiveSeekers();
  return [
    {
      id: "demo",
      brief: sampleBrief,
      extraBoards: [],
      lastHuntAt: null,
      applications: sampleApplications(),
      passed: [],
      matches: [],
    },
  ];
}

/** Save the briefing and fold its matches into the seeker's shortlist (or replace it, after the brief changes). */
export async function recordBriefing(seeker: Seeker, b: Briefing, now = new Date(), replace = false): Promise<void> {
  if (!hasDb()) {
    demoBriefings.set(`${b.seekerId}:${b.date}`, b);
    return;
  }
  await seekers.saveBriefing(b);
  await seekers.updateSeeker(seeker.id, { matches: mergeMatches(seeker, b.newMatches, now, replace), lastHuntAt: now });
}
