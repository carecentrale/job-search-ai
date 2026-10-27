import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Encrypts users' Claude API keys at rest with AES-256-GCM.
 * The 256-bit key is derived from ENCRYPTION_KEY, any long random string set in Vercel.
 * If ENCRYPTION_KEY changes, saved keys can no longer be read and users are asked to add theirs again.
 */

export function canStoreSecrets(): boolean {
  return (process.env.ENCRYPTION_KEY ?? "").length >= 16;
}

function key(): Buffer {
  const secret = process.env.ENCRYPTION_KEY ?? "";
  if (secret.length < 16) throw new Error("ENCRYPTION_KEY is not set (16+ characters).");
  return createHash("sha256").update(`fuzzyhr:v1:${secret}`).digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), body.toString("base64")].join(":");
}

export function decrypt(sealed: string): string {
  const [v, iv, tag, body] = sealed.split(":");
  if (v !== "v1" || !iv || !tag || !body) throw new Error("Unrecognised encrypted value.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString("utf8");
}
