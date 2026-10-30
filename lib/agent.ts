import "server-only";
import { logActivity } from "./activity";
import { REVIEW_BATCH, reviewMatches, tailorApplication } from "./ai";
import { chooseClaude, claudeError, recordUse, reserveCall, usageDay } from "./claude";
import { ApiError } from "./errors";
import { rankMatches } from "./hunt/run";
import type { Application } from "./hunt/types";
import { planSettings } from "./billing";
import { getSeeker, isPersonal, trialStatus, updateSeeker, type SeekerRecord } from "./seekers";

/**
 * The headhunter acting on its own: the AI reviews the keyword shortlist, and,
 * if the seeker switched on Autopilot, approves strong recommendations and
 * writes their CV and cover letter. It never submits an application; sending is
 * always the seeker's call.
 */

/** On fuzzyHR's key only; with their own key, users can rewrite as often as they like. */
export const MAX_WRITES_PER_APPLICATION = 3;

/** Roles on the shortlist the AI hasn't looked at yet, best keyword fit first. */
export function unreviewed(s: SeekerRecord) {
  return s.matches.filter((m) => !m.review);
}

/**
 * Review up to REVIEW_BATCH unreviewed matches in one AI call.
 * Throws ApiError when there's no key or a cap is hit, so callers decide whether to show it.
 */
export async function reviewPending(s: SeekerRecord, trigger: "auto" | "manual" | "daily"): Promise<{ seeker: SeekerRecord; reviewed: number }> {
  const todo = unreviewed(s).slice(0, REVIEW_BATCH);
  if (!todo.length || !s.cvText) return { seeker: s, reviewed: 0 };
  const claude = await chooseClaude(s);
  await reserveCall(s, claude);
  let out;
  try {
    out = await reviewMatches(claude.llm, s.cvText, s.brief, todo, s.lang);
  } catch (e) {
    console.error("review failed", (e as { status?: number }).status, (e as Error).message);
    throw claudeError(e, claude);
  }
  await recordUse(s, claude, out.use);
  // Re-read so a pass or approval made while the AI was thinking isn't undone.
  const fresh = (await getSeeker(s.id)) ?? s;
  const matches = rankMatches(fresh.matches.map((m) => (out.data.has(m.id) ? { ...m, review: out.data.get(m.id) } : m)));
  const saved = await updateSeeker(s.id, { matches });
  const verdicts = [...out.data.values()];
  await logActivity(s.id, "ai_review", {
    trigger,
    reviewed: verdicts.length,
    recommend: verdicts.filter((v) => v.verdict === "recommend").length,
    maybe: verdicts.filter((v) => v.verdict === "maybe").length,
    skip: verdicts.filter((v) => v.verdict === "skip").length,
    provider: claude.llm.provider,
    keySource: claude.source,
    inputTokens: out.use.inputTokens,
    outputTokens: out.use.outputTokens,
  });
  return { seeker: saved, reviewed: verdicts.length };
}

/** Autopilot approvals made today (Toronto time), for the daily limit. */
function autopilotToday(s: SeekerRecord): number {
  const today = usageDay();
  return s.applications.filter((a) => a.approvedBy === "autopilot" && usageDay(new Date(a.createdAt)) === today).length;
}

/**
 * Autopilot's yes: move strong AI recommendations into the tracker, up to the
 * daily limit. Writing the documents is separate (writeDocuments), so it can be
 * spread across requests.
 */
export async function autopilotApprove(s: SeekerRecord): Promise<{ seeker: SeekerRecord; approved: Application[] }> {
  if (!s.agent.autopilot || s.huntingPaused) return { seeker: s, approved: [] };
  const room = Math.max(0, s.agent.perDay - autopilotToday(s));
  const picks = s.matches
    .filter((m) => m.review?.verdict === "recommend" && m.review.fit >= s.agent.minFit)
    .slice(0, room);
  if (!picks.length) return { seeker: s, approved: [] };
  const now = new Date().toISOString();
  const approved: Application[] = picks.map((job) => ({ id: `a-${job.id}`, job, status: "preparing", createdAt: now, approvedBy: "autopilot" }));
  const ids = new Set(picks.map((p) => p.id));
  const saved = await updateSeeker(s.id, {
    applications: [...approved, ...s.applications.filter((a) => !approved.some((n) => n.id === a.id))],
    matches: s.matches.filter((m) => !ids.has(m.id)),
  });
  for (const a of approved) {
    await logActivity(s.id, "autopilot_approved", { company: a.job.company, title: a.job.title, aiFit: a.job.review?.fit, keywordFit: a.job.fit, url: a.job.url });
  }
  return { seeker: saved, approved };
}

