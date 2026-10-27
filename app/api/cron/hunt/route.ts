import { agentPass } from "@/lib/agent";
import { logActivity } from "@/lib/activity";
import { hasDb } from "@/lib/db";
import { getSeeker } from "@/lib/seekers";
import { runDailyHunt } from "@/lib/hunt/run";
import { listActiveSeekers, recordBriefing } from "@/lib/store";

export const maxDuration = 300;

/**
 * GET /api/cron/hunt
 * Runs every morning (see vercel.json). Hunts every active seeker's boards,
 * scores postings published since their last hunt, works out follow-up
 * nudges, and saves one briefing per seeker for when they open the app.
 * Then, while time allows, the AI reviews each seeker's new matches and
 * Autopilot approves and writes for those who switched it on. Anyone it doesn't
 * reach gets their review when they next open the app.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; anything else is refused.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }

  const started = Date.now();
  const now = new Date();
  const seekers = await listActiveSeekers();
  const briefings = await runDailyHunt(seekers, now);
  const failed: string[] = [];
  for (const [i, b] of briefings.entries()) {
    try {
      await recordBriefing(seekers[i], b, now);
      if (seekers[i].id !== "demo") {
        await logActivity(b.seekerId, "hunt", { trigger: "daily", read: b.postingsRead, found: b.newMatches.length, nudges: b.nudges.length });
      }
    } catch (e) {
      failed.push(`${b.seekerId}: ${(e as Error).message}`);
    }
  }

  // The agent's pass, Autopilot users first since they're waiting on documents.
  const deadline = started + 270_000;
  const agent = { reviewed: 0, approved: 0, written: 0, stopped: 0, skipped: 0 };
  if (hasDb()) {
    const order = [...seekers].sort((a, b) => Number(b.agent.autopilot) - Number(a.agent.autopilot));
    for (const s of order) {
      if (Date.now() > deadline - 60_000) {
        agent.skipped++;
        continue;
      }
      const record = await getSeeker(s.id);
      if (!record) continue;
      const r = await agentPass(record, { trigger: "daily", deadline, write: true });
      agent.reviewed += r.reviewed;
      agent.approved += r.approved;
      agent.written += r.written;
      if (r.stopped) agent.stopped++;
    }
  }

  return Response.json({
    agent,
    seekers: seekers.length,
    newMatches: briefings.reduce((n, b) => n + b.newMatches.length, 0),
    nudges: briefings.reduce((n, b) => n + b.nudges.length, 0),
    boardErrors: briefings[0]?.errors ?? [],
    saveErrors: failed,
    tookMs: Date.now() - started,
  });
}
