import { runDailyHunt } from "@/lib/hunt/run";
import { listActiveSeekers, saveBriefing } from "@/lib/store";

/**
 * GET /api/cron/hunt
 * Runs every morning (see vercel.json). Hunts every active seeker's boards,
 * scores new postings against their brief, works out follow-up nudges and
 * saves one briefing per seeker for them to read when they open the app.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; anything else is refused.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }

  const started = Date.now();
  const seekers = await listActiveSeekers();
  const briefings = await runDailyHunt(seekers);
  await Promise.all(briefings.map(saveBriefing));

  return Response.json({
    seekers: seekers.length,
    newMatches: briefings.reduce((n, b) => n + b.newMatches.length, 0),
    nudges: briefings.reduce((n, b) => n + b.nudges.length, 0),
    boardErrors: briefings[0]?.errors ?? [],
    tookMs: Date.now() - started,
  });
}
