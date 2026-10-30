import "server-only";
import Stripe from "stripe";
import { logActivity } from "./activity";
import { canStoreSecrets, decrypt, encrypt } from "./crypto";
import { db, hasDb } from "./db";

/**
 * Paid plans through Stripe.
 *
 * The owner pastes a Stripe secret key in Admin. fuzzyHR then creates, in that
 * Stripe account: the "fuzzyHR Personal" product, a monthly price in CAD and in
 * USD, a webhook endpoint (Stripe tells fuzzyHR about payments), and a customer
 * portal (subscribers manage or cancel billing themselves). Nothing needs
 * setting up in Stripe's dashboard.
 *
 * Personal: fuzzyHR's AI key pays for the user's AI, within the limits set in
 * Admin. Prices include tax.
 */

export type Currency = "cad" | "usd";
export const CURRENCIES: Currency[] = ["cad", "usd"];

export type PlanSettings = {
  /** Monthly price in cents, tax included. */
  priceCad: number;
  priceUsd: number;
  /** Tailored applications per billing month. */
  appsPerMonth: number;
  /** AI requests per day (reviews, writing, reading job pages). */
  dailyRequests: number;
  /** Shown on the site and in the workspace only when true. */
  selling: boolean;
};

export const DEFAULT_PLAN: PlanSettings = { priceCad: 1200, priceUsd: 999, appsPerMonth: 15, dailyRequests: 25, selling: false };

type StripeStored = {
  enc: string;
  mode: "test" | "live";
  last4: string;
  account: string | null;
  setAt: string;
  setBy: string;
  productId?: string;
  prices?: Partial<Record<Currency, { id: string; amount: number }>>;
  webhook?: { id: string; url: string; secretEnc: string };
  portalConfigId?: string;
};

const STRIPE = "stripe";
const PLAN = "personal_plan";

async function getSetting<T>(name: string): Promise<T | null> {
  if (!hasDb()) return null;
  const sql = await db();
  const [row] = await sql<{ value: string }[]>`select value from app_settings where name = ${name}`;
  return row ? (JSON.parse(row.value) as T) : null;
}

async function putSetting(name: string, value: unknown, by: string): Promise<void> {
  const sql = await db();
  await sql`
    insert into app_settings (name, value, updated_by) values (${name}, ${JSON.stringify(value)}, ${by})
    on conflict (name) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`;
}

export async function planSettings(): Promise<PlanSettings> {
  return { ...DEFAULT_PLAN, ...((await getSetting<Partial<PlanSettings>>(PLAN).catch(() => null)) ?? {}) };
}

async function stored(): Promise<StripeStored | null> {
  return getSetting<StripeStored>(STRIPE).catch(() => null);
}

/** For local testing only: point the SDK at a mock Stripe (ignored on Vercel). */
function clientOptions(): ConstructorParameters<typeof Stripe>[1] {
  const base = !process.env.VERCEL ? process.env.STRIPE_API_BASE : undefined;
  if (!base) return { maxNetworkRetries: 1 };
  const u = new URL(base);
  return { host: u.hostname, port: Number(u.port) || undefined, protocol: u.protocol.replace(":", "") as "http" | "https", maxNetworkRetries: 0 };
}

function client(secretKey: string): Stripe {
  return new Stripe(secretKey, clientOptions());
}

async function stripeClient(): Promise<{ stripe: Stripe; s: StripeStored } | null> {
  const s = await stored();
  if (!s || !canStoreSecrets()) return null;
  try {
    return { stripe: client(decrypt(s.enc)), s };
  } catch {
    return null;
  }
}

export const fmtPrice = (cents: number, currency: Currency) =>
  `${currency === "usd" ? "US$" : "CA$"}${cents % 100 === 0 ? cents / 100 : (cents / 100).toFixed(2)}`;

/** Can people buy Personal right now? Needs Stripe connected, prices published, selling switched on, and fuzzyHR's AI key. */
export async function salesStatus(houseKeyOn: boolean) {
  const [s, plan] = await Promise.all([stored(), planSettings()]);
  const pricesReady = Boolean(s?.prices?.cad && s?.prices?.usd);
  const ready = Boolean(s && pricesReady && s.webhook && plan.selling && houseKeyOn);
  return { ready, plan, connected: Boolean(s), mode: s?.mode ?? null, pricesReady, prices: s?.prices ?? {} };
}

/** What the admin panel shows. Never the key or webhook secret. */
export async function billingInfo() {
  const s = await stored();
  let readable = true;
  if (s) {
    try {
      decrypt(s.enc);
    } catch {
      readable = false;
    }
  }
  return {
    connected: s
      ? { mode: s.mode, last4: s.last4, account: s.account, setAt: s.setAt, webhookUrl: s.webhook?.url ?? null, prices: s.prices ?? {}, portal: Boolean(s.portalConfigId) }
      : null,
    readable,
    plan: await planSettings(),
    canSave: canStoreSecrets(),
  };
}

const EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
  "invoice.paid",
];

/**
 * Connect a Stripe account: check the key, then create the webhook endpoint and
 * customer portal. `siteUrl` is this site's address, for the webhook and links.
 */
export async function connectStripe(raw: string, by: string, siteUrl: string): Promise<{ ok: boolean; message: string }> {
  const key = raw.trim();
  if (!canStoreSecrets()) return { ok: false, message: "The server has no encryption secret yet, so it can't store keys safely." };
  if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]{10,}$/.test(key)) {
    return { ok: false, message: "That doesn't look like a Stripe secret key. It starts with sk_test_ or sk_live_ (Stripe dashboard → Developers → API keys)." };
  }
  const mode = key.includes("_live_") ? "live" : "test";
  const stripe = client(key);
  let account: string | null = null;
  try {
    const acct = await stripe.accounts.retrieveCurrent();
    account = acct.settings?.dashboard?.display_name || acct.business_profile?.name || acct.email || acct.id;
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 401) return { ok: false, message: "Stripe didn't accept that key. Check you copied all of it." };
    if (code === 403) return { ok: false, message: "That key can't manage this account. Use the standard secret key (sk_…), not a restricted one." };
    return { ok: false, message: "I couldn't reach Stripe to check the key. Try again in a minute." };
  }

  const previous = await stored();
  // A webhook we made before, on the same account and mode, gets replaced.
  if (previous?.webhook && previous.mode === mode) {
    try {
      await client(decrypt(previous.enc)).webhookEndpoints.del(previous.webhook.id);
    } catch {
      /* already gone, or the old key no longer works */
    }
  }
  const url = `${siteUrl.replace(/\/$/, "")}/api/stripe/webhook`;
  let webhook;
  let portal;
  try {
    webhook = await stripe.webhookEndpoints.create({ url, enabled_events: EVENTS, description: "fuzzyHR: subscription updates" });
    portal = await stripe.billingPortal.configurations.create({
      business_profile: { headline: "fuzzyHR: manage your Personal plan" },
      default_return_url: `${siteUrl.replace(/\/$/, "")}/app`,
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        customer_update: { enabled: true, allowed_updates: ["email", "address"] },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
      },
    });
  } catch (e) {
    return { ok: false, message: `The key works, but Stripe refused a setup step: ${(e as Error).message}` };
  }

  const keepPrices = previous && previous.mode === mode && previous.account === account;
  const next: StripeStored = {
    enc: encrypt(key),
    mode,
    last4: key.slice(-4),
    account,
    setAt: new Date().toISOString(),
    setBy: by,
    productId: keepPrices ? previous.productId : undefined,
    prices: keepPrices ? previous.prices : undefined,
    webhook: { id: webhook.id, url, secretEnc: encrypt(webhook.secret ?? "") },
    portalConfigId: portal.id,
  };
  await putSetting(STRIPE, next, by);
  return {
    ok: true,
    message: `Connected to ${account ?? "your Stripe account"} in ${mode} mode.${keepPrices && next.prices ? "" : " Next: set your prices below and publish them."}`,
  };
}

export async function disconnectStripe(): Promise<void> {
  const c = await stripeClient();
  if (c?.s.webhook) {
    try {
      await c.stripe.webhookEndpoints.del(c.s.webhook.id);
    } catch {
      /* ignore */
    }
  }
  const sql = await db();
  await sql`delete from app_settings where name = ${STRIPE}`;
  const plan = await planSettings();
  await putSetting(PLAN, { ...plan, selling: false }, "system");
}

/**
 * Save the plan's prices and limits. When a price changed, create new Stripe
 * prices (Stripe prices can't be edited) and archive the old ones. Existing
 * subscribers keep the price they signed up at.
 */
