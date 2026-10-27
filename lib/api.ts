import "server-only";
import { logActivity, touchLastSeen } from "./activity";
import { houseKeyAvailable } from "./ai";
import { currentCaller } from "./auth";
import { houseCallsToday, limits } from "./claude";
import { canStoreSecrets } from "./crypto";
import { hasDb } from "./db";
import { ApiError } from "./errors";
import { nudgesFor } from "./hunt/followup";
import { getOrCreateSeeker, hasOwnKey, isOnboarded, latestBriefing, trialStatus, type SeekerRecord } from "./seekers";

export { ApiError };

/** Run a handler for the signed-in seeker, with consistent errors. */
export async function withSeeker(handler: (s: SeekerRecord) => Promise<Response>): Promise<Response> {
  let seeker: SeekerRecord | null = null;
  try {
    if (!hasDb()) throw new ApiError(503, "Accounts are not switched on yet. Try the demo in the meantime.");
    const caller = await currentCaller();
    if (!caller) throw new ApiError(401, "Sign in to use your headhunter.");
    seeker = await getOrCreateSeeker(caller.userId, caller.email);
    await touchLastSeen(seeker.id);
    return await handler(seeker);
  } catch (e) {
    if (e instanceof ApiError) {
      // Plan limits and caps, so the owner can see who is running into them.
      if (seeker && (e.status === 402 || (e.status === 429 && !/^I hunted/.test(e.message)) || (e.status === 503 && /capacity/.test(e.message)))) {
        await logActivity(seeker.id, "limit_hit", { status: e.status, message: e.message });
      }
      return Response.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return Response.json({ error: "Something went wrong on our side. Try again in a moment." }, { status: 500 });
  }
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "The request was not valid JSON.");
  }
}

/** Everything the workspace needs to draw itself. Never includes the user's key, only its last 4 characters. */
export async function stateFor(s: SeekerRecord) {
  const own = hasOwnKey(s);
  const trial = trialStatus(s);
  const house = houseKeyAvailable() && !trial.ended;
  return {
    brief: s.brief,
    cv: s.cvText ? { chars: s.cvText.length, preview: s.cvText.slice(0, 280) } : null,
    onboarded: isOnboarded(s),
    applications: s.applications,
    matches: s.matches,
    nudges: nudgesFor(s.applications),
    briefing: await latestBriefing(s.id),
    lastHuntAt: s.lastHuntAt,
    trial,
    /** Can Claude write for this user right now (subject to daily caps on fuzzyHR's key)? */
    ai: own || house,
    claude: {
      mode: own ? ("own" as const) : house ? ("house" as const) : ("none" as const),
      keyLast4: s.claudeKeyLast4,
      provider: s.aiProvider,
      model: own ? s.aiModel : null,
      canSaveKey: canStoreSecrets(),
      houseKeyAvailable: houseKeyAvailable(),
      usedToday: own ? null : await houseCallsToday(s.id),
      dailyLimit: own ? null : limits().perUser,
    },
  };
}

export type WorkspaceState = Awaited<ReturnType<typeof stateFor>>;

export async function stateResponse(s: SeekerRecord, extra: Record<string, unknown> = {}) {
  return Response.json({ ...extra, state: await stateFor(s) });
}