/** Applications Autopilot approved that still need their documents. */
export function autopilotUnwritten(s: SeekerRecord): Application[] {
  return s.applications.filter((a) => a.approvedBy === "autopilot" && !a.tailored && a.status === "preparing");
}

/** Write (or rewrite) the CV and cover letter for one application, within the seeker's plan. */
export async function writeDocuments(s: SeekerRecord, appId: string, by: "you" | "autopilot" = "you"): Promise<SeekerRecord> {
  const app = s.applications.find((a) => a.id === appId);
  if (!app) throw new ApiError(404, "That application isn't in your tracker.");
  if (!s.cvText) throw new ApiError(409, "Add your CV first, under Your brief.");

  const claude = await chooseClaude(s);
  if (claude.source === "house" && isPersonal(s)) {
    const { appsPerMonth } = await planSettings();
    const usage = trialStatus(s, new Date(), appsPerMonth);
    const writtenThisPeriod = app.tailored && s.subscription.periodStart && new Date(app.tailored.createdAt) >= new Date(s.subscription.periodStart);
    if (!writtenThisPeriod && usage.limit !== null && usage.used >= usage.limit) {
      const reset = s.subscription.periodEnd ? new Date(s.subscription.periodEnd).toLocaleDateString(s.lang === "fr" ? "fr-CA" : "en-CA", { month: "long", day: "numeric" }) : s.lang === "fr" ? "votre prochaine date de facturation" : "your next billing date";
      throw new ApiError(402, `You've used your ${usage.limit} tailored applications this month. They reset on ${reset}. Rewrites of this month's applications are still free.`);
    }
  } else if (claude.source === "house") {
    const trial = trialStatus(s);
    if (!app.tailored && trial.limit !== null && trial.used >= trial.limit) {
      throw new ApiError(402, `You've used all ${trial.limit} tailored applications in your free week. Add your own Claude or OpenAI key under Plan to keep going for free.`);
    }
    if ((app.writes ?? 0) >= MAX_WRITES_PER_APPLICATION) {
      throw new ApiError(429, `I've written this one ${MAX_WRITES_PER_APPLICATION} times, the free-week limit. Add your own Claude or OpenAI key under Plan to rewrite it again.`);
    }
  }
  await reserveCall(s, claude);

  let out;
  try {
    out = await tailorApplication(claude.llm, s.cvText, s.brief, app.job);
  } catch (e) {
    console.error("tailor failed", (e as { status?: number }).status, (e as Error).message);
    const err = claudeError(e, claude);
    await logActivity(s.id, "write_failed", {
      company: app.job.company,
      provider: claude.llm.provider,
      keySource: claude.source,
      by,
      status: (e as { status?: number }).status ?? null,
      message: err.message,
    });
    throw err;
  }
  await recordUse(s, claude, out.use);

  const fresh = (await getSeeker(s.id)) ?? s;
  const saved = await updateSeeker(s.id, {
    applications: fresh.applications.map((a) => (a.id === appId ? { ...a, tailored: out.data, writes: (a.writes ?? 0) + 1 } : a)),
  });
  await logActivity(s.id, "documents_written", {
    company: app.job.company,
    title: app.job.title,
    provider: claude.llm.provider,
    model: claude.llm.model,
    keySource: claude.source,
    by,
    write: (app.writes ?? 0) + 1,
    inputTokens: out.use.inputTokens,
    outputTokens: out.use.outputTokens,
    gaps: out.data.gaps.length,
  });
  return saved;
}

/**
 * Everything the agent does after a hunt, within a time budget: review new
 * matches, then (Autopilot only) approve and write. Stops quietly at the first
 * plan limit or AI error; the seeker sees the outcome in their workspace.
 */
export async function agentPass(
  s: SeekerRecord,
  opts: { trigger: "daily" | "manual"; deadline: number; write: boolean },
): Promise<{ seeker: SeekerRecord; reviewed: number; approved: number; written: number; stopped?: string }> {
  let seeker = s;
  let reviewed = 0;
  let approved = 0;
  let written = 0;
  try {
    const r = await reviewPending(seeker, opts.trigger);
    seeker = r.seeker;
    reviewed = r.reviewed;
    const a = await autopilotApprove(seeker);
    seeker = a.seeker;
    approved = a.approved.length;
    if (opts.write) {
      for (const app of autopilotUnwritten(seeker)) {
        // A write takes up to a minute or so; don't start one we can't finish.
        if (Date.now() > opts.deadline - 90_000) break;
        seeker = await writeDocuments(seeker, app.id, "autopilot");
        written++;
      }
    }
    return { seeker, reviewed, approved, written };
  } catch (e) {
    return { seeker, reviewed, approved, written, stopped: e instanceof ApiError ? e.message : (e as Error).message };
  }
}
