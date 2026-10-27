import "server-only";
import { notFound } from "next/navigation";
import { currentCaller } from "./auth";
import { limits, usageDay } from "./claude";
import { db, hasDb } from "./db";
import type { Briefing } from "./hunt/run";
import type { Application, Brief } from "./hunt/types";

/**
 * Owner-only admin. Admins are users whose role is 'admin' in the database.
 * The first account ever created becomes admin automatically (see lib/db.ts),
 * and admins can promote or demote others from the admin user page.
 * As a fallback, ADMIN_EMAILS / ADMIN_USER_IDS in Vercel also grant access.
 * Everyone else gets a 404, so the admin area doesn't reveal that it exists.
 */

const list = (v: string | undefined) => (v ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);

export async function adminCaller(): Promise<{ userId: string; email: string | null } | null> {
  if (!hasDb()) return null;
  const caller = await currentCaller();
  if (!caller) return null;
  const sql = await db();
  const [row] = await sql<{ role: string; email: string | null }[]>`select role, email from seekers where user_id = ${caller.userId}`;
  if (row?.role === "admin") return { userId: caller.userId, email: row.email };
  const ids = list(process.env.ADMIN_USER_IDS);
  if (ids.includes(caller.userId.toLowerCase())) return { userId: caller.userId, email: null };
  const emails = list(process.env.ADMIN_EMAILS);
  if (!emails.length) return null;
  const email = (await caller.email())?.toLowerCase() ?? null;
  return email && emails.includes(email) ? { userId: caller.userId, email } : null;
}

/** For admin pages: the admin, or a 404. */
export async function requireAdmin() {
  const admin = await adminCaller();
  if (!admin) notFound();
  return admin;
}

/* ---------- Queries ---------- */

export type UserRow = {
  user_id: string;
  email: string | null;
  created_at: Date;
  last_seen_at: Date | null;
  plan: string;
  role: string;
  tester: boolean;
  trial_ends_at: Date;
  key_provider: string | null;
  roles: string[];
  has_cv: boolean;
  matches: number;
  applications: number;
  written: number;
  house_calls_today: number;
  house_tokens_total: number;
  own_calls_total: number;
  last_activity_at: Date | null;
  last_activity: string | null;
};

export async function listUsers(q = ""): Promise<UserRow[]> {
  const sql = await db();
  const like = `%${q.trim().toLowerCase()}%`;
  const today = usageDay();
  return sql<UserRow[]>`
    select
      s.user_id, s.email, s.created_at, s.last_seen_at, s.plan, s.role, s.tester, s.trial_ends_at,
      case when s.claude_key_enc is not null then coalesce(s.ai_provider, 'anthropic') end as key_provider,
      coalesce((select array_agg(x) from jsonb_array_elements_text(s.brief -> 'targetTitles') x), '{}') as roles,
      s.cv_text is not null as has_cv,
      jsonb_array_length(s.matches)::int as matches,
      jsonb_array_length(s.applications)::int as applications,
      (select count(*) from jsonb_array_elements(s.applications) a where a ? 'tailored')::int as written,
      coalesce((select sum(calls) from claude_usage u where u.user_id = s.user_id and u.source = 'house' and u.day = ${today}), 0)::int as house_calls_today,
      coalesce((select sum(input_tokens + output_tokens) from claude_usage u where u.user_id = s.user_id and u.source = 'house'), 0)::bigint as house_tokens_total,
      coalesce((select sum(calls) from claude_usage u where u.user_id = s.user_id and u.source = 'own'), 0)::int as own_calls_total,
      la.at as last_activity_at, la.type as last_activity
    from seekers s
    left join lateral (select at, type from activity a where a.user_id = s.user_id and a.type <> 'page_view' order by at desc limit 1) la on true
    where ${q.trim() === ""} or lower(coalesce(s.email, '')) like ${like} or lower(s.user_id) like ${like}
    order by coalesce(s.last_seen_at, s.created_at) desc
    limit 500`;
}

