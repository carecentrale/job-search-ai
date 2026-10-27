import { runDailyHunt } from "@/lib/hunt/run";
import { listActiveSeekers, recordBriefing } from "@/lib/store";

export const maxDuration = 300;

/**
 * GET /api/cron/hunt
 * Runs every morning (see vercel.json). Hunts every active seeker's boards,
 * scores postings published since their last hunt, works out follow-up
 * nudges, and saves one briefing per seeker for when they open the app.
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
    } catch (e) {
      failed.push(`${b.seekerId}: ${(e as Error).message}`);
    }
  }

  return Response.json({
    seekers: seekers.length,
    newMatches: briefings.reduce((n, b) => n + b.newMatches.length, 0),
    nudges: briefings.reduce((n, b) => n + b.nudges.length, 0),
    boardErrors: briefings[0]?.errors ?? [],
    saveErrors: failed,
    tookMs: Date.now() - started,
  });
}
