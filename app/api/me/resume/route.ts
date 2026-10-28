import { logActivity } from "@/lib/activity";
import { ApiError, stateResponse, withSeeker } from "@/lib/api";
import { resumeBilling } from "@/lib/billing";
import { getSeeker, updateSeeker } from "@/lib/seekers";

/** POST /api/me/resume: back to hunting; for subscribers, billing resumes too. */
export async function POST() {
  return withSeeker(async (s) => {
    let billing;
    try {
      billing = await resumeBilling(s.id);
    } catch (e) {
      console.error("resume billing failed", (e as Error).message);
      throw new ApiError(502, "I couldn't resume your billing with Stripe just now. Try again in a minute.");
    }
    await updateSeeker(s.id, { huntingPaused: false, gotJob: null });
    await logActivity(s.id, "resumed", { chargedNow: billing.chargedNow, hadJob: Boolean(s.gotJob) });
    return stateResponse((await getSeeker(s.id))!, { resumed: billing });
  });
}