export async function overview() {
  const sql = await db();
  const today = usageDay();
  const monthStart = `${today.slice(0, 7)}-01`;
  const [users] = await sql<
    {
      total: number;
      new_7d: number;
      active_7d: number;
      onboarded: number;
      own_anthropic: number;
      own_openai: number;
      in_trial: number;
      trial_ended: number;
      applications: number;
      written: number;
    }[]
  >`
    select
      count(*)::int as total,
      count(*) filter (where created_at > now() - interval '7 days')::int as new_7d,
      count(*) filter (where last_seen_at > now() - interval '7 days')::int as active_7d,
      count(*) filter (where cv_text is not null and jsonb_array_length(coalesce(brief -> 'targetTitles', '[]'::jsonb)) > 0)::int as onboarded,
      count(*) filter (where claude_key_enc is not null and coalesce(ai_provider, 'anthropic') = 'anthropic')::int as own_anthropic,
      count(*) filter (where claude_key_enc is not null and ai_provider = 'openai')::int as own_openai,
      count(*) filter (where claude_key_enc is null and plan = 'trial' and trial_ends_at > now())::int as in_trial,
      count(*) filter (where claude_key_enc is null and plan = 'trial' and trial_ends_at <= now())::int as trial_ended,
      coalesce(sum(jsonb_array_length(applications)), 0)::int as applications,
      coalesce(sum((select count(*) from jsonb_array_elements(applications) a where a ? 'tailored')), 0)::int as written
    from seekers`;
  const [usage] = await sql<
    { house_calls_today: number; house_tokens_today: number; house_calls_month: number; house_in_month: number; house_out_month: number; own_calls_month: number }[]
  >`
    select
      coalesce(sum(calls) filter (where source = 'house' and day = ${today}), 0)::int as house_calls_today,
      coalesce(sum(input_tokens + output_tokens) filter (where source = 'house' and day = ${today}), 0)::bigint as house_tokens_today,
      coalesce(sum(calls) filter (where source = 'house' and day >= ${monthStart}), 0)::int as house_calls_month,
      coalesce(sum(input_tokens) filter (where source = 'house' and day >= ${monthStart}), 0)::bigint as house_in_month,
      coalesce(sum(output_tokens) filter (where source = 'house' and day >= ${monthStart}), 0)::bigint as house_out_month,
      coalesce(sum(calls) filter (where source = 'own' and day >= ${monthStart}), 0)::int as own_calls_month
    from claude_usage`;
  const daily = await sql<{ day: string; house: number; own: number }[]>`
    select to_char(day, 'YYYY-MM-DD') as day,
      coalesce(sum(calls) filter (where source = 'house'), 0)::int as house,
      coalesce(sum(calls) filter (where source = 'own'), 0)::int as own
    from claude_usage where day > (${today}::date - 14)
    group by day order by day`;
  return { users, usage, daily, limits: limits() };
}

export type ActivityRow = { id: number; user_id: string; email: string | null; at: Date; type: string; detail: Record<string, unknown> };

export async function recentActivity(opts: { userId?: string; type?: string; limit?: number; hidePageViews?: boolean } = {}): Promise<ActivityRow[]> {
  const sql = await db();
  const limit = Math.min(opts.limit ?? 200, 1000);
  return sql<ActivityRow[]>`
    select a.id::int as id, a.user_id, s.email, a.at, a.type, a.detail
    from activity a left join seekers s on s.user_id = a.user_id
    where (${!opts.userId} or a.user_id = ${opts.userId ?? ""})
      and (${!opts.type} or a.type = ${opts.type ?? ""})
      and (${!opts.hidePageViews} or a.type <> 'page_view')
    order by a.at desc
    limit ${limit}`;
}

export type UserDetail = {
  user_id: string;
  email: string | null;
  created_at: Date;
  last_seen_at: Date | null;
  plan: string;
  role: string;
  trial_ends_at: Date;
  key_provider: string | null;
  key_model: string | null;
  key_last4: string | null;
  key_added_at: Date | null;
  tester: boolean;
  brief: Brief | null;
  cv_text: string | null;
  applications: Application[];
  passed: number;
  matches: number;
  last_hunt_at: Date | null;
};

