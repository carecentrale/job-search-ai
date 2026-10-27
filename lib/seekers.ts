import type { Provider } from "./ai";
import { db } from "./db";
import type { Briefing, Seeker } from "./hunt/run";
import type { BoardRef } from "./hunt/sources";
import type { Application, Brief, ScoredJob } from "./hunt/types";

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
};

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

export function trialStatus(s: SeekerRecord, now = new Date()) {
  const used = s.applications.filter((a) => a.tailored).length;
  if (hasOwnKey(s)) return { plan: "own-key" as const, daysLeft: 0, ended: false, used, limit: null };
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
    insert into seekers (user_id, email, trial_ends_at)
    values (${userId}, ${await email()}, ${new Date(Date.now() + TRIAL_DAYS * 86_400_000)})
    on conflict (user_id) do update set updated_at = now()
    returning *`;
  return toRecord(rows[0]);
}

type Patch = Partial<{
  brief: Brief;
  cvText: string;
  applications: Application[];
  passed: string[];
  matches: ScoredJob[];
  lastHuntAt: Date;
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
      and (claude_key_enc is not null or plan <> 'trial' or trial_ends_at > now())`;
  return rows.map(toRecord).filter(isOnboarded);
}
