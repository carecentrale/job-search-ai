"use client";

import { useState, type ReactNode } from "react";
import { daysBetween } from "@/lib/hunt/score";
import type { Application, ApplicationStatus, Brief, ScoredJob } from "@/lib/hunt/types";
import { useT } from "@/components/I18n";
import type { T } from "@/lib/i18n";

/** Building blocks shared by the demo and the signed-in workspace. */

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  preparing: "Preparing",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  closed: "Closed",
};
export const COLUMNS: ApplicationStatus[] = ["preparing", "applied", "interviewing", "offer", "closed"];

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

/** "today", "yesterday", "3 days ago", in the reader's language. */
export function ago(iso: string, t: T = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => String(v[k])) : s)) {
  const d = daysBetween(iso, new Date());
  return d <= 0 ? t("today") : d === 1 ? t("yesterday") : t("{n} days ago", { n: d });
}

const VERDICT = {
  recommend: { label: "Recommended", cls: "ai-yes" },
  maybe: { label: "Worth a look", cls: "ai-maybe" },
  skip: { label: "AI suggests skipping", cls: "ai-no" },
} as const;

const SOURCE_LABEL: Partial<Record<ScoredJob["source"], string>> = { adzuna: "via Adzuna", jooble: "via Jooble", link: "added by link" };

export function JobRow({
  job,
  onApprove,
  onPass,
  expanded,
  busy,
}: {
  job: ScoredJob;
  onApprove: (j: ScoredJob) => void;
  onPass: (j: ScoredJob) => void;
  expanded?: boolean;
  busy?: boolean;
}) {
  const { t, msg } = useT();
  const r = job.review;
  const v = r ? VERDICT[r.verdict] : null;
  const via = job.addedByYou ? t("you added this") : SOURCE_LABEL[job.source] && t(SOURCE_LABEL[job.source]!);
  return (
    <li className={`job${r?.verdict === "skip" ? " job-dim" : ""}`}>
      <div
        className={`fit${r ? " fit-ai" : ""}${job.warnings.some((w) => w.startsWith("Posted")) ? " fit-warn" : ""}`}
        title={r ? t("AI fit {ai}. Keyword fit {kw}.", { ai: r.fit, kw: job.fit }) : t("Keyword fit {kw}. The AI hasn't reviewed this one yet.", { kw: job.fit })}
      >
        <span>{r ? r.fit : job.fit}</span>{r ? t("AI fit") : t("fit")}
      </div>
      <div className="job-body">
        <p className="role">
          {job.url && job.url !== "#" ? <a href={job.url} target="_blank" rel="noopener noreferrer">{job.title}</a> : job.title}
        </p>
        <p className="muted small">
          {job.company}, {job.location || t("location not stated")}. {t("Posted {when}.", { when: ago(job.postedAt, t) })}
          {job.source === "adzuna" && !job.addedByYou ? (
            <span className="via"> <a href="https://www.adzuna.ca" target="_blank" rel="noopener noreferrer">{t("Jobs by Adzuna")}</a></span>
          ) : via ? (
            <span className="via"> {via}</span>
          ) : null}
        </p>
        {r && v ? (
          <>
            <p className="why"><span className={`ai-tag ${v.cls}`}>{t(v.label)}</span> {r.why}</p>
            {r.concerns.length > 0 && <p className="warn small">{t("Check:")} {r.concerns.join("; ")}.</p>}
          </>
        ) : (
          <>
            {job.reasons.length > 0 && <p className="why">{job.reasons.map(msg).join(". ")}.</p>}
            {job.warnings.map((w) => <p key={w} className="warn small">{msg(w)}</p>)}
          </>
        )}
        {expanded && <p className="excerpt small">{job.description.slice(0, 600)}{job.description.length > 600 ? "…" : ""}</p>}
      </div>
      <div className="job-actions">
        <button className="btn btn-small" disabled={busy} onClick={() => onApprove(job)}>{t("Approve")}</button>
        <button className="btn btn-small btn-ghost" disabled={busy} onClick={() => onPass(job)}>{t("Pass")}</button>
      </div>
    </li>
  );
}

const NEXT_STEP: Partial<Record<ApplicationStatus, [ApplicationStatus, string]>> = {
  preparing: ["applied", "Mark as sent"],
  applied: ["interviewing", "Got an interview"],
  interviewing: ["offer", "Got an offer"],
};

