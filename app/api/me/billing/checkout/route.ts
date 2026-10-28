import { logActivity } from "@/lib/activity";
import { ApiError, withSeeker } from "@/lib/api";
import { checkoutUrl, salesStatus } from "@/lib/billing";
import { visitorCountry, currencyFor } from "@/lib/geo";
import { houseKeyAvailable } from "@/lib/house";
import { isPersonal } from "@/lib/seekers";
import { siteUrl } from "@/lib/site";

/**
 * POST /api/me/billing/checkout: a Stripe Checkout page for the Personal plan.
 * The currency comes from where the visitor is: CAD in Canada, USD in the US.
 * Personal isn't sold anywhere else yet.
 */
export async function POST() {
  return withSeeker(async (s) => {
    const country = await visitorCountry();
    const cur = currencyFor(country);
    if (!cur) throw new ApiError(403, "Personal is available in Canada and the US for now. fuzzyHR is still free everywhere with your own AI key.");
    if (isPersonal(s)) throw new ApiError(409, "You're already on Personal. Manage it under Plan.");
    const sales = await salesStatus(await houseKeyAvailable());
    if (!sales.ready) throw new ApiError(503, "The Personal plan isn't on sale yet.");
    let url: string;
    try {
      url = await checkoutUrl({ id: s.id, email: s.email, customerId: s.subscription.customerId }, cur, await siteUrl());
    } catch (e) {
      console.error("checkout failed", (e as Error).message);
      throw new ApiError(502, "I couldn't open the payment page. Try again in a minute.");
    }
    await logActivity(s.id, "checkout_started", { currency: cur, country });
    return Response.json({ url });
  });
}
