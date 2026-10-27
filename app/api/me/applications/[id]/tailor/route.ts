import { tailorApplication } from "@/lib/ai";
import { ApiError, stateResponse, withSeeker } from "@/lib/api";
import { chooseClaude, claudeError, recordUse, reserveCall } from "@/lib/claude";
import { trialStatus, updateSeeker } from "@/lib/seekers";

export const maxDuration = 120;

/** On fuzzyHR's key only; with their own key, users can rewrite as often as they like. */
const MAX_WRITES_PER_APPLICATION = 3;

/** POST /api/me/applications/:id/tailor: Claude writes the CV and cover letter for this posting. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withSeeker(async (s) => {
    const app = s.applications.find((a) => a.id === id);
    if (!app) throw new ApiError(404, "That application isn't in your tracker.");
    if (!s.cvText) throw new ApiError(409, "Add your CV first, under Your brief.");

    const claude = chooseClaude(s);
    if (claude.source === "house") {
      const trial = trialStatus(s);
      if (!app.tailored && trial.limit !== null && trial.used >= trial.limit) {
        throw new ApiError(402, `You've used all ${trial.limit} tailored applications in your free week. Add your own Claude key under Plan to keep going for free.`);
      }
      if ((app.writes ?? 0) >= MAX_WRITES_PER_APPLICATION) {
        throw new ApiError(429, `I've written this one ${MAX_WRITES_PER_APPLICATION} times, the free-week limit. Add your own Claude key under Plan to rewrite it again.`);
      }
    }
    await reserveCall(s, claude);

    let out;
    try {
      out = await tailorApplication(claude.client, s.cvText, s.brief, app.job);
    } catch (e) {
      console.error("tailor failed", (e as { status?: number }).status, (e as Error).message);
      throw claudeError(e, claude);
    }
    await recordUse(s, claude, out.use);

    const saved = await updateSeeker(s.id, {
      applications: s.applications.map((a) => (a.id === id ? { ...a, tailored: out.data, writes: (a.writes ?? 0) + 1 } : a)),
    });
    return stateResponse(saved, { applicationId: id });
  });
}
