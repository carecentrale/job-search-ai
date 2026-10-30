"use client";

import { useActionState } from "react";
import { goLiveLatestAction, rollbackAction, saveVercelTokenAction, type KeyFormState } from "@/app/admin/actions";

function Status({ state }: { state: KeyFormState }) {
  if (!state) return null;
  return <p className={`small ${state.ok ? "ok-text" : "warn"}`} role="status">{state.message}</p>;
}

export function VercelTokenForm({ replacing }: { replacing: boolean }) {
  const [state, action, pending] = useActionState<KeyFormState, FormData>(saveVercelTokenAction, null);
  return (
    <form action={action} className="key-form house-key-form">
      <label htmlFor="vercel-token" className="small">{replacing ? "Replace the Vercel token" : "Vercel access token"}</label>
      <div className="inline-form">
        <input id="vercel-token" name="vercelToken" type="password" autoComplete="off" spellCheck={false} required minLength={20} />
        <button className="btn btn-small" type="submit" disabled={pending}>{pending ? "Checking…" : "Connect Vercel"}</button>
      </div>
      <Status state={state} />
    </form>
  );
}

export function RollbackForm({ deploymentId, label }: { deploymentId: string; label: string }) {
  const [state, action, pending] = useActionState<KeyFormState, FormData>(rollbackAction, null);
  return (
    <form
      action={action}
      className="rollback-form"
      onSubmit={(e) => {
        if (!window.confirm(`Roll the live site back to ${label}? It switches over within a minute.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="deploymentId" value={deploymentId} />
      <div className="inline-form">
        <input name="reason" placeholder="What broke? (optional, for the log)" maxLength={200} />
        <button className="btn btn-small btn-danger" type="submit" disabled={pending}>{pending ? "Rolling back…" : "Roll back to this"}</button>
      </div>
      <Status state={state} />
    </form>
  );
}

export function GoLiveForm({ deploymentId }: { deploymentId: string }) {
  const [state, action, pending] = useActionState<KeyFormState, FormData>(goLiveLatestAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="deploymentId" value={deploymentId} />
      <button className="btn btn-small" type="submit" disabled={pending}>{pending ? "Going live…" : "Go live with latest"}</button>
      <Status state={state} />
    </form>
  );
}
