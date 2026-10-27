import { logActivity } from "@/lib/activity";
import { ApiError, readJson, stateResponse, withSeeker } from "@/lib/api";
import { updateSeeker } from "@/lib/seekers";

/** POST /api/me/pass { jobId }: not interested; never show this posting again. */
export async function POST(req: Request) {
  return withSeeker(async (s) => {
    const { jobId } = await readJson<{ jobId?: string }>(req);
    if (!jobId) throw new ApiError(400, "Which posting? Send a jobId.");
    const job = s.matches.find((m) => m.id === jobId);
    const saved = await updateSeeker(s.id, {
      passed: [jobId, ...s.passed.filter((p) => p !== jobId)].slice(0, 1000),
      matches: s.matches.filter((m) => m.id !== jobId),
    });
    await logActivity(s.id, "job_passed", { jobId, company: job?.company, title: job?.title, fit: job?.fit, aiVerdict: job?.review?.verdict ?? null });
    return stateResponse(saved);
  });
}
