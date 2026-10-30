import type { Provider } from "./ai";
import { logActivity } from "./activity";
import { db } from "./db";
import type { Briefing, Seeker } from "./hunt/run";
import type { BoardRef } from "./hunt/sources";
import { DEFAULT_AGENT, type AgentSettings, type Application, type Brief, type ScoredJob } from "./hunt/types";

/** Free week: 5 tailored applications. */
export const TRIAL_APPLICATION_LIMIT = 5;
/** Exact hours, not calendar days, so a daylight-saving change can't stretch the trial. */
const TRIAL_DAYS = 7;

/** A seeker as stored: the hunt's view plus account details. */
export type SeekerRecord = Seeker & {
  email: string | null;
  cvText: string | null;
  plan: "trial" | "personal" | "coach";
  trialEndsAt: string;
  createdAt: string;
  /** Their own Claude key, encrypted. Server-side only: never send this to the browser. */
  claudeKeyEnc: string | null;
  claudeKeyLast4: string | null;
  /** Which provider their own key belongs to, and the model chosen for it. */
  aiProvider: Provider | null;
  aiModel: string | null;
  /** Personal plan (Stripe). */
  subscription: {
    customerId: string | null;
    status: string | null;
    currency: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    /** Billing paused: no charges. Personal stays on until paidThrough. */
    paused: boolean;
    paidThrough: string | null;
    /** When Stripe resumes billing on its own; null means "until they resume". */
    resumeAt: string | null;
  };
  /** Hunting, reminders and Autopilot stopped (a break, or they got a job). */
  huntingPaused: boolean;
  /** Set when they told us they got a job. */
  gotJob: GotJob | null;
  /** The language they use fuzzyHR in, so the AI can write its reviews in it. */
  lang: "en" | "fr";
};

export type GotJob = { at: string; company: string | null; title: string | null; applicationId: string | null };

type Row = {
  user_id: string;
  email: string | null;
  brief: Brief | null;
  cv_text: string | null;
  applications: Application[];
  passed: string[];
  matches: ScoredJob[];
  extra_boards: BoardRef[];
  plan: SeekerRecord["plan"];
  trial_ends_at: Date;
  last_hunt_at: Date | null;
  created_at: Date;
  claude_key_enc: string | null;
  claude_key_last4: string | null;
  ai_provider: Provider | null;
  ai_model: string | null;
  agent: Partial<AgentSettings> | null;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  plan_currency: string | null;
  period_start: Date | null;
  period_end: Date | null;
  cancel_at_period_end: boolean | null;
  billing_paused: boolean | null;
  paid_through: Date | null;
  resume_at: Date | null;
  hunting_paused: boolean | null;
  got_job: GotJob | null;
  lang: string | null;
};

const EMPTY_BRIEF: Brief = { name: "", targetTitles: [], skills: [], locations: [], remoteOk: true, avoid: [] };

function toRecord(r: Row): SeekerRecord {
  return {
    id: r.user_id,
    email: r.email,
    brief: r.brief ?? EMPTY_BRIEF,
    cvText: r.cv_text,
    applications: r.applications ?? [],
    passed: r.passed ?? [],
    matches: r.matches ?? [],
    extraBoards: r.extra_boards ?? [],
    plan: r.plan,
    trialEndsAt: r.trial_ends_at.toISOString(),
    lastHuntAt: r.last_hunt_at ? r.last_hunt_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
    claudeKeyEnc: r.claude_key_enc,
    claudeKeyLast4: r.claude_key_last4,
    aiProvider: r.claude_key_enc ? (r.ai_provider ?? "anthropic") : null,
    aiModel: r.ai_model,
    agent: { ...DEFAULT_AGENT, ...(r.agent ?? {}) },
    subscription: {
      customerId: r.stripe_customer_id ?? null,
      status: r.subscription_status ?? null,
      currency: r.plan_currency ?? null,
      periodStart: r.period_start ? r.period_start.toISOString() : null,
      periodEnd: r.period_end ? r.period_end.toISOString() : null,
      cancelAtPeriodEnd: Boolean(r.cancel_at_period_end),
      paused: Boolean(r.billing_paused),
      paidThrough: r.paid_through ? r.paid_through.toISOString() : null,
      resumeAt: r.resume_at ? r.resume_at.toISOString() : null,
    },
    huntingPaused: Boolean(r.hunting_paused),
    gotJob: r.got_job ?? null,
    lang: r.lang === "fr" ? "fr" : "en",
  };
}