export async function savePlan(next: PlanSettings, by: string): Promise<{ ok: boolean; message: string }> {
  if (next.priceCad < 100 || next.priceUsd < 100) return { ok: false, message: "Prices must be at least 1.00." };
  if (next.appsPerMonth < 1 || next.appsPerMonth > 500) return { ok: false, message: "Tailored applications must be between 1 and 500 a month." };
  if (next.dailyRequests < 5 || next.dailyRequests > 500) return { ok: false, message: "AI requests must be between 5 and 500 a day." };
  const c = await stripeClient();
  if (next.selling && !c) return { ok: false, message: "Connect Stripe first, then switch sales on." };
  if (c) {
    const { stripe, s } = c;
    let productId = s.productId;
    if (!productId) {
      const product = await stripe.products.create({
        name: "fuzzyHR Personal",
        description: "Your AI personal headhunter, no API key needed. Monthly, tax included.",
      });
      productId = product.id;
    }
    const prices = { ...(s.prices ?? {}) };
    for (const currency of CURRENCIES) {
      const amount = currency === "cad" ? next.priceCad : next.priceUsd;
      if (prices[currency]?.amount === amount) continue;
      const created = await stripe.prices.create({
        product: productId,
        currency,
        unit_amount: amount,
        recurring: { interval: "month" },
        tax_behavior: "inclusive",
        nickname: `Personal ${currency.toUpperCase()} monthly`,
      });
      if (prices[currency]) {
        try {
          await stripe.prices.update(prices[currency]!.id, { active: false });
        } catch {
          /* old price may be gone */
        }
      }
      prices[currency] = { id: created.id, amount };
    }
    await putSetting(STRIPE, { ...s, productId, prices }, by);
  }
  await putSetting(PLAN, next, by);
  return { ok: true, message: next.selling ? "Saved. Personal is on sale." : "Saved. Sales are off until you switch them on." };
}

/* ---------- Subscribers ---------- */

export type Subscription = {
  customerId: string | null;
  subscriptionId: string | null;
  status: string | null;
  currency: Currency | null;
  periodStart: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

/** Statuses that count as paid: Personal features on. */
export const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);

export async function checkoutUrl(
  user: { id: string; email: string | null; customerId: string | null },
  currency: Currency,
  siteUrl: string,
): Promise<string> {
  const c = await stripeClient();
  const price = c?.s.prices?.[currency];
  if (!c || !price) throw new Error("Payments aren't set up yet.");
  let customer = user.customerId;
  if (customer) {
    try {
      const existing = await c.stripe.customers.retrieve(customer);
      if ((existing as { deleted?: boolean }).deleted) customer = null;
    } catch {
      customer = null;
    }
  }
  if (!customer) {
    const created = await c.stripe.customers.create({ email: user.email ?? undefined, metadata: { fuzzyhr_user: user.id } });
    customer = created.id;
    const sql = await db();
    await sql`update seekers set stripe_customer_id = ${customer} where user_id = ${user.id}`;
  }
  const site = siteUrl.replace(/\/$/, "");
  const session = await c.stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: user.id,
    line_items: [{ price: price.id, quantity: 1 }],
    subscription_data: { metadata: { fuzzyhr_user: user.id } },
    allow_promotion_codes: true,
    success_url: `${site}/app?billing=success`,
    cancel_url: `${site}/app?billing=cancelled`,
  });
  if (!session.url) throw new Error("Stripe didn't return a checkout page.");
  return session.url;
}

