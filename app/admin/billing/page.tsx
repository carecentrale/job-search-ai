import Link from "next/link";
import { BillingForms } from "./forms";
import { requireAdmin, subscribers } from "@/lib/admin";
import { billingInfo, fmtPrice, salesStatus } from "@/lib/billing";
import { ago, when } from "@/lib/describe";
import { houseKeyAvailable } from "@/lib/house";
import { disconnectStripeAction } from "../actions";

const STATUS: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Payment failed, retrying",
  canceled: "Cancelled",
  unpaid: "Unpaid",
  incomplete: "Checkout not finished",
  incomplete_expired: "Checkout expired",
  paused: "Paused",
};

export default async function AdminBilling() {
  await requireAdmin();
  const houseOn = await houseKeyAvailable();
  const [info, sales, subs] = await Promise.all([billingInfo(), salesStatus(houseOn), subscribers()]);
  const c = info.connected;
  const paying = subs.filter((s) => s.plan === "personal");
  const byCur = (cur: string) => paying.filter((s) => s.plan_currency === cur).length;
  const mrrCad = byCur("cad") * info.plan.priceCad;
  const mrrUsd = byCur("usd") * info.plan.priceUsd;

  const blockers = [
    !c && "Stripe isn't connected",
    c && !sales.pricesReady && "prices aren't published yet (save the plan below)",
    !info.plan.selling && "sales are switched off",
    !houseOn && (
      <>fuzzyHR&apos;s AI key isn&apos;t set (<Link href="/admin#ai-key">set it on Overview</Link>), and Personal runs on it</>
    ),
  ].filter(Boolean);

  return (
    <div className="admin-stack">
      <section className="admin-stats" aria-label="Subscriptions">
        <div className="stat"><span>{paying.length}</span>paying<small>{byCur("cad")} in CAD, {byCur("usd")} in USD</small></div>
        <div className="stat"><span>{fmtPrice(mrrCad, "cad")}</span>a month (CAD)<small>at current prices, tax included</small></div>
        <div className="stat"><span>{fmtPrice(mrrUsd, "usd")}</span>a month (USD)<small>at current prices, tax included</small></div>
        <div className="stat"><span>{subs.filter((s) => s.cancel_at_period_end && s.plan === "personal").length}</span>cancelling<small>end at their period end</small></div>
      </section>

      <section className={`panel key-alert ${sales.ready ? "key-alert-good" : ""}`}>
        <h2>{sales.ready ? "Personal is on sale" : "Personal isn't on sale yet"}</h2>
        {sales.ready ? (
          <p className="small">
            {fmtPrice(info.plan.priceCad, "cad")} or {fmtPrice(info.plan.priceUsd, "usd")} a month, {info.plan.appsPerMonth} tailored applications.
            {sales.mode === "test" ? " Stripe is in test mode: no real charges. Pay with Stripe's test card 4242 4242 4242 4242 to try it. Switch to your live key when you're ready." : " Live mode: real charges."}
          </p>
        ) : (
          <p className="small">Waiting on: {blockers.map((b, i) => <span key={i}>{i > 0 ? "; " : ""}{b}</span>)}.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Stripe</h2>
          <p className="muted small">fuzzyHR creates the product, prices, webhook and billing portal in your Stripe account itself.</p>
        </div>
        {c ? (
          <>
            <p>
              <strong>Connected</strong> to {c.account ?? "your Stripe account"} in <strong>{c.mode}</strong> mode, with a key ending in <span className="mono">…{c.last4}</span>, {ago(c.setAt)}.
              {c.webhookUrl ? <> Stripe sends updates to <span className="mono small">{c.webhookUrl}</span>.</> : null}
            </p>
            {!info.readable && <p className="warn small">The saved Stripe key can no longer be read (the server&apos;s encryption secret changed). Connect it again.</p>}
            {c.webhookUrl && !c.webhookUrl.startsWith("https://") && <p className="warn small">Stripe can only send updates to a public https address. Connect from the live site.</p>}
          </>
        ) : (
          <ol className="small key-alert-steps">
            <li>In Stripe, open Developers → API keys. Start in <strong>test mode</strong> to try everything with no real charges.</li>
            <li>Reveal and copy the <strong>Secret key</strong> (sk_test_…), and paste it below. Do this on the live site, so Stripe can reach it.</li>
            <li>Set your prices below, switch on sales, and test with card 4242 4242 4242 4242. Then repeat with your live key (sk_live_…).</li>
          </ol>
        )}
        {info.canSave ? <BillingForms.Key replacing={Boolean(c)} /> : <p className="warn small">The server has no encryption secret yet, so it can&apos;t store keys safely.</p>}
        {c && (
          <form action={disconnectStripeAction}>
            <button className="textbtn small" type="submit">Disconnect Stripe (stops sales; existing subscriptions keep running in Stripe)</button>
          </form>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>The Personal plan</h2>
          <p className="muted small">No API key needed: fuzzyHR&apos;s AI key pays for their AI, within these allowances. Prices include tax.</p>
        </div>
        {c?.prices && (c.prices.cad || c.prices.usd) ? (
          <p className="small muted">Published in Stripe: {c.prices.cad ? fmtPrice(c.prices.cad.amount, "cad") : "no CAD price"}, {c.prices.usd ? fmtPrice(c.prices.usd.amount, "usd") : "no USD price"} a month.</p>
        ) : null}
        <BillingForms.Plan plan={info.plan} connected={Boolean(c)} />
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Subscribers</h2></div>
        {subs.length === 0 ? (
          <p className="muted">No subscribers yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>User</th><th>Status</th><th>Currency</th><th>Renews or ends</th></tr></thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.user_id}>
                    <td><Link href={`/admin/users/${encodeURIComponent(s.user_id)}`}>{s.email ?? s.user_id}</Link></td>
                    <td><span className={`pill pill-${s.plan === "personal" ? (s.subscription_status === "past_due" ? "warn" : "good") : "muted"}`}>{STATUS[s.subscription_status ?? ""] ?? s.subscription_status}</span>{s.cancel_at_period_end && s.plan === "personal" ? <span className="pill pill-warn">cancelling</span> : null}</td>
                    <td>{(s.plan_currency ?? "").toUpperCase()}</td>
                    <td>{s.period_end ? when(s.period_end) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
