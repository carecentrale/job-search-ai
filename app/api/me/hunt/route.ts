import { logActivity } from "@/lib/activity";
import { ApiError, stateResponse, withSeeker } from "@/lib/api";
import { huntFor } from "@/lib/hunt/run";
import { getSeeker, isOnboarded } from "@/lib/seekers";
import { recordBriefing } from "@/lib/store";

export const maxDuration = 60;

const COOLDOWN_MINUTES = 10;

/** POST /api/me/hunt: hunt now instead of waiting for tomorrow morning. */
export async function POST() {
  return withSeeker(async (s) => {
    if (!isOnboarded(s)) throw new ApiError(409, "Add your CV and at least one role you want first.");
    if (s.lastHuntAt) {
      const mins = Math.floor((Date.now() - new Date(s.lastHuntAt).getTime()) / 60_000);
      if (mins < COOLDOWN_MINUTES) {
        throw new ApiError(429, `I hunted ${mins < 1 ? "just now" : `${mins} minute${mins === 1 ? "" : "s"} ago`}. Try again in ${COOLDOWN_MINUTES - mins} minutes.`);
      }
    }
    const now = new Date();
    const b = await huntFor(s, false, now);
    await recordBriefing(s, b, now);
    await logActivity(s.id, "hunt", { trigger: "manual", read: b.postingsRead, found: b.newMatches.length, boardErrors: b.errors.length });
    return stateResponse((await getSeeker(s.id))!, {
      hunt: { read: b.postingsRead, found: b.newMatches.length, boardErrors: b.errors.length },
    });
  });
}