export async function portalUrl(customerId: string, siteUrl: string): Promise<string> {
  const c = await stripeClient();
  if (!c) throw new Error("Payments aren't set up yet.");
  const session = await c.stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${siteUrl.replace(/\/$/, "")}/app`,
    configuration: c.s.portalConfigId,
  });
  return session.url;
}

/** Verify and parse a webhook from Stripe. Returns null if the signature doesn't check out. */
export async function verifyWebhook(body: string, signature: string | null): Promise<Stripe.Event | null> {
  const c = await stripeClient();
  if (!c?.s.webhook || !signature) return null;
  try {
    return c.stripe.webhooks.constructEvent(body, signature, decrypt(c.s.webhook.secretEnc));
  } catch {
    return null;
  }
}

/** Mirror a Stripe subscription onto the user it belongs to. */
export async function syncSubscription(sub: Stripe.Subscription, hint?: string): Promise<void> {
  const sql = await db();
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const item = sub.items?.data?.[0];
  const userId =
    sub.metadata?.fuzzyhr_user ||
    hint ||
    (await sql<{ user_id: string }[]>`select user_id from seekers where stripe_customer_id = ${customerId}`)[0]?.user_id;
  if (!userId) {
    console.error("stripe subscription for unknown user", sub.id);
    return;
  }
  const [before] = await sql<{ plan: string; subscription_status: string | null }[]>`select plan, subscription_status from seekers where user_id = ${userId}`;
  if (!before) return;
  const paid = PAID_STATUSES.has(sub.status);
  const paused = Boolean(sub.pause_collection);
  const resumeAt = sub.pause_collection?.resumes_at ? new Date(sub.pause_collection.resumes_at * 1000) : null;
  const periodStart = item?.current_period_start ? new Date(item.current_period_start * 1000) : null;
  const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000) : null;
  await sql`
    update seekers set
      plan = ${paid ? "personal" : "trial"},
      stripe_customer_id = ${customerId},
      stripe_subscription_id = ${sub.id},
      subscription_status = ${sub.status},
      plan_currency = ${sub.currency},
      period_start = ${periodStart},
      period_end = ${periodEnd},
      cancel_at_period_end = ${Boolean(sub.cancel_at_period_end)},
      billing_paused = ${paused},
      -- Keep the "paid through" date set when they paused; Stripe keeps cycling periods while paused.
      paid_through = ${paused ? sql`coalesce(paid_through, ${periodEnd})` : null},
      resume_at = ${paused ? resumeAt : null},
      updated_at = now()
    where user_id = ${userId}`;
  if (before.plan !== "personal" && paid) {
    await logActivity(userId, "plan_started", { currency: sub.currency, amount: item?.price?.unit_amount ?? null, status: sub.status });
  } else if (before.plan === "personal" && !paid) {
    await logActivity(userId, "plan_ended", { status: sub.status });
  } else if (before.subscription_status !== sub.status) {
    await logActivity(userId, "plan_changed", { from: before.subscription_status, to: sub.status, cancelAtPeriodEnd: sub.cancel_at_period_end });
  }
}

/** Fetch the latest copy of a subscription (webhooks can arrive out of order). */
export async function fetchSubscription(id: string): Promise<Stripe.Subscription | null> {
  const c = await stripeClient();
  if (!c) return null;
  try {
    return await c.stripe.subscriptions.retrieve(id);
  } catch {
    return null;
  }
}

/** When an account is deleted, cancel its subscription immediately so it isn't billed again. */
export async function cancelSubscriptionFor(userId: string): Promise<void> {
  const sql = await db();
  const [row] = await sql<{ stripe_subscription_id: string | null; subscription_status: string | null }[]>`
    select stripe_subscription_id, subscription_status from seekers where user_id = ${userId}`;
  if (!row?.stripe_subscription_id || !PAID_STATUSES.has(row.subscription_status ?? "")) return;
  const c = await stripeClient();
  if (!c) throw new Error("Stripe isn't connected, so the subscription can't be cancelled from here.");
  await c.stripe.subscriptions.cancel(row.stripe_subscription_id);
}

/**
 * Pause billing: no more charges. They keep Personal until the end of the month
 * they've paid for. `months` sets when billing resumes by itself (counted from
 * that date); null means until they resume.
 */
export async function pauseBilling(userId: string, months: number | null): Promise<{ paidThrough: Date | null; resumeAt: Date | null }> {
  const sql = await db();
  const [row] = await sql<{ stripe_subscription_id: string | null; subscription_status: string | null }[]>`
    select stripe_subscription_id, subscription_status from seekers where user_id = ${userId}`;
  if (!row?.stripe_subscription_id || !PAID_STATUSES.has(row.subscription_status ?? "")) return { paidThrough: null, resumeAt: null };
  const c = await stripeClient();
  if (!c) throw new Error("Stripe isn't connected.");
  const sub = await c.stripe.subscriptions.retrieve(row.stripe_subscription_id);
  const end = sub.items?.data?.[0]?.current_period_end;
  const paidThrough = end ? new Date(end * 1000) : new Date();
  const resumeAt = months ? new Date(paidThrough.getTime() + months * 30 * 86_400_000) : null;
  const updated = await c.stripe.subscriptions.update(sub.id, {
    pause_collection: { behavior: "void", ...(resumeAt ? { resumes_at: Math.floor(resumeAt.getTime() / 1000) } : {}) },
  });
  await sql`update seekers set billing_paused = true, paid_through = ${paidThrough}, resume_at = ${resumeAt} where user_id = ${userId}`;
  await syncSubscription(updated, userId);
  return { paidThrough, resumeAt };
}

/**
 * Resume billing. Inside the month they already paid for, billing simply carries
 * on at the next renewal. After it, a new month starts today and is charged now.
 */
export async function resumeBilling(userId: string): Promise<{ chargedNow: boolean }> {
  const sql = await db();
  const [row] = await sql<{ stripe_subscription_id: string | null; billing_paused: boolean; paid_through: Date | null }[]>`
    select stripe_subscription_id, billing_paused, paid_through from seekers where user_id = ${userId}`;
  if (!row?.stripe_subscription_id || !row.billing_paused) return { chargedNow: false };
  const c = await stripeClient();
  if (!c) throw new Error("Stripe isn't connected.");
  const stillPaid = row.paid_through && Date.now() < row.paid_through.getTime();
  const params: Stripe.SubscriptionUpdateParams = { pause_collection: "" };
  if (!stillPaid) {
    params.billing_cycle_anchor = "now" as never; // the SDK types this field loosely; "now" is a documented value
    params.proration_behavior = "none";
  }
  const updated = await c.stripe.subscriptions.update(row.stripe_subscription_id, params);
  await sql`update seekers set billing_paused = false, paid_through = null, resume_at = null where user_id = ${userId}`;
  await syncSubscription(updated, userId);
  return { chargedNow: !stillPaid };
}
