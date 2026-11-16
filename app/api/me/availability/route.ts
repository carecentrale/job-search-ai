import { logActivity } from "@/lib/activity";
import { ApiError, readJson, stateResponse, withSeeker } from "@/lib/api";
import { clerkEnabled } from "@/lib/auth";
import { cleanPhone, removeAvailabilityRequest, saveAvailabilityRequest } from "@/lib/availability";
import { currencyFor, visitorCountry } from "@/lib/geo";

/**
 * POST /api/me/availability { phone?, consent: true }: "tell me when Personal is
 * available in my country". Only for visitors outside Canada and the US, only with
 * their consent, and only once their sign-up email is confirmed.
 */
export async function POST(req: Request) {
  return withSeeker(async (s) => {
    const { phone, consent } = await readJson<{ phone?: string; consent?: boolean }>(req);
    if (consent !== true) throw new ApiError(400, "Tick the box to agree to be contacted, so I'm allowed to write to you.");
    const country = await visitorCountry();
    if (currencyFor(country)) throw new ApiError(409, "Personal is already available where you are.");
    let email = s.email;
    if (clerkEnabled()) {
      const { currentUser } = await import("@clerk/nextjs/server");
      const primary = (await currentUser())?.primaryEmailAddress;
      if (!primary || primary.verification?.status !== "verified") throw new ApiError(403, "Confirm your email address first, then try again.");
      email = primary.emailAddress;
    }
    if (!email) throw new ApiError(400, "Your account has no email address to write to.");
    const cleaned = cleanPhone(phone);
    await saveAvailabilityRequest({ userId: s.id, email, phone: cleaned, country, lang: s.lang ?? null });
    await logActivity(s.id, "availability_wanted", { country, phone: Boolean(cleaned) });
    return stateResponse(s);
  });
}

/** DELETE /api/me/availability: take me off the list. */
export async function DELETE() {
  return withSeeker(async (s) => {
    await removeAvailabilityRequest(s.id);
    return stateResponse(s);
  });
}
