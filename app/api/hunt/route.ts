import { shortlist } from "@/lib/hunt/score";
import { fetchBoards, type BoardRef } from "@/lib/hunt/sources";
import type { Brief } from "@/lib/hunt/types";

/**
 * POST /api/hunt
 * Body: { brief: Brief, boards: BoardRef[] }
 * Pulls the boards, scores every posting against the brief, returns the best fits.
 * Later this runs on a daily schedule per user instead of on demand.
 */
export async function POST(req: Request) {
  let body: { brief?: Brief; boards?: BoardRef[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Send a JSON body with a brief and a list of boards." }, { status: 400 });
  }
  const { brief, boards } = body;
  if (!brief || !Array.isArray(brief.targetTitles) || !Array.isArray(boards) || boards.length === 0) {
    return Response.json({ error: "A brief with target titles and at least one board is required." }, { status: 400 });
  }
  if (boards.length > 25) {
    return Response.json({ error: "Hunt up to 25 boards at a time." }, { status: 400 });
  }

  const { jobs, errors } = await fetchBoards(boards);
  const results = shortlist(brief, jobs);
  return Response.json({ read: jobs.length, shortlist: results, errors });
}
