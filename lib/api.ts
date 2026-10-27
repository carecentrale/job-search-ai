import "server-only";
import { aiEnabled } from "./ai";
import { currentCaller } from "./auth";
import { hasDb } from "./db";
import { nudgesFor } from "./hunt/followup";
import { getOrCreateSeeker, isOnboarded, latestBriefing, trialStatus, type SeekerRecord } from "./seekers";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Run a handler for the signed-in seeker, with consistent errors. */
export async function withSeeker(handler: (s: SeekerRecord) => Promise<Response>): Promise<Response> {
  try {
    if (!hasDb()) throw new ApiError(503, "Accounts are not switched on yet. Try the demo in the meantime.");
    const caller = await currentCaller();
    if (!caller) throw new ApiError(401, "Sign in to use your headhunter.");
    const seeker = await getOrCreateSeeker(caller.userId, caller.email);
    return await handler(seeker);
  } catch (e) {
    if (e instanceof ApiError) return Response.json({ error: e.message }, { status: e.status });
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

/** Everything the workspace needs to draw itself. */
export async function stateFor(s: SeekerRecord) {
  return {
    brief: s.brief,
    cv: s.cvText ? { chars: s.cvText.length, preview: s.cvText.slice(0, 280) } : null,
    onboarded: isOnboarded(s),
    applications: s.applications,
    matches: s.matches,
    nudges: nudgesFor(s.applications),
    briefing: await latestBriefing(s.id),
    lastHuntAt: s.lastHuntAt,
    trial: trialStatus(s),
    ai: aiEnabled(),
  };
}

export type WorkspaceState = Awaited<ReturnType<typeof stateFor>>;

export async function stateResponse(s: SeekerRecord, extra: Record<string, unknown> = {}) {
  return Response.json({ ...extra, state: await stateFor(s) });
}
