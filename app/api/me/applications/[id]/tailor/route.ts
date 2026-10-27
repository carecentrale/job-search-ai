import { aiEnabled, tailorApplication } from "@/lib/ai";
import { ApiError, stateResponse, withSeeker } from "@/lib/api";
import { trialStatus, updateSeeker } from "@/lib/seekers";

export const maxDuration = 120;

const MAX_WRITES_PER_APPLICATION = 3;

/** POST /api/me/applications/:id/tailor: Claude writes the CV and cover letter for this posting. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withSeeker(async (s) => {
    if (!aiEnabled()) throw new ApiError(503, "Writing is switched off until the Claude API key is added.");
    const app = s.applications.find((a) => a.id === id);
    if (!app) throw new ApiError(404, "That application isn't in your tracker.");
    if (!s.cvText) throw new ApiError(409, "Add your CV first, under Your brief.");

    const trial = trialStatus(s);
    if (trial.ended) throw new ApiError(402, "Your free week has ended. Paid plans open soon, and everything you made is still here to download.");
    if (!app.tailored && trial.limit !== null && trial.used >= trial.limit) {
      throw new ApiError(402, `You've used all ${trial.limit} tailored applications in your free week. You can still rewrite the ones you have.`);
    }

    if ((app.writes ?? 0) >= MAX_WRITES_PER_APPLICATION) {
      throw new ApiError(429, `I've written this one ${MAX_WRITES_PER_APPLICATION} times, which is the limit. Copy it into your own document to keep editing.`);
    }

    let tailored;
    try {
      tailored = await tailorApplication(s.cvText, s.brief, app.job);
    } catch (e) {
      console.error("tailor failed", e);
      throw new ApiError(502, "Claude couldn't finish this one. Try again in a minute.");
    }

    const saved = await updateSeeker(s.id, {
      applications: s.applications.map((a) => (a.id === id ? { ...a, tailored, writes: (a.writes ?? 0) + 1 } : a)),
    });
    return stateResponse(saved, { applicationId: id });
  });
}
