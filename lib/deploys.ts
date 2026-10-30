import "server-only";
import { canStoreSecrets, decrypt, encrypt } from "./crypto";
import { db, hasDb } from "./db";

/**
 * Releases and rollback, through Vercel's API.
 *
 * The owner pastes a Vercel access token in Admin → Versions (stored encrypted).
 * Then the admin can:
 *  - roll back: put the previous production deployment live again (Vercel's
 *    Instant Rollback; on the Hobby plan, only the one just before the current one);
 *  - go live with latest: undo a rollback. After a rollback, Vercel stops putting
 *    new pushes live automatically until a deployment is promoted.
 * Older versions are restored from their git tag instead (see VERSIONING.md).
 */

const NAME = "vercel_token";
const API = () => (!process.env.VERCEL && process.env.VERCEL_API_BASE) || "https://api.vercel.com";
/** fuzzyhr on Vercel (team FuzzyHR). Overridable if the project moves. */
export const PROJECT_ID = process.env.FUZZY_VERCEL_PROJECT_ID || "prj_xCg2GK9NkJI4YlRfNN6N4m8PLSCQ";
export const TEAM_ID = process.env.FUZZY_VERCEL_TEAM_ID || "team_nwtlUjf0r36svOy434IMUrcF";

type Stored = { enc: string; last4: string; setAt: string; setBy: string };

async function stored(): Promise<Stored | null> {
  if (!hasDb()) return null;
  const sql = await db();
  const [row] = await sql<{ value: string }[]>`select value from app_settings where name = ${NAME}`;
  return row ? (JSON.parse(row.value) as Stored) : null;
}

async function token(): Promise<string | null> {
  const s = await stored().catch(() => null);
  if (!s || !canStoreSecrets()) return null;
  try {
    return decrypt(s.enc);
  } catch {
    return null;
  }
}

async function vercel<T>(path: string, init: RequestInit = {}, tok?: string): Promise<T> {
  const t = tok ?? (await token());
  if (!t) throw new Error("Vercel isn't connected.");
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API()}${path}${sep}teamId=${TEAM_ID}`, {
    ...init,
    headers: { authorization: `Bearer ${t}`, "content-type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const body = await res.text();
  if (!res.ok) {
    let msg = body.slice(0, 300);
    try {
      msg = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? msg;
    } catch {
      /* not JSON */
    }
    const err = new Error(msg) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return (body ? JSON.parse(body) : {}) as T;
}

export async function vercelInfo() {
  const s = await stored().catch(() => null);
  return { connected: s ? { last4: s.last4, setAt: s.setAt, setBy: s.setBy } : null, canSave: canStoreSecrets() };
}

/** Check a pasted token can see the project, then save it encrypted. */
export async function saveVercelToken(raw: string, by: string): Promise<{ ok: boolean; message: string }> {
  const tok = raw.trim();
  if (!canStoreSecrets()) return { ok: false, message: "The server has no encryption secret yet, so it can't store keys safely." };
  if (tok.length < 20 || /\s/.test(tok)) return { ok: false, message: "That doesn't look like a Vercel access token." };
  try {
    await vercel(`/v9/projects/${PROJECT_ID}`, {}, tok);
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 401 || status === 403) return { ok: false, message: "Vercel didn't accept that token, or it can't see the FuzzyHR team. Create it with the scope set to FuzzyHR." };
    if (status === 404) return { ok: false, message: "The token works, but it can't see the fuzzyhr project. Create it with the scope set to the FuzzyHR team." };
    return { ok: false, message: "I couldn't reach Vercel to check the token. Try again in a minute." };
  }
  const sql = await db();
  const value: Stored = { enc: encrypt(tok), last4: tok.slice(-4), setAt: new Date().toISOString(), setBy: by };
  await sql`
    insert into app_settings (name, value, updated_by) values (${NAME}, ${JSON.stringify(value)}, ${by})
    on conflict (name) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`;
  return { ok: true, message: "Connected to Vercel. You can now roll back from this page." };
}

export async function removeVercelToken(): Promise<void> {
  const sql = await db();
  await sql`delete from app_settings where name = ${NAME}`;
}

export type Deployment = { id: string; url: string; createdAt: string; state: string; sha: string | null; message: string | null };

/** Recent production deployments, newest first, and which one is live right now. */
export async function productionDeployments(): Promise<{ deployments: Deployment[]; liveId: string | null }> {
  type Raw = { uid: string; url: string; created: number; state?: string; readyState?: string; meta?: { githubCommitSha?: string; githubCommitMessage?: string } };
  const [list, project] = await Promise.all([
    vercel<{ deployments: Raw[] }>(`/v6/deployments?projectId=${PROJECT_ID}&target=production&limit=12`),
    vercel<{ targets?: { production?: { id?: string } } }>(`/v9/projects/${PROJECT_ID}`),
  ]);
  const deployments = list.deployments.map((d) => ({
    id: d.uid,
    url: d.url,
    createdAt: new Date(d.created).toISOString(),
    state: d.readyState ?? d.state ?? "UNKNOWN",
    sha: d.meta?.githubCommitSha ?? null,
    message: d.meta?.githubCommitMessage?.split("\n")[0] ?? null,
  }));
  // The live deployment: what Vercel says production points at, or the one serving this page.
  const liveId = project.targets?.production?.id ?? process.env.VERCEL_DEPLOYMENT_ID ?? null;
  return { deployments, liveId };
}

/** Instant rollback: put a previous production deployment live. */
export async function rollbackTo(deploymentId: string, reason: string): Promise<void> {
  await vercel(`/v1/projects/${PROJECT_ID}/rollback/${deploymentId}?description=${encodeURIComponent(reason.slice(0, 200))}`, { method: "POST" });
}

/** Put a deployment live and resume automatic deploys (undoes a rollback). */
export async function promote(deploymentId: string): Promise<void> {
  await vercel(`/v10/projects/${PROJECT_ID}/promote/${deploymentId}`, { method: "POST" });
}
