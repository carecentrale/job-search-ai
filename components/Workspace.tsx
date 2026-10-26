"use client";

import { useEffect, useMemo, useState } from "react";
import { nudgesFor } from "@/lib/hunt/followup";
import { sampleApplications, sampleBrief, sampleJobs } from "@/lib/hunt/sample";
import { daysBetween, shortlist } from "@/lib/hunt/score";
import type { Application, ApplicationStatus, Brief, ScoredJob } from "@/lib/hunt/types";

type Tab = "today" | "shortlist" | "tracker" | "brief";
type State = { brief: Brief; apps: Application[]; passed: string[] };

const STORAGE_KEY = "fuzzyhr-demo-v1";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  preparing: "Preparing",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  closed: "Closed",
};
const COLUMNS: ApplicationStatus[] = ["preparing", "applied", "interviewing", "offer", "closed"];

function fresh(): State {
  return { brief: sampleBrief, apps: sampleApplications(), passed: [] };
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {}
  return fresh();
}

const isoNow = () => new Date().toISOString();
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function ago(iso: string) {
  const d = daysBetween(iso, new Date());
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}

export default function Workspace() {
  const [tab, setTab] = useState<Tab>("today");
  const [state, setState] = useState<State>(fresh);
  const [toast, setToast] = useState("");

  useEffect(() => setState(load()), []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const { brief, apps, passed } = state;
  const taken = useMemo(() => new Set([...passed, ...apps.map((a) => a.job.id)]), [passed, apps]);
  const matches = useMemo(
    () => shortlist(brief, sampleJobs()).filter((j) => !taken.has(j.id)),
    [brief, taken],
  );
  const nudges = useMemo(() => nudgesFor(apps), [apps]);
  const readCount = sampleJobs().length;

  const update = (fn: (s: State) => State, msg?: string) => {
    setState(fn);
    if (msg) setToast(msg);
  };

  const approve = (job: ScoredJob) =>
    update(
      (s) => ({
        ...s,
        apps: [{ id: `a-${job.id}`, job, status: "preparing", createdAt: isoNow() }, ...s.apps],
      }),
      `Added ${job.company} to your tracker`,
    );
  const pass = (job: ScoredJob) =>
    update((s) => ({ ...s, passed: [...s.passed, job.id] }), `Passed on ${job.company}`);

  const setStatus = (id: string, status: ApplicationStatus) =>
    update(
      (s) => ({
        ...s,
        apps: s.apps.map((a) =>
          a.id === id
            ? { ...a, status, appliedAt: status === "applied" && !a.appliedAt ? isoNow() : a.appliedAt }
            : a,
        ),
      }),
      `Moved to ${STATUS_LABEL[status]}`,
    );
  const followedUp = (id: string) =>
    update(
      (s) => ({ ...s, apps: s.apps.map((a) => (a.id === id ? { ...a, lastFollowUpAt: isoNow() } : a)) }),
      "Follow-up logged. I'll remind you again in 7 days.",
    );

  const nudgeAction = (appId: string, kind: string) => {
    if (kind === "follow-up") followedUp(appId);
    else if (kind === "finish-application") setStatus(appId, "applied");
    else setTab("tracker");
  };

  return (
    <div className="ws">
      <header className="ws-top">
        <div className="wrap ws-top-inner">
          <a className="wordmark" href="/">fuzzyHR</a>
          <nav className="ws-tabs" aria-label="Workspace">
            {(
              [
                ["today", "Today"],
                ["shortlist", `Shortlist${matches.length ? ` (${matches.length})` : ""}`],
                ["tracker", "Tracker"],
                ["brief", "Your brief"],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <p className="demo-note wrap">
        Demo with sample companies and data. Your own brief and real postings arrive when you sign up.{" "}
        <button className="textbtn" onClick={() => update(() => fresh(), "Demo reset")}>Reset demo</button>
      </p>

      <main className="wrap ws-main">
        {tab === "today" && (
          <section className="today">
            <div className="today-head">
              <span className="avatar" aria-hidden="true">fz</span>
              <div>
                <h1>Morning, {brief.name || "there"}.</h1>
                <p className="muted">
                  I read {readCount} new postings overnight. {matches.length} {matches.length === 1 ? "is" : "are"} worth your time.
                </p>
              </div>
            </div>

            {nudges.length > 0 && (
              <div className="panel">
                <h2>To do today</h2>
                <ul className="nudges">
                  {nudges.map((n) => (
                    <li key={n.appId + n.kind}>
                      <span>{n.message}</span>
                      <button className="btn btn-small" onClick={() => nudgeAction(n.appId, n.kind)}>
                        {n.kind === "follow-up" ? "I followed up" : n.kind === "finish-application" ? "Mark as sent" : "Open tracker"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="panel">
              <div className="panel-head">
                <h2>Top matches</h2>
                <button className="textbtn" onClick={() => setTab("shortlist")}>See the full shortlist</button>
              </div>
              {matches.length === 0 ? (
                <p className="muted">You have gone through everything. I will bring new matches tomorrow morning.</p>
              ) : (
                <ul className="jobs">
                  {matches.slice(0, 3).map((j) => <JobRow key={j.id} job={j} onApprove={approve} onPass={pass} />)}
                </ul>
              )}
            </div>
          </section>
        )}

        {tab === "shortlist" && (
          <section className="panel">
            <div className="panel-head">
              <h1>Shortlist</h1>
              <p className="muted">Scored against your brief. Approve a role and I will prepare the application.</p>
            </div>
            {matches.length === 0 ? (
              <p className="muted">Nothing left to review. New matches arrive every morning.</p>
            ) : (
              <ul className="jobs">
                {matches.map((j) => <JobRow key={j.id} job={j} onApprove={approve} onPass={pass} expanded />)}
              </ul>
            )}
          </section>
        )}

        {tab === "tracker" && (
          <section>
            <h1 className="ws-h1">Tracker</h1>
            <div className="board">
              {COLUMNS.map((col) => {
                const items = apps.filter((a) => a.status === col);
                return (
                  <div key={col} className="col">
                    <h2>{STATUS_LABEL[col]} <span className="count">{items.length}</span></h2>
                    {items.length === 0 && <p className="muted small">None yet</p>}
                    {items.map((a) => (
                      <AppCard key={a.id} app={a} due={nudges.some((n) => n.appId === a.id && n.kind === "follow-up")} onStatus={setStatus} onFollowUp={followedUp} />
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === "brief" && (
          <BriefEditor
            brief={brief}
            onSave={(b) => update((s) => ({ ...s, brief: b }), "Brief saved. Your shortlist is rescored.")}
          />
        )}
      </main>

      <div className={`toast${toast ? " show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}

function JobRow({ job, onApprove, onPass, expanded }: { job: ScoredJob; onApprove: (j: ScoredJob) => void; onPass: (j: ScoredJob) => void; expanded?: boolean }) {
  return (
    <li className="job">
      <div className={`fit${job.warnings.some((w) => w.startsWith("Posted")) ? " fit-warn" : ""}`}><span>{job.fit}</span>fit</div>
      <div className="job-body">
        <p className="role">{job.title}</p>
        <p className="muted small">{job.company}, {job.location}. Posted {ago(job.postedAt)}.</p>
        {job.reasons.length > 0 && <p className="why">{job.reasons.join(". ")}.</p>}
        {job.warnings.map((w) => <p key={w} className="warn small">{w}</p>)}
        {expanded && <p className="excerpt small">{job.description}</p>}
      </div>
      <div className="job-actions">
        <button className="btn btn-small" onClick={() => onApprove(job)}>Prepare application</button>
        <button className="btn btn-small btn-ghost" onClick={() => onPass(job)}>Pass</button>
      </div>
    </li>
  );
}

function AppCard({ app, due, onStatus, onFollowUp }: { app: Application; due: boolean; onStatus: (id: string, s: ApplicationStatus) => void; onFollowUp: (id: string) => void }) {
  const next: Partial<Record<ApplicationStatus, [ApplicationStatus, string]>> = {
    preparing: ["applied", "Mark as sent"],
    applied: ["interviewing", "Got an interview"],
    interviewing: ["offer", "Got an offer"],
  };
  const step = next[app.status];
  return (
    <article className={`card${due ? " card-due" : ""}`}>
      <p className="role">{app.job.company}</p>
      <p className="small">{app.job.title}</p>
      <p className="muted small">
        {app.status === "preparing" && "Tailored CV and cover letter: drafting"}
        {app.appliedAt && app.status !== "preparing" && `Applied ${ago(app.appliedAt)}`}
        {app.lastFollowUpAt && `. Followed up ${ago(app.lastFollowUpAt)}`}
      </p>
      {app.note && <p className="small note">{app.note}</p>}
      {due && <p className="warn small">Time to follow up</p>}
      <div className="card-actions">
        {due && <button className="btn btn-small" onClick={() => onFollowUp(app.id)}>I followed up</button>}
        {step && <button className={`btn btn-small${due ? " btn-ghost" : ""}`} onClick={() => onStatus(app.id, step[0])}>{step[1]}</button>}
        {app.status !== "closed" && <button className="textbtn small" onClick={() => onStatus(app.id, "closed")}>Close</button>}
      </div>
    </article>
  );
}

function BriefEditor({ brief, onSave }: { brief: Brief; onSave: (b: Brief) => void }) {
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
      <h1>Your brief</h1>
      <p className="muted">This is what I hunt for every morning. Separate items with commas.</p>
      <label htmlFor="b-name">First name<input id="b-name" value={f.name} onChange={set("name")} /></label>
      <label htmlFor="b-titles">Roles you want<input id="b-titles" value={f.titles} onChange={set("titles")} /></label>
      <label htmlFor="b-skills">Your strengths, from your CV<input id="b-skills" value={f.skills} onChange={set("skills")} /></label>
      <label htmlFor="b-loc">Cities you would work in<input id="b-loc" value={f.locations} onChange={set("locations")} /></label>
      <label className="check" htmlFor="b-remote"><input id="b-remote" type="checkbox" checked={f.remoteOk} onChange={set("remoteOk")} />Remote roles are fine</label>
      <label htmlFor="b-avoid">Never show me roles that mention<input id="b-avoid" value={f.avoid} onChange={set("avoid")} /></label>
      <div><button className="btn" type="submit">Save brief</button></div>
    </form>
  );
}
