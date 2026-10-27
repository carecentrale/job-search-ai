import { autopilotApprove, reviewPending } from "@/lib/agent";
import { stateResponse, withSeeker } from "@/lib/api";

export const maxDuration = 120;

/**
 * POST /api/me/review: the AI reviews the next batch of unreviewed matches,
 * then Autopilot (if on) approves strong ones. The workspace calls this after a
 * hunt, and again while there are matches left to review.
 */
export async function POST(req: Request) {
  const trigger = new URL(req.url).searchParams.get("trigger") === "manual" ? "manual" : "auto";
  return withSeeker(async (s) => {
    const r = await reviewPending(s, trigger);
    const a = await autopilotApprove(r.seeker);
    return stateResponse(a.seeker, { review: { reviewed: r.reviewed, approved: a.approved.length } });
  });
}