export async function userDetail(userId: string) {
  const sql = await db();
  const [u] = await sql<UserDetail[]>`
    select user_id, email, created_at, last_seen_at, plan, role, trial_ends_at,
      case when claude_key_enc is not null then coalesce(ai_provider, 'anthropic') end as key_provider,
      ai_model as key_model, claude_key_last4 as key_last4, claude_key_added_at as key_added_at, tester,
      brief, cv_text, applications, jsonb_array_length(passed)::int as passed, jsonb_array_length(matches)::int as matches, last_hunt_at
    from seekers where user_id = ${userId}`;
  if (!u) return null;
  const usage = await sql<{ day: string; source: string; calls: number; input_tokens: number; output_tokens: number }[]>`
    select to_char(day, 'YYYY-MM-DD') as day, source, calls, input_tokens::bigint as input_tokens, output_tokens::bigint as output_tokens
    from claude_usage where user_id = ${userId} order by day desc, source limit 60`;
  const briefings = await sql<{ date: string; data: Briefing }[]>`
    select to_char(date, 'YYYY-MM-DD') as date, data from briefings where user_id = ${userId} order by date desc limit 14`;
  return { user: u, usage, briefings, activity: await recentActivity({ userId, limit: 300 }) };
}

export type WaitingRow = { user_id: string; email: string | null; created_at: Date; first_wanted: Date; last_wanted: Date; features: string[] };

/**
 * Real users (not admins, not testers, no key of their own) who tried an AI
 * feature, or asked to be told, while fuzzyHR's own key wasn't set up.
 * Once the key is on, `since` limits this to people still waiting for a fresh free week.
 */
export async function aiWaiting(): Promise<WaitingRow[]> {
  const sql = await db();
  return sql<WaitingRow[]>`
    select s.user_id, s.email, s.created_at, min(a.at) as first_wanted, max(a.at) as last_wanted,
      array_agg(distinct a.detail ->> 'feature') as features
    from activity a join seekers s on s.user_id = a.user_id
    where a.type = 'ai_wanted' and s.role <> 'admin' and not s.tester and s.claude_key_enc is null
      and not exists (select 1 from activity f where f.user_id = s.user_id and f.type = 'fresh_free_week' and f.at > a.at)
    group by s.user_id, s.email, s.created_at
    order by min(a.at)`;
}

/** Restart the free week (7 days, 168 hours) for these users. */
export async function freshFreeWeek(userIds: string[]): Promise<number> {
  if (!userIds.length) return 0;
  const sql = await db();
  const rows = await sql`
    update seekers set trial_ends_at = now() + interval '168 hours', plan = 'trial', updated_at = now()
    where user_id in ${sql(userIds)} and claude_key_enc is null
    returning user_id`;
  return rows.length;
}

export async function setTester(userId: string, tester: boolean): Promise<void> {
  const sql = await db();
  await sql`update seekers set tester = ${tester}, updated_at = now() where user_id = ${userId}`;
}

export type SubscriberRow = { user_id: string; email: string | null; subscription_status: string | null; plan_currency: string | null; period_end: Date | null; cancel_at_period_end: boolean; plan: string };

/** Everyone who has or had a Personal subscription. */
export async function subscribers(): Promise<SubscriberRow[]> {
  const sql = await db();
  return sql<SubscriberRow[]>`
    select user_id, email, subscription_status, plan_currency, period_end, cancel_at_period_end, plan
    from seekers where stripe_subscription_id is not null
    order by (plan = 'personal') desc, period_end desc nulls last
    limit 500`;
}

export async function setRole(userId: string, role: "admin" | "user"): Promise<void> {
  const sql = await db();
  await sql`update seekers set role = ${role}, updated_at = now() where user_id = ${userId}`;
}
