import { logActivity } from "@/lib/activity";
import { ApiError, readJson, stateResponse, withSeeker } from "@/lib/api";
import { pauseBilling } from "@/lib/billing";
import { getSeeker, updateSeeker } from "@/lib/seekers";

/**
 * POST /api/me/got-job { applicationId?, company? }: they got a job.
 * Right away: hunting, reminders and Autopilot stop, and a Personal
 * subscription's billing is paused until they resume. Their tracker and
 * documents stay. The owner sees it in Admin.
 */
export async function POST(req: Request) {
  return withSeeker(async (s) => {
    const { applicationId = null, company = null } = await readJson<{ applicationId?: string | null; company?: string | null }>(req);
    const app = applicationId ? s.applications.find((a) => a.id === applicationId) : null;
    if (applicationId && !app) throw new ApiError(404, "That application isn't in your tracker.");
    try {
      await pauseBilling(s.id, null);
    } catch (e) {
      console.error("pause billing on job failed", (e as Error).message);
      throw new ApiError(502, "I couldn't pause your billing with Stripe just now, so nothing has changed. Try again in a minute.");
    }
    const gotJob = {
      at: new Date().toISOString(),
      company: app?.job.company ?? (company?.trim().slice(0, 120) || null),
      title: app?.job.title ?? null,
      applicationId: app?.id ?? null,
    };
    await updateSeeker(s.id, {
      huntingPaused: true,
      gotJob,
      agent: { ...s.agent, autopilot: false },
      applications: app ? s.applications.map((a) => (a.id === app.id ? { ...a, status: "offer" as const } : a)) : undefined,
    });
    await logActivity(s.id, "got_job", { company: gotJob.company, title: gotJob.title, fromTracker: Boolean(app), wasPaying: s.plan === "personal" });
    return stateResponse((await getSeeker(s.id))!);
  });
}
