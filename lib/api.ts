import "server-only";
import { logActivity, logAiWanted, touchLastSeen } from "./activity";
import { houseKeyAvailable } from "./house";
import { fmtPrice, salesStatus } from "./billing";
import { currentCaller } from "./auth";
import { houseCallsToday, limits } from "./claude";
import { canStoreSecrets } from "./crypto";
import { db, hasDb } from "./db";
import { ApiError } from "./errors";
import { nudgesFor } from "./hunt/followup";
import { STARTER_BOARDS } from "./hunt/boards";
import { searchSitesOn } from "./hunt/search";
import { getOrCreateSeeker, hasOwnKey, isOnboarded, latestBriefing, trialStatus, type SeekerRecord } from "./seekers";

export { ApiError };

/** Run a handler for the signed-in seeker, with consistent errors. */
/** Which feature a request was for, from its path, for the owner's demand log. */
function featureOf(req?: Request): string {
  const path = req ? new URL(req.url).pathname : "";
  if (path.endsWith("/tailor")) return "writing";
  if (path.endsWith("/review")) return "review";
  if (path.endsWith("/jobs")) return "job link";
  if (path.endsWith("/agent")) return "autopilot";
  return "AI";
}

export async function withSeeker(handler: (s: SeekerRecord) => Promise<Response>, req?: Request): Promise<Response> {
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
      if (seeker && e.code === "house_off") {
        await logAiWanted(seeker.id, featureOf(req));
        return Response.json({ error: e.message, code: e.code }, { status: e.status });
      }
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
  const houseOn = await houseKeyAvailable();
  const sales = await salesStatus(houseOn);
  const trial = trialStatus(s, new Date(), sales.plan.appsPerMonth);
  const house = houseOn && !trial.ended;
  return {
    brief: s.brief,
    cv: s.cvText ? { chars: s.cvText.length, preview: s.cvText.slice(0, 280) } : null,
    onboarded: isOnboarded(s),
    applications: s.applications,
    matches: s.matches,
    nudges: nudgesFor(s.applications),
    briefing: await latestBriefing(s.id),
    lastHuntAt: s.lastHuntAt,
    agent: s.agent,
    /** Matches the AI hasn't reviewed yet; the workspace asks for a review when this is above 0. */
    unreviewed: s.matches.filter((m) => !m.review).length,
    /** Autopilot approvals still waiting for their CV and letter. */
    autopilotPending: s.applications.filter((a) => a.approvedBy === "autopilot" && !a.tailored && a.status === "preparing").map((a) => a.id),
    sources: { companies: STARTER_BOARDS.length, following: s.extraBoards, ...searchSitesOn() },
    trial,
    billing: {
      personal: s.plan === "personal",
      status: s.subscription.status,
      periodEnd: s.subscription.periodEnd,
      cancelAtPeriodEnd: s.subscription.cancelAtPeriodEnd,
      canManage: Boolean(s.subscription.customerId),
      /** The Personal plan, when it's on sale. */
      offer: sales.ready
        ? {
            cad: fmtPrice(sales.plan.priceCad, "cad"),
            usd: fmtPrice(sales.plan.priceUsd, "usd"),
            appsPerMonth: sales.plan.appsPerMonth,
            dailyRequests: sales.plan.dailyRequests,
            testMode: sales.mode === "test",
          }
        : null,
    },
    /** True when fuzzyHR's own AI key isn't set yet, so the workspace shows "coming soon" instead of the free week. */
    houseOff: !houseOn,
    /** They've already asked to be told when free AI writing is on. */
    aiRequested: !own && !houseOn ? await aiRequested(s.id) : false,
    /** Can Claude write for this user right now (subject to daily caps on fuzzyHR's key)? */
    ai: own || house,
    claude: {
      mode: own ? ("own" as const) : house ? ("house" as const) : ("none" as const),
      keyLast4: s.claudeKeyLast4,
      provider: s.aiProvider,
      model: own ? s.aiModel : null,
      canSaveKey: canStoreSecrets(),
      houseKeyAvailable: houseOn,
      usedToday: own ? null : await houseCallsToday(s.id),
      dailyLimit: own ? null : s.plan === "personal" ? sales.plan.dailyRequests : limits().perUser,
    },
  };
}

async function aiRequested(userId: string): Promise<boolean> {
  const sql = await db();
  const [row] = await sql`select 1 from activity where user_id = ${userId} and type = 'ai_wanted' limit 1`;
  return Boolean(row);
}

export type WorkspaceState = Awaited<ReturnType<typeof stateFor>>;

export async function stateResponse(s: SeekerRecord, extra: Record<string, unknown> = {}) {
  return Response.json({ ...extra, state: await stateFor(s) });
}
