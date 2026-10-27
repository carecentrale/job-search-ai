import { autopilotApprove } from "@/lib/agent";
import { logActivity } from "@/lib/activity";
import { ApiError, readJson, stateResponse, withSeeker } from "@/lib/api";
import type { AgentSettings } from "@/lib/hunt/types";
import { updateSeeker } from "@/lib/seekers";

/** PUT /api/me/agent { autopilot, minFit, perDay }: how much the headhunter may do without asking. */
export async function PUT(req: Request) {
  return withSeeker(async (s) => {
    const body = await readJson<Partial<AgentSettings>>(req);
    const agent: AgentSettings = {
      autopilot: typeof body.autopilot === "boolean" ? body.autopilot : s.agent.autopilot,
      minFit: Number.isFinite(body.minFit) ? Math.round(Number(body.minFit)) : s.agent.minFit,
      perDay: Number.isFinite(body.perDay) ? Math.round(Number(body.perDay)) : s.agent.perDay,
    };
    if (agent.minFit < 60 || agent.minFit > 95) throw new ApiError(400, "Pick a minimum fit between 60 and 95.");
    if (agent.perDay < 1 || agent.perDay > 5) throw new ApiError(400, "Pick between 1 and 5 applications a day.");
    const saved = await updateSeeker(s.id, { agent });
    await logActivity(s.id, "autopilot_changed", { ...agent });
    // Switching on (or loosening the limits) applies to roles the AI already recommended.
    const { seeker, approved } = await autopilotApprove(saved);
    return stateResponse(seeker, { review: { reviewed: 0, approved: approved.length } });
  });
}
