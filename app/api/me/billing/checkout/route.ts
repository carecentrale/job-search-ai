import { logActivity } from "@/lib/activity";
import { ApiError, readJson, withSeeker } from "@/lib/api";
import { checkoutUrl, salesStatus, type Currency } from "@/lib/billing";
import { houseKeyAvailable } from "@/lib/house";
import { isPersonal } from "@/lib/seekers";
import { siteUrl } from "@/lib/site";

/** POST /api/me/billing/checkout { currency }: a Stripe Checkout page for the Personal plan. */
export async function POST(req: Request) {
  return withSeeker(async (s) => {
    const { currency } = await readJson<{ currency?: string }>(req);
    const cur: Currency = currency === "usd" ? "usd" : "cad";
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
    await logActivity(s.id, "checkout_started", { currency: cur });
    return Response.json({ url });
  });
}
