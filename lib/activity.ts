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
  | "role_changed";

export async function logActivity(userId: string, type: ActivityType, detail: Record<string, unknown> = {}): Promise<void> {
  try {
    const sql = await db();
    await sql`insert into activity (user_id, type, detail) values (${userId}, ${type}, ${sql.json(detail as never)})`;
  } catch (e) {
    console.error("activity log failed", type, (e as Error).message);
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
