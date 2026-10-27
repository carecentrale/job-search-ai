"use client";

import { useActionState } from "react";
import { connectStripeAction, savePlanAction, type KeyFormState } from "@/app/admin/actions";
import type { PlanSettings } from "@/lib/billing";

function Status({ state }: { state: KeyFormState }) {
  if (!state) return null;
  return <p className={`small ${state.ok ? "ok-text" : "warn"}`} role="status">{state.message}</p>;
}

/** Paste a Stripe secret key. fuzzyHR then sets up the webhook and billing portal itself. */
export function StripeKeyForm({ replacing }: { replacing: boolean }) {
  const [state, action, pending] = useActionState<KeyFormState, FormData>(connectStripeAction, null);
  return (
    <form action={action} className="key-form house-key-form">
      <label htmlFor="stripe-key" className="small">{replacing ? "Replace with another Stripe key (for example, your live key)" : "Stripe secret key"}</label>
      <div className="inline-form">
        <input id="stripe-key" name="stripeKey" type="password" autoComplete="off" spellCheck={false} placeholder="sk_test_… or sk_live_…" required minLength={20} />
        <button className="btn btn-small" type="submit" disabled={pending}>{pending ? "Connecting…" : "Connect Stripe"}</button>
      </div>
      <Status state={state} />
    </form>
  );
}

const money = (cents: number) => (cents / 100).toFixed(2);

/** The Personal plan: prices, allowances, and the on-sale switch. */
export function PlanForm({ plan, connected }: { plan: PlanSettings; connected: boolean }) {
  const [state, action, pending] = useActionState<KeyFormState, FormData>(savePlanAction, null);
  return (
    <form action={action} className="plan-form">
      <div className="plan-fields">
        <label>Price in Canada <span className="muted small">CA$ a month, tax included</span>
          <input name="priceCad" inputMode="decimal" defaultValue={money(plan.priceCad)} required />
        </label>
        <label>Price elsewhere <span className="muted small">US$ a month, tax included</span>
          <input name="priceUsd" inputMode="decimal" defaultValue={money(plan.priceUsd)} required />
        </label>
        <label>Tailored applications <span className="muted small">a month</span>
          <input name="appsPerMonth" type="number" min={1} max={500} defaultValue={plan.appsPerMonth} required />
        </label>
        <label>AI requests <span className="muted small">a day (reviews, writing, reading links)</span>
          <input name="dailyRequests" type="number" min={5} max={500} defaultValue={plan.dailyRequests} required />
        </label>
      </div>
      <div className="toggle-row">
        <input id="selling" name="selling" type="checkbox" defaultChecked={plan.selling} disabled={!connected} />
        <label htmlFor="selling">
          <strong>On sale</strong>
          <span className="muted small" style={{ display: "block" }}>
            Shows Personal on the website and in users&apos; Plan page, with a Subscribe button. {connected ? "" : "Connect Stripe first."}
          </span>
        </label>
      </div>
      <button className="btn btn-small" type="submit" disabled={pending}>{pending ? "Saving…" : "Save plan"}</button>
      <p className="muted small">Changing a price creates a new price in Stripe. Existing subscribers keep the price they signed up at.</p>
      <Status state={state} />
    </form>
  );
}
