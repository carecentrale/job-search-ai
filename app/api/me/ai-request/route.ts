import { logAiWanted } from "@/lib/activity";
import { readJson, stateResponse, withSeeker } from "@/lib/api";

/** POST /api/me/ai-request { feature }: "tell me when free AI writing is on". Shows up as demand in the owner's admin. */
export async function POST(req: Request) {
  return withSeeker(async (s) => {
    const { feature } = await readJson<{ feature?: string }>(req).catch(() => ({ feature: undefined }));
    await logAiWanted(s.id, typeof feature === "string" ? feature.slice(0, 40) : "notify me");
    return stateResponse(s);
  });
}
