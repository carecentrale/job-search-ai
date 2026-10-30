/** Human-readable lines for the admin activity feed. */

type D = Record<string, unknown>;
const s = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const n = (v: unknown) => (typeof v === "number" ? v.toLocaleString("en-CA") : s(v));
const provider = (v: unknown) => (v === "openai" ? "OpenAI" : "Claude");
const at = (d: D) => (d.company ? ` at ${s(d.company)}` : "");

export const ACTIVITY_LABEL: Record<string, string> = {
  signed_up: "Signed up",
  cv_uploaded: "CV uploaded",
  brief_saved: "Brief saved",
  hunt: "Hunt",
  job_passed: "Passed on a job",
  application_created: "Application started",
  status_changed: "Status changed",
  followed_up: "Followed up",
  application_note: "Note or interview date",
  documents_written: "CV and letter written",
  write_failed: "Writing failed",
  key_added: "AI key added",
  key_rejected: "AI key rejected",
  key_removed: "AI key removed",
  limit_hit: "Hit a limit",
  role_changed: "Role changed",
  ai_review: "AI reviewed matches",
  autopilot_approved: "Autopilot approved a role",
  autopilot_changed: "Autopilot settings",
  company_added: "Followed a company",
  company_removed: "Unfollowed a company",
  job_link_added: "Added a job link",
  data_exported: "Downloaded their data",
  account_deleted: "Deleted their account",
  page_view: "Page view",
  ai_wanted: "Wanted AI (no key yet)",
  tester_changed: "Tester flag",
  fresh_free_week: "Fresh free week",
  house_key_changed: "fuzzyHR's AI key",
  checkout_started: "Opened checkout",
  plan_started: "Subscribed",
  plan_changed: "Subscription changed",
  plan_ended: "Subscription ended",
  payment_failed: "Payment failed",
  billing_settings: "Payment settings",
  paused: "Paused",
  resumed: "Resumed",
  got_job: "Got a job",
  release_action: "Release",
};

export function describe(type: string, d: D): string {
  const text = describeEvent(type, d);
  if (!d.backfilled) return text;
  return `${text} (Rebuilt from saved data${d.approxTime ? ", time approximate" : ""}.)`;
}