export function AppCard({
  app,
  due,
  onStatus,
  onFollowUp,
  draftLine,
  children,
  busy,
}: {
  app: Application;
  due: boolean;
  onStatus: (id: string, s: ApplicationStatus) => void;
  onFollowUp: (id: string) => void;
  /** What to say about the CV and cover letter while preparing. */
  draftLine?: string;
  /** Extra actions, e.g. write or view the tailored documents. */
  children?: ReactNode;
  busy?: boolean;
}) {
  const { t } = useT();
  const step = NEXT_STEP[app.status];
  return (
    <article className={`card${due ? " card-due" : ""}`}>
      <p className="role">{app.job.company}</p>
      <p className="small">{app.job.title}</p>
      <p className="muted small">
        {app.status === "preparing" && (draftLine ?? t("Tailored CV and cover letter: drafting"))}
        {app.appliedAt && app.status !== "preparing" && t("Applied {when}", { when: ago(app.appliedAt, t) })}
        {app.lastFollowUpAt && `. ${t("Followed up {when}", { when: ago(app.lastFollowUpAt, t) })}`}
      </p>
      {app.note && <p className="small note">{app.note}</p>}
      {due && <p className="warn small">{t("Time to follow up")}</p>}
      {children && <div className="card-actions">{children}</div>}
      <div className="card-actions">
        {due && <button className="btn btn-small" disabled={busy} onClick={() => onFollowUp(app.id)}>{t("I followed up")}</button>}
        {step && <button className={`btn btn-small${due ? " btn-ghost" : ""}`} disabled={busy} onClick={() => onStatus(app.id, step[0])}>{t(step[1])}</button>}
        {app.status !== "closed" && <button className="textbtn small" disabled={busy} onClick={() => onStatus(app.id, "closed")}>{t("Close")}</button>}
      </div>
    </article>
  );
}

export function BriefEditor({
  brief,
  onSave,
  title,
  intro,
  submitLabel,
  busy,
  children,
}: {
  brief: Brief;
  onSave: (b: Brief) => void;
  title?: string;
  intro?: string;
  submitLabel?: string;
  busy?: boolean;
  children?: ReactNode;
}) {
  const { t } = useT();
  const [f, setF] = useState({
    name: brief.name,
    titles: brief.targetTitles.join(", "),
    skills: brief.skills.join(", "),
    locations: brief.locations.join(", "),
    avoid: brief.avoid.join(", "),
    remoteOk: brief.remoteOk,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <form
      className="panel brief"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          name: f.name.trim(),
          targetTitles: list(f.titles),
          skills: list(f.skills),
          locations: list(f.locations),
          avoid: list(f.avoid),
          remoteOk: f.remoteOk,
        });
      }}
    >
      <h1>{title ?? t("Your brief")}</h1>
      <p className="muted">{intro ?? t("This is what I hunt for every morning. Separate items with commas.")}</p>
      {children}
      <label htmlFor="b-name">{t("First name")}<input id="b-name" value={f.name} onChange={set("name")} /></label>
      <label htmlFor="b-titles">{t("Roles you want")}<input id="b-titles" value={f.titles} onChange={set("titles")} placeholder={t("Senior Product Manager, Director of Product")} /></label>
      <label htmlFor="b-skills">{t("Your strengths, from your CV")}<input id="b-skills" value={f.skills} onChange={set("skills")} placeholder={t("payments, roadmap, B2B SaaS")} /></label>
      <label htmlFor="b-loc">{t("Cities you would work in")}<input id="b-loc" value={f.locations} onChange={set("locations")} placeholder={t("Toronto, Montreal")} /></label>
      <label className="check" htmlFor="b-remote"><input id="b-remote" type="checkbox" checked={f.remoteOk} onChange={set("remoteOk")} />{t("Remote roles are fine")}</label>
      <label htmlFor="b-avoid">{t("Never show me roles that mention")}<input id="b-avoid" value={f.avoid} onChange={set("avoid")} placeholder={t("crypto, commission only")} /></label>
      <div><button className="btn" type="submit" disabled={busy}>{busy ? t("Saving…") : (submitLabel ?? t("Save brief"))}</button></div>
    </form>
  );
}
