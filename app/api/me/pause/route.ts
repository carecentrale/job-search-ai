import { logActivity } from "@/lib/activity";
import { ApiError, readJson, stateResponse, withSeeker } from "@/lib/api";
import { pauseBilling } from "@/lib/billing";
import { getSeeker, updateSeeker } from "@/lib/seekers";

/**
 * POST /api/me/pause { months: 1 | 2 | 3 | null }: take a break.
 * Stops hunting, reminders and Autopilot. For Personal subscribers it also
 * pauses billing: no more charges, and they keep Personal until the end of the
 * month they've paid for. Billing resumes by itself after `months`, or when
 * they choose to (null).
 */
export async function POST(req: Request) {
  return withSeeker(async (s) => {
    const { months = null } = await readJson<{ months?: number | null }>(req);
    if (months !== null && ![1, 2, 3].includes(months)) throw new ApiError(400, "Pause for 1, 2 or 3 months, or until you resume.");
    let billing;
    try {
      billing = await pauseBilling(s.id, months);
    } catch (e) {
      console.error("pause billing failed", (e as Error).message);
      throw new ApiError(502, "I couldn't pause your billing with Stripe just now, so nothing has changed. Try again in a minute.");
    }
    await updateSeeker(s.id, { huntingPaused: true, agent: { ...s.agent, autopilot: false } });
    await logActivity(s.id, "paused", { months, billing: Boolean(billing.paidThrough), paidThrough: billing.paidThrough, resumeAt: billing.resumeAt });
    return stateResponse((await getSeeker(s.id))!);
  });
}
