import "server-only";
import { db } from "./db";
import { ApiError } from "./errors";

/**
 * The "tell me when it's available" list: people outside Canada and the US who
 * want the Personal plan. Their email is the one they confirmed at sign-up
 * (Clerk emails a code). The phone number is optional and is not verified.
 * Only stored with their express consent to be contacted about availability.
 */

export type AvailabilityRequest = {
  user_id: string;
  email: string;
  phone: string | null;
  country: string | null;
  lang: string | null;
  consent_at: Date;
  created_at: Date;
};

/** "+33 6 12 34 56 78" → "+33612345678". Empty is fine (the phone is optional); anything else must look like a phone number. */
export function cleanPhone(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 7 || digits.length > 15 || /[^\d\s().+-]/.test(raw)) {
    throw new ApiError(400, "That doesn't look like a phone number. Include the country code, like +33 6 12 34 56 78, or leave it empty.");
  }
  return `${raw.trim().startsWith("+") ? "+" : ""}${digits}`;
}

export async function availabilityRequestFor(userId: string): Promise<AvailabilityRequest | null> {
  const sql = await db();
  const [row] = await sql<AvailabilityRequest[]>`select * from availability_requests where user_id = ${userId}`;
  return row ?? null;
}

export async function saveAvailabilityRequest(r: { userId: string; email: string; phone: string | null; country: string | null; lang: string | null }): Promise<void> {
  const sql = await db();
  await sql`
    insert into availability_requests (user_id, email, phone, country, lang)
    values (${r.userId}, ${r.email}, ${r.phone}, ${r.country}, ${r.lang})
    on conflict (user_id) do update set
      email = excluded.email, phone = excluded.phone, country = excluded.country, lang = excluded.lang, consent_at = now()`;
}

export async function removeAvailabilityRequest(userId: string): Promise<void> {
  const sql = await db();
  await sql`delete from availability_requests where user_id = ${userId}`;
}

/** For the owner's Admin → Payments page: who is waiting, newest first, and how many per country. */
export async function availabilityList(): Promise<{ rows: AvailabilityRequest[]; byCountry: { country: string; n: number }[] }> {
  const sql = await db();
  const rows = await sql<AvailabilityRequest[]>`select * from availability_requests order by created_at desc limit 1000`;
  const byCountry = await sql<{ country: string; n: number }[]>`
    select coalesce(country, 'unknown') as country, count(*)::int as n from availability_requests group by 1 order by n desc, 1`;
  return { rows, byCountry };
}