/** True when the seeker has told us enough to hunt for them. */
export function isOnboarded(s: SeekerRecord): boolean {
  return Boolean(s.cvText) && s.brief.targetTitles.length > 0;
}

/** With their own Claude key, fuzzyHR is free and unlimited for them. */
export function hasOwnKey(s: SeekerRecord): boolean {
  return Boolean(s.claudeKeyEnc);
}

/** On the Personal plan (paid, or in Stripe's grace period after a failed payment). */
export function isPersonal(s: SeekerRecord, now = new Date()): boolean {
  if (s.plan !== "personal") return false;
  if (!s.subscription.paused) return true;
  // Billing is paused: they keep what they've paid for, then Personal pauses too.
  return Boolean(s.subscription.paidThrough && now < new Date(s.subscription.paidThrough));
}

/** Tailored applications written in the current billing month (rewrites of one already written this month don't count again). */
export function personalUsed(s: SeekerRecord, now = new Date()): number {
  const start = s.subscription.periodStart ? new Date(s.subscription.periodStart).getTime() : now.getTime() - 30 * 86_400_000;
  return s.applications.filter((a) => a.tailored && new Date(a.tailored.createdAt).getTime() >= start).length;
}

/**
 * The seeker's plan and how much of it is used.
 * `appsPerMonth` is the Personal plan's monthly allowance (from Admin).
 */
export function trialStatus(s: SeekerRecord, now = new Date(), appsPerMonth = 15) {
  const used = s.applications.filter((a) => a.tailored).length;
  if (hasOwnKey(s)) return { plan: "own-key" as const, daysLeft: 0, ended: false, used, limit: null };
  if (isPersonal(s, now)) return { plan: "personal" as const, daysLeft: 0, ended: false, used: personalUsed(s, now), limit: appsPerMonth };
  if (s.plan === "personal") return { plan: "paused" as const, daysLeft: 0, ended: true, used, limit: 0 };
  // Allow a minute of clock drift between the database and the server, so a new trial reads 7 days, not 8.
  const daysLeft = Math.max(0, Math.ceil((new Date(s.trialEndsAt).getTime() - now.getTime() - 60_000) / 86_400_000));
  return {
    plan: s.plan as SeekerRecord["plan"] | "own-key",
    daysLeft,
    ended: s.plan === "trial" && daysLeft === 0,
    used,
    limit: s.plan === "trial" ? TRIAL_APPLICATION_LIMIT : null,
  };
}

export async function getSeeker(userId: string): Promise<SeekerRecord | null> {
  const sql = await db();
  const rows = await sql<Row[]>`select * from seekers where user_id = ${userId}`;
  return rows[0] ? toRecord(rows[0]) : null;
}

export async function getOrCreateSeeker(userId: string, email: () => Promise<string | null>): Promise<SeekerRecord> {
  const existing = await getSeeker(userId);
  if (existing) return existing;
  const sql = await db();
  const rows = await sql<Row[]>`
    insert into seekers (user_id, email, trial_ends_at, role)
    values (
      ${userId}, ${await email()}, ${new Date(Date.now() + TRIAL_DAYS * 86_400_000)},
      -- the very first account on a fresh site is its owner
      case when exists (select 1 from seekers) then 'user' else 'admin' end
    )
    on conflict (user_id) do update set updated_at = now()
    returning *, (xmax = 0) as inserted`;
  const record = toRecord(rows[0]);
  if ((rows[0] as Row & { inserted?: boolean }).inserted) await logActivity(userId, "signed_up", { email: record.email });
  return record;
}

type Patch = Partial<{
  brief: Brief;
  cvText: string;
  applications: Application[];
  passed: string[];
  matches: ScoredJob[];
  lastHuntAt: Date;
  extraBoards: BoardRef[];
  agent: AgentSettings;
  huntingPaused: boolean;
  gotJob: GotJob | null;
  lang: "en" | "fr";
  /** Encrypted key and its last 4 characters, or null to remove. */
  claudeKey: { enc: string; last4: string; provider: Provider; model: string } | null;
}>;

