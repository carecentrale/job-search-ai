"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { nudgesFor } from "@/lib/hunt/followup";
import { sampleApplications, sampleBrief, sampleJobs } from "@/lib/hunt/sample";
import { shortlist } from "@/lib/hunt/score";
import type { Application, ApplicationStatus, Brief, ScoredJob } from "@/lib/hunt/types";
import { AppCard, BriefEditor, COLUMNS, JobRow, STATUS_LABEL } from "./parts";

type Tab = "today" | "shortlist" | "tracker" | "brief";
type State = { brief: Brief; apps: Application[]; passed: string[] };

const STORAGE_KEY = "fuzzyhr-demo-v1";

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

export default function DemoWorkspace({ signUp }: { signUp?: boolean }) {
  const [tab, setTab] = useState<Tab>("today");
  // Rendered in the browser only (see WorkspaceLoader), so saved state can be read on first render.
  const [state, setState] = useState<State>(load);
  const [toast, setToast] = useState("");

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
          <Link className="wordmark" href="/">fuzzyHR</Link>
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
        Demo with sample companies and data.{" "}
        {signUp ? <><Link className="textbtn" href="/sign-up">Start your free week</Link> to get your own headhunter.{" "}</> : "Your own brief and real postings arrive when sign-up opens. "}
        <button className="textbtn small" onClick={() => update(() => fresh(), "Demo reset")}>Reset demo</button>
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
