import type Stripe from "stripe";
import { logActivity } from "@/lib/activity";
import { fetchSubscription, syncSubscription, verifyWebhook } from "@/lib/billing";
import { db } from "@/lib/db";

/**
 * POST /api/stripe/webhook: Stripe reports payments and subscription changes here.
 * Every request must carry a valid Stripe signature; anything else is refused.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const event = await verifyWebhook(body, req.headers.get("stripe-signature"));
  if (!event) return Response.json({ error: "Invalid signature." }, { status: 400 });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        const sub = subId ? await fetchSubscription(subId) : null;
        if (sub) await syncSubscription(sub, session.client_reference_id ?? undefined);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sent = event.data.object as Stripe.Subscription;
        // Webhooks can arrive out of order, so read the latest state from Stripe.
        const sub = (await fetchSubscription(sent.id)) ?? sent;
        await syncSubscription(sub);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customer = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customer) {
          const sql = await db();
          const [u] = await sql<{ user_id: string }[]>`select user_id from seekers where stripe_customer_id = ${customer}`;
          if (u) await logActivity(u.user_id, "payment_failed", { amount: invoice.amount_due, currency: invoice.currency, attempt: invoice.attempt_count });
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("stripe webhook failed", event.type, (e as Error).message);
    return Response.json({ error: "Processing failed." }, { status: 500 });
  }
  return Response.json({ received: true });
}
