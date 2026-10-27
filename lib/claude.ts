import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { clientFor, houseClient, houseKeyAvailable, type ClaudeUse } from "./ai";
import { ApiError } from "./errors";
import { canStoreSecrets, decrypt } from "./crypto";
import { db } from "./db";
import { hasOwnKey, trialStatus, type SeekerRecord } from "./seekers";

/**
 * Who pays for a Claude call, and whether it's allowed.
 *
 * - Own key: the user added their Claude API key. Free and unlimited; they pay Anthropic directly.
 * - House key: fuzzyHR's ANTHROPIC_API_KEY, for the free week only, with two daily caps:
 *     HOUSE_DAILY_LIMIT_PER_USER  Claude calls per user per day (default 10)
 *     HOUSE_DAILY_LIMIT_TOTAL     Claude calls across all users per day (default 200)
 *   Days run midnight to midnight, Eastern time.
 */

export type Source = "own" | "house";
export type Claude = { source: Source; client: Anthropic };

const num = (v: string | undefined, d: number) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : d;
};
export const limits = () => ({
  perUser: num(process.env.HOUSE_DAILY_LIMIT_PER_USER, 10),
  total: num(process.env.HOUSE_DAILY_LIMIT_TOTAL, 200),
});

/** Today's date in Toronto, so limits reset at local midnight. */
export function usageDay(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export async function houseCallsToday(userId?: string): Promise<number> {
  const sql = await db();
  const day = usageDay();
  const rows = userId
    ? await sql<{ n: number }[]>`select coalesce(sum(calls), 0)::int as n from claude_usage where day = ${day} and source = 'house' and user_id = ${userId}`
    : await sql<{ n: number }[]>`select coalesce(sum(calls), 0)::int as n from claude_usage where day = ${day} and source = 'house'`;
  return rows[0]?.n ?? 0;
}

/** Pick the key for this user's next call, or explain why there isn't one. Does not count the call. */
export function chooseClaude(s: SeekerRecord): Claude {
  if (hasOwnKey(s)) {
    if (!canStoreSecrets()) throw new ApiError(503, "Saved Claude keys are switched off on the server right now. Try again later.");
    try {
      return { source: "own", client: clientFor(decrypt(s.claudeKeyEnc!)) };
    } catch {
      throw new ApiError(409, "I couldn't read your saved Claude key. Add it again under Plan.");
    }
  }
  if (!houseKeyAvailable()) throw new ApiError(402, "Add your Claude API key under Plan to switch on writing. With your own key, fuzzyHR is free.");
  if (trialStatus(s).ended) {
    throw new ApiError(402, "Your free week has ended. Add your own Claude key under Plan to keep using fuzzyHR for free.");
  }
  return { source: "house", client: houseClient() };
}

/**
 * Reserve one house call before making it, atomically, so two quick clicks
 * can't both slip past the cap. Own-key calls are not limited.
 */
export async function reserveCall(s: SeekerRecord, c: Claude): Promise<void> {
  if (c.source !== "house") return;
  const { perUser, total } = limits();
  if ((await houseCallsToday()) >= total) {
    throw new ApiError(503, "fuzzyHR's free writing is at capacity for today. Add your own Claude key under Plan to keep going, or try again tomorrow.");
  }
  const sql = await db();
  const rows = await sql`
    insert into claude_usage (user_id, day, source, calls) values (${s.id}, ${usageDay()}, 'house', 1)
    on conflict (user_id, day, source) do update set calls = claude_usage.calls + 1
      where claude_usage.calls < ${perUser}
    returning calls`;
  if (rows.length === 0 || perUser === 0) {
    throw new ApiError(429, `You've used today's ${perUser} free writing requests. They reset at midnight Eastern, or add your own Claude key under Plan for no limits.`);
  }
}

/** Add the tokens a call used (and count own-key calls, for the user's own reference). */
export async function recordUse(s: SeekerRecord, c: Claude, use: ClaudeUse): Promise<void> {
  const sql = await db();
  const day = usageDay();
  if (c.source === "house") {
    await sql`
      update claude_usage set input_tokens = input_tokens + ${use.inputTokens}, output_tokens = output_tokens + ${use.outputTokens}
      where user_id = ${s.id} and day = ${day} and source = 'house'`;
  } else {
    await sql`
      insert into claude_usage (user_id, day, source, calls, input_tokens, output_tokens)
      values (${s.id}, ${day}, 'own', 1, ${use.inputTokens}, ${use.outputTokens})
      on conflict (user_id, day, source) do update set
        calls = claude_usage.calls + 1,
        input_tokens = claude_usage.input_tokens + excluded.input_tokens,
        output_tokens = claude_usage.output_tokens + excluded.output_tokens`;
  }
}

/** Turn an Anthropic error into a message the user can act on. */
export function claudeError(e: unknown, c: Claude): ApiError {
  const status = (e as { status?: number }).status;
  const msg = String((e as { message?: string }).message ?? "");
  if (c.source === "own") {
    if (status === 401 || status === 403) return new ApiError(422, "Anthropic refused your Claude key. Check or replace it under Plan.");
    if (/credit balance/i.test(msg)) return new ApiError(402, "Your Anthropic account is out of credit. Top it up at console.anthropic.com, then try again.");
    if (status === 429) return new ApiError(429, "Your Anthropic account hit its rate limit. Wait a minute and try again.");
  }
  if (status === 529 || status === 503) return new ApiError(503, "Claude is busy right now. Try again in a minute.");
  return new ApiError(502, "Claude couldn't finish this one. Try again in a minute.");
}
