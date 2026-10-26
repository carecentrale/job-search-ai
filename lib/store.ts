import type { Briefing, Seeker } from "./hunt/run";
import { sampleApplications, sampleBrief } from "./hunt/sample";

/**
 * Where seekers and briefings live.
 *
 * Until the Railway database is connected, this returns one demo seeker and keeps
 * briefings in memory, so the daily run can be exercised end to end. When
 * DATABASE_URL is set up, these two functions switch to Prisma; nothing that
 * calls them needs to change.
 */

const briefings = new Map<string, Briefing>();

export async function listActiveSeekers(): Promise<Seeker[]> {
  return [
    {
      id: "demo",
      brief: sampleBrief,
      extraBoards: [],
      seenJobIds: [],
      applications: sampleApplications(),
    },
  ];
}

export async function saveBriefing(b: Briefing): Promise<void> {
  briefings.set(`${b.seekerId}:${b.date}`, b);
}

export async function latestBriefing(seekerId: string): Promise<Briefing | undefined> {
  return [...briefings.values()]
    .filter((b) => b.seekerId === seekerId)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}
