import "server-only";
import { db } from "./db";

/**
 * An append-only log of what each user does, for the owner's admin pages.
 * Never put secrets here: no API keys, no passwords. Logging must never break
 * the action being logged, so failures are swallowed.
 */

export type ActivityType =
  | "signed_up"
  | "cv_uploaded"
  | "brief_saved"
  | "hunt"
  | "job_passed"
  | "application_created"
  | "status_changed"
  | "followed_up"
  | "application_note"
  | "documents_written"
  | "write_failed"
  | "key_added"
  | "key_rejected"
  | "key_removed"
  | "limit_hit"
  | "role_changed"
  | "ai_review"
  | "autopilot_approved"
  | "autopilot_changed"
  | "company_added"
  | "company_removed"
  | "job_link_added"
  | "data_exported"
  | "account_deleted"
  | "page_view"
  | "ai_wanted"
  | "tester_changed"
  | "fresh_free_week"
  | "house_key_changed"
  | "checkout_started"
  | "plan_started"
  | "plan_changed"
  | "plan_ended"
  | "payment_failed"
  | "billing_settings";

export async function logActivity(userId: string, type: ActivityType, detail: Record<string, unknown> = {}): Promise<void> {
  try {
    const sql = await db();
    await sql`insert into activity (user_id, type, detail) values (${userId}, ${type}, ${sql.json(detail as never)})`;
  } catch (e) {
    console.error("activity log failed", type, (e as Error).message);
  }
}

/** Workspace screens whose views are logged. */
export const VIEWS = ["today", "shortlist", "tracker", "brief", "plan", "document"] as const;

/**
 * Log that a user opened a screen. Repeat views of the same screen within
 * 2 minutes are skipped, so flicking between tabs doesn't flood the log.
 */
export async function logPageView(userId: string, view: string, detail: Record<string, unknown> = {}): Promise<void> {
  try {
    const sql = await db();
    await sql`
      insert into activity (user_id, type, detail)
      select ${userId}, 'page_view', ${sql.json({ view, ...detail } as never)}
      where not exists (
        select 1 from activity
        where user_id = ${userId} and type = 'page_view' and detail ->> 'view' = ${view}
          and at > now() - interval '2 minutes'
      )`;
  } catch (e) {
    console.error("page view log failed", (e as Error).message);
  }
}

/**
 * Someone tried an AI feature before fuzzyHR's own key was set up (or asked to
 * be told when it is). Logged at most once a day per person, so the owner sees
 * real demand rather than repeat clicks.
 */
export async function logAiWanted(userId: string, feature: string): Promise<void> {
  try {
    const sql = await db();
    await sql`
      insert into activity (user_id, type, detail)
      select ${userId}, 'ai_wanted', ${sql.json({ feature } as never)}
      where not exists (
        select 1 from activity where user_id = ${userId} and type = 'ai_wanted' and at > now() - interval '1 day'
      )`;
  } catch (e) {
    console.error("ai_wanted log failed", (e as Error).message);
  }
}

export async function touchLastSeen(userId: string): Promise<void> {
  try {
    const sql = await db();
    await sql`update seekers set last_seen_at = now() where user_id = ${userId} and (last_seen_at is null or last_seen_at < now() - interval '5 minutes')`;
  } catch {
    // not worth failing a page load over
  }
}
