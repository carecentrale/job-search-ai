import { logActivity } from "@/lib/activity";
import { ApiError, readJson, stateResponse, withSeeker } from "@/lib/api";
import type { Application } from "@/lib/hunt/types";
import { updateSeeker } from "@/lib/seekers";

/** POST /api/me/applications { jobId }: move a shortlisted posting into the tracker. */
export async function POST(req: Request) {
  return withSeeker(async (s) => {
    const { jobId } = await readJson<{ jobId?: string }>(req);
    const job = s.matches.find((m) => m.id === jobId);
    if (!job) throw new ApiError(404, "That posting is no longer on your shortlist.");
    const app: Application = { id: `a-${job.id}`, job, status: "preparing", createdAt: new Date().toISOString(), approvedBy: "you" };
    const saved = await updateSeeker(s.id, {
      applications: [app, ...s.applications.filter((a) => a.id !== app.id)],
      matches: s.matches.filter((m) => m.id !== job.id),
    });
    await logActivity(s.id, "application_created", { company: job.company, title: job.title, fit: job.fit, aiVerdict: job.review?.verdict ?? null, aiFit: job.review?.fit ?? null, url: job.url });
    return stateResponse(saved, { applicationId: app.id });
  });
}
