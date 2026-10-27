import { ApiError, readJson, stateResponse, withSeeker } from "@/lib/api";
import type { Application, ApplicationStatus } from "@/lib/hunt/types";
import { updateSeeker } from "@/lib/seekers";

const STATUSES: ApplicationStatus[] = ["preparing", "applied", "interviewing", "offer", "closed"];

type Body = { status?: ApplicationStatus; followedUp?: boolean; note?: string; interviewAt?: string | null };

/** PATCH /api/me/applications/:id: move along the tracker, log a follow-up, add a note or interview date. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withSeeker(async (s) => {
    const body = await readJson<Body>(req);
    const app = s.applications.find((a) => a.id === id);
    if (!app) throw new ApiError(404, "That application isn't in your tracker.");
    if (body.status && !STATUSES.includes(body.status)) throw new ApiError(400, `Status must be one of: ${STATUSES.join(", ")}.`);

    const now = new Date().toISOString();
    const next: Application = { ...app };
    if (body.status) {
      next.status = body.status;
      if (body.status === "applied" && !next.appliedAt) next.appliedAt = now;
    }
    if (body.followedUp) next.lastFollowUpAt = now;
    if (body.note !== undefined) next.note = String(body.note).slice(0, 500) || undefined;
    if (body.interviewAt !== undefined) {
      if (body.interviewAt && Number.isNaN(Date.parse(body.interviewAt))) throw new ApiError(400, "Interview date isn't a valid date.");
      next.interviewAt = body.interviewAt || undefined;
    }

    const saved = await updateSeeker(s.id, { applications: s.applications.map((a) => (a.id === id ? next : a)) });
    return stateResponse(saved);
  });
}
