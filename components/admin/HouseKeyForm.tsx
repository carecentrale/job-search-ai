"use client";

import { useActionState } from "react";
import { setHouseKeyAction, type KeyFormState } from "@/app/admin/actions";

/** Paste fuzzyHR's own AI key. Checked with the provider before it's saved; never shown again. */
export default function HouseKeyForm({ replacing }: { replacing: boolean }) {
  const [state, action, pending] = useActionState<KeyFormState, FormData>(setHouseKeyAction, null);
  return (
    <form action={action} className="key-form house-key-form">
      <label htmlFor="house-key" className="small">{replacing ? "Replace with a new key" : "Paste your API key"}</label>
      <div className="inline-form">
        <input id="house-key" name="apiKey" type="password" autoComplete="off" spellCheck={false} placeholder="sk-ant-… or sk-…" required minLength={20} />
        <button className="btn btn-small" type="submit" disabled={pending}>{pending ? "Checking…" : "Save key"}</button>
      </div>
      {state && <p className={`small ${state.ok ? "ok-text" : "warn"}`} role="status">{state.message}</p>}
    </form>
  );
}
