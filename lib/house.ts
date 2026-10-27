import "server-only";
import { checkKey, PROVIDER_NAME, providerOfKey, userLLM, type LLM, type Provider } from "./ai";
import { canStoreSecrets, decrypt, encrypt } from "./crypto";
import { db, hasDb } from "./db";

/**
 * fuzzyHR's own AI key, which pays for free-week users. The owner sets it in
 * the admin panel (stored encrypted in the database). ANTHROPIC_API_KEY in
 * Vercel still works as a fallback. The admin key wins when both are set.
 */

export type HouseKey = { provider: Provider; key: string; model: string; last4: string; source: "admin" | "vercel" };
type Stored = { enc: string; provider: Provider; model: string; last4: string; setAt: string; setBy: string };

const NAME = "house_ai_key";
const TTL_MS = 60_000;
let cache: { at: number; value: HouseKey | null } | null = null;

async function readStored(): Promise<Stored | null> {
  if (!hasDb()) return null;
  const sql = await db();
  const [row] = await sql<{ value: string }[]>`select value from app_settings where name = ${NAME}`;
  return row ? (JSON.parse(row.value) as Stored) : null;
}

/** The key in use, if any. Cached for a minute per server instance. */
export async function houseKey(): Promise<HouseKey | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  let value: HouseKey | null = null;
  try {
    const stored = await readStored();
    if (stored && canStoreSecrets()) {
      value = { provider: stored.provider, key: decrypt(stored.enc), model: stored.model, last4: stored.last4, source: "admin" };
    }
  } catch (e) {
    console.error("house key unreadable", (e as Error).message);
  }
  const env = process.env.ANTHROPIC_API_KEY;
  if (!value && env) value = { provider: "anthropic", key: env, model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", last4: env.slice(-4), source: "vercel" };
  cache = { at: Date.now(), value };
  return value;
}

export async function houseKeyAvailable(): Promise<boolean> {
  return (await houseKey()) !== null;
}

export async function houseLLM(): Promise<LLM> {
  const k = await houseKey();
  if (!k) throw new Error("fuzzyHR's AI key isn't set.");
  return userLLM(k.provider, k.key, k.model);
}

/** What the admin panel shows: never the key itself. */
export async function houseKeyInfo() {
  const stored = await readStored().catch(() => null);
  const active = await houseKey();
  return {
    active: active ? { provider: active.provider, last4: active.last4, model: active.model, source: active.source } : null,
    stored: stored ? { provider: stored.provider, last4: stored.last4, setAt: stored.setAt, setBy: stored.setBy } : null,
    /** Saved, but the server can no longer decrypt it (its encryption secret changed). */
    unreadable: Boolean(stored) && active?.source !== "admin",
    canSave: canStoreSecrets(),
    vercelKey: Boolean(process.env.ANTHROPIC_API_KEY),
  };
}

/** Check, encrypt and save the owner's key. Returns a message for the admin panel. */
export async function saveHouseKey(raw: string, by: string): Promise<{ ok: boolean; message: string }> {
  const apiKey = raw.trim();
  if (!canStoreSecrets()) return { ok: false, message: "The server has no encryption secret yet, so it can't store keys safely." };
  const provider = providerOfKey(apiKey);
  if (!provider) return { ok: false, message: "That doesn't look like an API key. Claude keys start with sk-ant-, OpenAI keys with sk-." };
  const who = PROVIDER_NAME[provider];
  const check = await checkKey(provider, apiKey);
  if (check.status === "refused") return { ok: false, message: `${who} didn't accept that key. Check you copied all of it, and that it hasn't been revoked.` };
  if (check.status === "no-model") return { ok: false, message: `That ${who} key works, but it can't use any of the models fuzzyHR writes with.` };
  if (check.status !== "ok") return { ok: false, message: `I couldn't reach ${who} to check the key. Try again in a minute.` };
  const stored: Stored = { enc: encrypt(apiKey), provider, model: check.model, last4: apiKey.slice(-4), setAt: new Date().toISOString(), setBy: by };
  const sql = await db();
  await sql`
    insert into app_settings (name, value, updated_by) values (${NAME}, ${JSON.stringify(stored)}, ${by})
    on conflict (name) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`;
  cache = null;
  return { ok: true, message: `Saved. Free AI writing is on, using your ${who} key ending in ${stored.last4}.` };
}

export async function removeHouseKey(): Promise<void> {
  const sql = await db();
  await sql`delete from app_settings where name = ${NAME}`;
  cache = null;
}
