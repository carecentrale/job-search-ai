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
};

export function describe(type: string, d: D): string {
  switch (type) {
    case "signed_up":
      return `Created an account${d.email ? ` (${s(d.email)})` : ""}.`;
    case "cv_uploaded":
      return `Uploaded a CV as ${s(d.format)}, ${n(d.chars)} characters.${d.briefSuggested ? " AI pre-filled the brief." : ""}`;
    case "brief_saved": {
      const roles = Array.isArray(d.roles) ? (d.roles as string[]).join(", ") : "";
      const cities = Array.isArray(d.cities) && d.cities.length ? (d.cities as string[]).join(", ") : "no cities";
      const hunt = d.hunt as D | null;
      return `Roles: ${roles || "none"}. ${n(d.strengths)} strengths, ${cities}${d.remoteOk ? ", remote OK" : ""}.${hunt ? ` Rescan read ${n(hunt.read)}, found ${n(hunt.found)}.` : ""}`;
    }
    case "hunt":
      return `${d.trigger === "daily" ? "Morning hunt" : "Hunt now"}: read ${n(d.read)} new postings, found ${n(d.found)} matches.${d.boardErrors ? ` ${n(d.boardErrors)} boards failed.` : ""}`;
    case "job_passed":
      return `Passed on ${s(d.title) || "a posting"}${at(d)}${d.fit ? ` (fit ${s(d.fit)})` : ""}.`;
    case "application_created":
      return `Started ${s(d.title)}${at(d)}${d.fit ? ` (fit ${s(d.fit)})` : ""}.`;
    case "status_changed":
      return `${s(d.title)}${at(d)}: ${s(d.from)} → ${s(d.to)}.`;
    case "followed_up":
      return `Logged a follow-up with ${s(d.company)}.`;
    case "application_note":
      return `Updated ${s(d.company)}: ${d.note ? `note "${s(d.note)}"` : "no note"}${d.interviewAt ? `, interview ${s(d.interviewAt).slice(0, 10)}` : ""}.`;
    case "documents_written":
      return `${provider(d.provider)} (${s(d.model)}) wrote the CV and letter for ${s(d.title)}${at(d)}, write #${n(d.write)}, on ${d.keySource === "own" ? "their own key" : "your key"}. ${n(d.inputTokens)} in / ${n(d.outputTokens)} out tokens.${d.gaps ? ` ${n(d.gaps)} gaps flagged.` : ""}`;
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
