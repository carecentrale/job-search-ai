import { stateResponse, withSeeker } from "@/lib/api";

/** GET /api/me: the signed-in seeker's workspace. */
export async function GET() {
  return withSeeker((s) => stateResponse(s));
}
