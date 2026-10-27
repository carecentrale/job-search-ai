import { ApiError, withSeeker } from "@/lib/api";
import { portalUrl } from "@/lib/billing";
import { siteUrl } from "@/lib/site";

/** POST /api/me/billing/portal: Stripe's page to update the card, see invoices or cancel. */
export async function POST() {
  return withSeeker(async (s) => {
    if (!s.subscription.customerId) throw new ApiError(404, "There's no billing to manage yet.");
    try {
      return Response.json({ url: await portalUrl(s.subscription.customerId, await siteUrl()) });
    } catch (e) {
      console.error("portal failed", (e as Error).message);
      throw new ApiError(502, "I couldn't open the billing page. Try again in a minute.");
    }
  });
}
