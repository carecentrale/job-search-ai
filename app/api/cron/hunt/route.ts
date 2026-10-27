import { agentPass } from "@/lib/agent";
import { logActivity } from "@/lib/activity";
import { db, hasDb } from "@/lib/db";
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
 * Who may start it:
 * - With CRON_SECRET set in Vercel, only requests carrying it (Vercel Cron sends
 *   `Authorization: Bearer $CRON_SECRET`), as often as they like.
 * - Without it, anyone can call this URL, but the hunt runs at most once every
 *   20 hours, so the most a stranger can do is start the day's hunt a little
 *   early. Nothing is returned except counts.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Not authorised." }, { status: 401 });
  } else if (!(await claimDailyRun())) {
    return Response.json({ skipped: "The morning hunt already ran in the last 20 hours." });
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

/** Atomically record this run, unless one already ran in the last 20 hours. */
async function claimDailyRun(): Promise<boolean> {
  if (!hasDb()) return true;
  const sql = await db();
  const now = new Date().toISOString();
  const rows = await sql`
    insert into app_settings (name, value, updated_by) values ('last_daily_hunt', ${now}, 'cron')
    on conflict (name) do update set value = excluded.value, updated_at = now(), updated_by = 'cron'
      where app_settings.updated_at < now() - interval '20 hours'
    returning name`;
  return rows.length > 0;
}
