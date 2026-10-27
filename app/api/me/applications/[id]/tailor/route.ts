import { writeDocuments } from "@/lib/agent";
import { stateResponse, withSeeker } from "@/lib/api";

export const maxDuration = 120;

/** POST /api/me/applications/:id/tailor: the AI writes the CV and cover letter for this posting. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withSeeker(async (s) => {
    const app = s.applications.find((a) => a.id === id);
    const saved = await writeDocuments(s, id, app?.approvedBy === "autopilot" && !app.tailored ? "autopilot" : "you");
    return stateResponse(saved, { applicationId: id });
  }, _req);
}
