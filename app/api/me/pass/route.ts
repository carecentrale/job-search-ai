import { ApiError, readJson, stateResponse, withSeeker } from "@/lib/api";
import { updateSeeker } from "@/lib/seekers";

/** POST /api/me/pass { jobId }: not interested; never show this posting again. */
export async function POST(req: Request) {
  return withSeeker(async (s) => {
    const { jobId } = await readJson<{ jobId?: string }>(req);
    if (!jobId) throw new ApiError(400, "Which posting? Send a jobId.");
    const saved = await updateSeeker(s.id, {
      passed: [jobId, ...s.passed.filter((p) => p !== jobId)].slice(0, 1000),
      matches: s.matches.filter((m) => m.id !== jobId),
    });
    return stateResponse(saved);
  });
}