function describeEvent(type: string, d: D): string {
  switch (type) {
    case "signed_up":
      return `Created an account${d.email ? ` (${s(d.email)})` : ""}.`;
    case "cv_uploaded":
      return `Uploaded a CV${d.format && d.format !== "unknown" ? ` as ${s(d.format)}` : ""}, ${n(d.chars)} characters.${d.briefSuggested ? " AI pre-filled the brief." : ""}`;
    case "brief_saved": {
      const roles = Array.isArray(d.roles) ? (d.roles as string[]).join(", ") : "";
      const cities = Array.isArray(d.cities) && d.cities.length ? (d.cities as string[]).join(", ") : "no cities";
      const hunt = d.hunt as D | null;
      return `Roles: ${roles || "none"}. ${n(d.strengths)} strengths, ${cities}${d.remoteOk ? ", remote OK" : ""}.${hunt ? ` Rescan read ${n(hunt.read)}, found ${n(hunt.found)}.` : ""}`;
    }
    case "hunt":
      return `${d.trigger === "daily" ? "Morning hunt" : d.trigger === "manual" ? "Hunt now" : "Hunt"}: read ${n(d.read)} new postings, found ${n(d.found)} matches.${d.boardErrors ? ` ${n(d.boardErrors)} boards failed.` : ""}`;
    case "job_passed":
      return `Passed on ${s(d.title) || "a posting"}${at(d)}${d.fit ? ` (fit ${s(d.fit)})` : ""}.`;
    case "application_created":
      return `Approved ${s(d.title)}${at(d)}${d.fit ? ` (fit ${s(d.fit)}${d.aiVerdict ? `, AI said ${s(d.aiVerdict)}${d.aiFit != null ? ` ${s(d.aiFit)}` : ""}` : ""})` : ""}.`;
    case "status_changed":
      return `${s(d.title)}${at(d)}: ${s(d.from)} → ${s(d.to)}.`;
    case "followed_up":
      return `Logged a follow-up with ${s(d.company)}.`;
    case "application_note":
      return `Updated ${s(d.company)}: ${d.note ? `note "${s(d.note)}"` : "no note"}${d.interviewAt ? `, interview ${s(d.interviewAt).slice(0, 10)}` : ""}.`;
    case "documents_written":
      return `${provider(d.provider)} (${s(d.model)}) wrote the CV and letter for ${s(d.title)}${at(d)}${d.write ? `, write #${n(d.write)}` : ""}${d.keySource ? `, on ${d.keySource === "own" ? "their own key" : "your key"}` : ""}.${d.inputTokens ? ` ${n(d.inputTokens)} in / ${n(d.outputTokens)} out tokens.` : ""}${d.gaps ? ` ${n(d.gaps)} gaps flagged.` : ""}`;
    case "write_failed":
      return `Writing failed for ${s(d.company)} on ${d.keySource === "own" ? `their ${provider(d.provider)} key` : "your key"}${d.status ? ` (HTTP ${s(d.status)})` : ""}: ${s(d.message)}`;
    case "key_added":
      return `Added ${d.provider === "openai" ? "an" : "a"} ${provider(d.provider)} key ending …${s(d.last4)}, writing with ${s(d.model)}.`;
    case "key_rejected":
      return `Tried ${d.provider === "openai" ? "an" : "a"} ${provider(d.provider)} key that was ${d.reason === "refused" ? "refused" : d.reason === "no-model" ? "missing a usable model" : "not checkable right now"}.`;
    case "key_removed":
      return `Removed their ${provider(d.provider)} key.`;
    case "limit_hit":
      return s(d.message);
    case "role_changed":
      return `${d.to === "admin" ? "Made an admin" : "Admin access removed"} by ${s(d.by)}.`;
    case "ai_review":
      return `${provider(d.provider)} reviewed ${n(d.reviewed)} matches (${d.trigger === "daily" ? "morning" : d.trigger === "manual" ? "asked for" : "automatic"}): ${n(d.recommend)} recommended, ${n(d.maybe)} maybe, ${n(d.skip)} skip${d.keySource ? `, on ${d.keySource === "own" ? "their own key" : "your key"}` : ""}.${d.inputTokens ? ` ${n(d.inputTokens)} in / ${n(d.outputTokens)} out tokens.` : ""}`;
    case "autopilot_approved":
      return `Autopilot approved ${s(d.title)}${at(d)} (AI fit ${s(d.aiFit)}).`;
    case "autopilot_changed":
      return `Autopilot ${d.autopilot ? "on" : "off"}: AI fit ${s(d.minFit)}+, up to ${s(d.perDay)} a day.`;
    case "company_added":
      return `Followed ${s(d.company)} (${s(d.source)}, ${n(d.openRoles)} open roles).`;
    case "company_removed":
      return `Stopped following ${s(d.company)}.`;
    case "job_link_added":
      return `Added ${s(d.title)}${at(d)} by link (read via ${s(d.via)}, fit ${s(d.fit)}).`;
    case "page_view": {
      const names: Record<string, string> = { today: "Today", shortlist: "Shortlist", tracker: "Tracker", brief: "Your brief", plan: "Plan", document: "a CV and cover letter" };
      return `Opened ${names[s(d.view)] ?? s(d.view)}${d.company ? ` for ${s(d.company)}` : ""}${d.template ? ` (${s(d.template)} template)` : ""}.`;
    }
    case "ai_wanted":
      return `Wanted ${s(d.feature) === "notify me" ? "to be told when free AI writing is on" : `to use AI (${s(d.feature)})`} before your Anthropic key was set up.`;
    case "tester_changed":
      return `${d.tester ? "Marked as a tester" : "No longer a tester"} by ${s(d.by)}.`;
    case "fresh_free_week":
      return `Given a fresh 7-day free week by ${s(d.by)}.`;
    case "house_key_changed":
      return d.action === "set" ? "Set fuzzyHR's AI key. Free AI writing is on." : d.action === "removed" ? "Removed fuzzyHR's AI key. Free AI writing is off." : `Tried to set fuzzyHR's AI key: ${s(d.message)}`;
    case "checkout_started":
      return `Opened the Personal checkout in ${s(d.currency).toUpperCase()}.`;
    case "plan_started":
      return `Started Personal${d.amount ? ` at ${(Number(d.amount) / 100).toFixed(2)} ${s(d.currency).toUpperCase()} a month` : ""}.`;
    case "plan_changed":
      return `Subscription went from ${s(d.from) || "new"} to ${s(d.to)}${d.cancelAtPeriodEnd ? ", set to cancel at period end" : ""}.`;
    case "plan_ended":
      return `Personal ended (${s(d.status)}).`;
    case "payment_failed":
      return `A payment of ${(Number(d.amount) / 100).toFixed(2)} ${s(d.currency).toUpperCase()} failed${d.attempt ? ` (attempt ${s(d.attempt)})` : ""}. Stripe will retry.`;
    case "billing_settings": {
      const what: Record<string, string> = { stripe_connected: "Connected Stripe.", stripe_rejected: `Tried to connect Stripe: ${s(d.message)}`, stripe_disconnected: "Disconnected Stripe." };
      if (d.action === "plan_saved") return `Saved the Personal plan: CA$${(Number(d.priceCad) / 100).toFixed(2)} / US$${(Number(d.priceUsd) / 100).toFixed(2)} a month, ${s(d.appsPerMonth)} applications, ${d.selling ? "on sale" : "not on sale"}.`;
      return what[s(d.action)] ?? JSON.stringify(d);
    }
    case "paused":
      return `Took a break${d.months ? ` for ${s(d.months)} month${d.months === 1 ? "" : "s"}` : " until they resume"}.${d.billing ? ` Billing paused; Personal stays on until ${s(d.paidThrough).slice(0, 10)}.` : ""}`;
    case "resumed":
      return `Resumed hunting${d.chargedNow ? ", and a new paid month started" : ""}.`;
    case "got_job":
      return `Got a job${d.company ? ` at ${s(d.company)}` : ""}${d.title ? ` as ${s(d.title)}` : ""}${d.fromTracker ? " (from their tracker)" : ""}. Hunting stopped${d.wasPaying ? " and billing paused" : ""}.`;
    case "release_action": {
      const what: Record<string, string> = { vercel_connected: "Connected Vercel for rollbacks.", vercel_rejected: "Tried to connect Vercel (token rejected).", vercel_disconnected: "Disconnected Vercel.", promote: "Put the latest version live (undid a rollback)." };
      if (d.action === "rollback") return `Rolled the site back to ${s(d.commit)}${d.message ? ` (${s(d.message)})` : ""}. Reason: ${s(d.reason)}`;
      return what[s(d.action)] ?? JSON.stringify(d);
    }
    case "data_exported":
      return "Downloaded a copy of their data.";
    case "account_deleted":
      return `An account was deleted at the user's request${d.applications != null ? ` (it had ${n(d.applications)} applications)` : ""}. Its data is gone.`;
    default:
      return JSON.stringify(d);
  }
}

/** Whole days from now until a date (negative once it has passed). */
export function daysUntil(d: Date | string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

const TZ = "America/Toronto";
export function when(d: Date | string | null | undefined): string {
  if (!d) return "never";
  return new Date(d).toLocaleString("en-CA", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function ago(d: Date | string | null | undefined): string {
  if (!d) return "never";
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}