/** Update only the fields given. */
export async function updateSeeker(userId: string, p: Patch): Promise<SeekerRecord> {
  const sql = await db();
  const set: Record<string, unknown> = { updated_at: new Date() };
  if (p.brief) set.brief = sql.json(p.brief);
  if (p.cvText !== undefined) set.cv_text = p.cvText;
  if (p.applications) set.applications = sql.json(p.applications);
  if (p.passed) set.passed = sql.json(p.passed);
  if (p.matches) set.matches = sql.json(p.matches);
  if (p.lastHuntAt) set.last_hunt_at = p.lastHuntAt;
  if (p.extraBoards) set.extra_boards = sql.json(p.extraBoards);
  if (p.agent) set.agent = sql.json(p.agent);
  if (p.huntingPaused !== undefined) set.hunting_paused = p.huntingPaused;
  if (p.lang) set.lang = p.lang;
  if (p.gotJob !== undefined) set.got_job = p.gotJob ? sql.json(p.gotJob) : null;
  if (p.claudeKey !== undefined) {
    set.claude_key_enc = p.claudeKey?.enc ?? null;
    set.claude_key_last4 = p.claudeKey?.last4 ?? null;
    set.claude_key_added_at = p.claudeKey ? new Date() : null;
    set.ai_provider = p.claudeKey?.provider ?? null;
    set.ai_model = p.claudeKey?.model ?? null;
  }
  const rows = await sql<Row[]>`update seekers set ${sql(set)} where user_id = ${userId} returning *`;
  if (!rows[0]) throw new Error(`No seeker ${userId}`);
  return toRecord(rows[0]);
}

/**
 * Delete everything stored about a user: profile, CV, brief, applications,
 * documents, saved key, briefings, usage and activity. Not reversible.
 */
export async function deleteSeekerData(userId: string): Promise<void> {
  const sql = await db();
  await sql.begin(async (tx) => {
    await tx`delete from activity where user_id = ${userId}`;
    await tx`delete from claude_usage where user_id = ${userId}`;
    await tx`delete from briefings where user_id = ${userId}`;
    await tx`delete from seekers where user_id = ${userId}`;
  });
}

/** Everything stored about a user, minus their encrypted key, for "Download my data". */
export async function exportSeekerData(userId: string) {
  const sql = await db();
  const [seeker] = await sql`
    select user_id, email, plan, role, created_at, trial_ends_at, last_seen_at, last_hunt_at,
      brief, cv_text, applications, matches, passed, extra_boards, agent,
      case when claude_key_enc is not null then json_build_object('provider', coalesce(ai_provider, 'anthropic'), 'model', ai_model, 'endsWith', claude_key_last4, 'addedAt', claude_key_added_at) end as ai_key
    from seekers where user_id = ${userId}`;
  const briefings = await sql`select date, data, created_at from briefings where user_id = ${userId} order by date desc`;
  const usage = await sql`select day, source, calls, input_tokens, output_tokens from claude_usage where user_id = ${userId} order by day desc`;
  const activity = await sql`select at, type, detail from activity where user_id = ${userId} order by at desc`;
  return { exportedAt: new Date().toISOString(), account: seeker ?? null, briefings, aiUsage: usage, activity };
}

export async function saveBriefing(b: Briefing): Promise<void> {
  const sql = await db();
  await sql`
    insert into briefings (user_id, date, data) values (${b.seekerId}, ${b.date}, ${sql.json(b)})
    on conflict (user_id, date) do update set data = excluded.data, created_at = now()`;
}

export async function latestBriefing(userId: string): Promise<Briefing | null> {
  const sql = await db();
  const rows = await sql<{ data: Briefing }[]>`
    select data from briefings where user_id = ${userId} order by date desc limit 1`;
  return rows[0]?.data ?? null;
}

/** Seekers the daily hunt should run for: onboarded, and using their own key, paying, or still in their free week. */
export async function listActiveSeekers(): Promise<SeekerRecord[]> {
  const sql = await db();
  const rows = await sql<Row[]>`
    select * from seekers
    where cv_text is not null and brief is not null
      and not hunting_paused
      and (claude_key_enc is not null or plan <> 'trial' or trial_ends_at > now())`;
  return rows.map(toRecord).filter(isOnboarded);
}
