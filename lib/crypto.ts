import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Encrypts saved AI keys at rest with AES-256-GCM.
 *
 * The encryption key comes from ENCRYPTION_KEY when it's set in Vercel. Without
 * it, fuzzyHR derives one from CLERK_SECRET_KEY, which the Clerk integration
 * already put in Vercel, so the owner doesn't have to add anything. Each saved
 * value records which source sealed it ("v1" = ENCRYPTION_KEY, "c1" = Clerk), so
 * adding ENCRYPTION_KEY later doesn't break keys saved before.
 *
 * If the source behind a saved value changes (for example, moving Clerk from
 * development to production keys), that value can't be read any more and its
 * owner is asked to add the key again.
 */

type Source = "v1" | "c1";

function secretFor(source: Source): string | null {
  const s = source === "v1" ? process.env.ENCRYPTION_KEY : process.env.CLERK_SECRET_KEY;
  return s && s.length >= 16 ? s : null;
}

function current(): Source | null {
  if (secretFor("v1")) return "v1";
  if (secretFor("c1")) return "c1";
  return null;
}

export function canStoreSecrets(): boolean {
  return current() !== null;
}

function keyFor(source: Source): Buffer {
  const secret = secretFor(source);
  if (!secret) throw new Error(`No secret available to ${source === "v1" ? "ENCRYPTION_KEY" : "CLERK_SECRET_KEY"} encryption.`);
  // Different labels, so the two sources can never produce the same key.
  const label = source === "v1" ? "fuzzyhr:v1:" : "fuzzyhr:clerk-derived:v1:";
  return createHash("sha256").update(`${label}${secret}`).digest();
}

export function encrypt(plain: string): string {
  const source = current();
  if (!source) throw new Error("No encryption secret is configured.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(source), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [source, iv.toString("base64"), cipher.getAuthTag().toString("base64"), body.toString("base64")].join(":");
}

export function decrypt(sealed: string): string {
  const [v, iv, tag, body] = sealed.split(":");
  if ((v !== "v1" && v !== "c1") || !iv || !tag || !body) throw new Error("Unrecognised encrypted value.");
  const decipher = createDecipheriv("aes-256-gcm", keyFor(v), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString("utf8");
}
