"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { WorkspaceState } from "@/lib/api";
import type { ApplicationStatus, Brief, ScoredJob } from "@/lib/hunt/types";
import { AppCard, BriefEditor, COLUMNS, JobRow, STATUS_LABEL } from "./parts";

type Tab = "today" | "shortlist" | "tracker" | "brief";
type Reply = { state: WorkspaceState; suggestedBrief?: Brief | null; hunt?: { read: number; found: number; boardErrors: number } | null };

async function call(path: string, init?: RequestInit): Promise<Reply> {
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({ error: "The server sent back something unexpected. Try again." }));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
  return data as Reply;
}
const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

function huntSummary(h: NonNullable<Reply["hunt"]>) {
  if (h.read === 0 && h.boardErrors > 0) return "The job boards didn't answer. I'll try again in the morning.";
  if (h.found === 0) return `I read ${h.read} new postings. None fit your brief well enough yet.`;
  return `I read ${h.read} postings and shortlisted ${h.found}.`;
}

export default function LiveWorkspace({ clerk }: { clerk: boolean }) {
  const [state, setState] = useState<WorkspaceState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<Tab>("today");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [suggested, setSuggested] = useState<Brief | null>(null);

  useEffect(() => {
    call("/api/me").then((r) => setState(r.state), (e: Error) => setLoadError(e.message));
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.error ? 6000 : 3000);
    return () => clearTimeout(t);
  }, [toast]);

  /** Run an action, keep the button busy, show the outcome. */
  const act = useCallback(async (key: string, run: () => Promise<Reply>, done?: (r: Reply) => string | void) => {
    setBusy(key);
    try {
      const r = await run();
      setState(r.state);
      const msg = done?.(r);
      if (msg) setToast({ text: msg });
    } catch (e) {
      setToast({ text: (e as Error).message, error: true });
    } finally {
      setBusy(null);
    }
  }, []);

  if (!state) {
    return (
      <div className="ws">
        <Top clerk={clerk} />
        <main className="wrap ws-main">
          <p className={loadError ? "warn" : "muted"} style={{ paddingTop: 32 }}>{loadError || "Loading your briefing…"}</p>
        </main>
      </div>
    );
  }

  const { trial } = state;
  const approve = (j: ScoredJob) =>
    act(`job:${j.id}`, () => call("/api/me/applications", json("POST", { jobId: j.id })), () => {
      setTab("tracker");
      return `Added ${j.company} to your tracker`;
    });
  const pass = (j: ScoredJob) => act(`job:${j.id}`, () => call("/api/me/pass", json("POST", { jobId: j.id })), () => `Passed on ${j.company}`);
  const setStatus = (id: string, status: ApplicationStatus) =>
    act(`app:${id}`, () => call(`/api/me/applications/${id}`, json("PATCH", { status })), () => `Moved to ${STATUS_LABEL[status]}`);
  const followedUp = (id: string) =>
    act(`app:${id}`, () => call(`/api/me/applications/${id}`, json("PATCH", { followedUp: true })), () => "Follow-up logged. I'll remind you again in 7 days.");
  const tailor = (id: string, company: string) =>
    act(`tailor:${id}`, () => call(`/api/me/applications/${id}/tailor`, { method: "POST" }), () => `Your ${company} CV and cover letter are ready`);
  const huntNow = () => act("hunt", () => call("/api/me/hunt", { method: "POST" }), (r) => (r.hunt ? huntSummary(r.hunt) : undefined));
  const saveBrief = (b: Brief) =>
    act("brief", () => call("/api/me/brief", json("PUT", b)), (r) => {
      setSuggested(null);
      setTab("today");
      return r.hunt ? `Brief saved. ${huntSummary(r.hunt)}` : "Brief saved.";
    });
  const uploadCv = (form: FormData | string) =>
    act(
      "cv",
      () => (typeof form === "string" ? call("/api/me/cv", json("POST", { text: form })) : call("/api/me/cv", { method: "POST", body: form })),
      (r) => {
        if (r.suggestedBrief) setSuggested(r.suggestedBrief);
        return "Got your CV";
      },
    );

  const nudgeAction = (appId: string, kind: string) => {
    if (kind === "follow-up") followedUp(appId);
    else if (kind === "finish-application") setStatus(appId, "applied");
    else setTab("tracker");
  };

  return (
    <div className="ws">
      <Top clerk={clerk} tabs={state.onboarded ? { tab, setTab, shortlist: state.matches.length } : undefined} />

      <div className="wrap trial-bar">
        {trial.plan === "trial" &&
          (trial.ended ? (
            <span className="warn">Your free week has ended. Paid plans open soon, and everything you made stays here.</span>
          ) : (
            <span className="muted">
              Free week: {trial.daysLeft} day{trial.daysLeft === 1 ? "" : "s"} left. {trial.used} of {trial.limit} tailored applications used.
            </span>
          ))}
      </div>

      <main className="wrap ws-main">
        {!state.onboarded ? (
          <Onboarding state={state} suggested={suggested} busy={busy} onCv={uploadCv} onBrief={saveBrief} />
        ) : (
          <>
            {tab === "today" && (
              <section className="today">
                <div className="today-head">
                  <span className="avatar" aria-hidden="true">fz</span>
                  <div>
                    <h1>{greeting()}, {state.brief.name || "there"}.</h1>
                    <p className="muted">{todayLine(state)}</p>
                  </div>
                  <button className="btn btn-small btn-ghost hunt-btn" disabled={busy === "hunt"} onClick={huntNow}>
                    {busy === "hunt" ? "Hunting…" : "Hunt now"}
                  </button>
                </div>

                {state.nudges.length > 0 && (
                  <div className="panel">
                    <h2>To do today</h2>
                    <ul className="nudges">
                      {state.nudges.map((n) => (
                        <li key={n.appId + n.kind}>
                          <span>{n.message}</span>
                          <button className="btn btn-small" disabled={busy === `app:${n.appId}`} onClick={() => nudgeAction(n.appId, n.kind)}>
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
                    {state.matches.length > 3 && <button className="textbtn" onClick={() => setTab("shortlist")}>See all {state.matches.length}</button>}
                  </div>
                  {state.matches.length === 0 ? (
                    <p className="muted">Nothing on your shortlist right now. I hunt every morning at 7, or press Hunt now. Widening the roles or cities in your brief brings in more.</p>
                  ) : (
                    <ul className="jobs">
                      {state.matches.slice(0, 3).map((j) => <JobRow key={j.id} job={j} busy={busy === `job:${j.id}`} onApprove={approve} onPass={pass} />)}
                    </ul>
                  )}
                </div>
              </section>
            )}

            {tab === "shortlist" && (
              <section className="panel">
                <div className="panel-head">
                  <h1>Shortlist</h1>
                  <p className="muted">Scored against your brief. Prepare an application and I&apos;ll write the CV and cover letter.</p>
                </div>
                {state.matches.length === 0 ? (
                  <p className="muted">Nothing left to review. New matches arrive every morning.</p>
                ) : (
                  <ul className="jobs">
                    {state.matches.map((j) => <JobRow key={j.id} job={j} expanded busy={busy === `job:${j.id}`} onApprove={approve} onPass={pass} />)}
                  </ul>
                )}
              </section>
            )}

            {tab === "tracker" && (
              <section>
                <h1 className="ws-h1">Tracker</h1>
                {state.applications.length === 0 && <p className="muted">Nothing here yet. Choose Prepare application on a match to start.</p>}
                <div className="board">
                  {COLUMNS.map((col) => {
                    const items = state.applications.filter((a) => a.status === col);
                    return (
                      <div key={col} className="col">
                        <h2>{STATUS_LABEL[col]} <span className="count">{items.length}</span></h2>
                        {items.length === 0 && <p className="muted small">None yet</p>}
                        {items.map((a) => (
                          <AppCard
                            key={a.id}
                            app={a}
                            busy={busy === `app:${a.id}` || busy === `tailor:${a.id}`}
                            due={state.nudges.some((n) => n.appId === a.id && n.kind === "follow-up")}
                            draftLine={a.tailored ? "CV and cover letter ready" : "Not written yet"}
                            onStatus={setStatus}
                            onFollowUp={followedUp}
                          >
                            {a.tailored ? (
                              <>
                                <Link className="btn btn-small btn-ghost" href={`/app/doc/${encodeURIComponent(a.id)}`}>View CV and letter</Link>
                                {state.ai && (a.writes ?? 1) < 3 && (
                                  <button className="textbtn small" disabled={busy === `tailor:${a.id}`} onClick={() => tailor(a.id, a.job.company)}>
                                    {busy === `tailor:${a.id}` ? "Writing…" : "Write again"}
                                  </button>
                                )}
                              </>
                            ) : state.ai ? (
                              <button className="btn btn-small" disabled={busy === `tailor:${a.id}`} onClick={() => tailor(a.id, a.job.company)}>
                                {busy === `tailor:${a.id}` ? "Writing… about 30 seconds" : "Write my CV and letter"}
                              </button>
                            ) : (
                              <span className="muted small">Writing switches on soon.</span>
                            )}
                          </AppCard>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {tab === "brief" && (
              <div className="brief-stack">
                <BriefEditor
                  key={JSON.stringify(state.brief)}
                  brief={state.brief}
                  busy={busy === "brief"}
                  onSave={saveBrief}
                  intro="This is what I hunt for every morning. Separate items with commas. Saving rescans the last three weeks of postings."
                />
                <CvPanel state={state} busy={busy === "cv"} onCv={uploadCv} />
              </div>
            )}
          </>
        )}
      </main>

      {toast && (
        <div className={`toast show${toast.error ? " toast-error" : ""}`} role={toast.error ? "alert" : "status"}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
}

function todayLine(s: WorkspaceState) {
  const b = s.briefing;
  const count = `${s.matches.length} ${s.matches.length === 1 ? "role is" : "roles are"} on your shortlist.`;
  if (!b) return `Your first hunt is done. ${count}`;
  const when = b.date === new Date().toISOString().slice(0, 10) ? "today" : `on ${new Date(b.date + "T12:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric" })}`;
  return `I read ${b.postingsRead} new posting${b.postingsRead === 1 ? "" : "s"} ${when}. ${count}`;
}

function Top({ clerk, tabs }: { clerk: boolean; tabs?: { tab: Tab; setTab: (t: Tab) => void; shortlist: number } }) {
  return (
    <header className="ws-top">
      <div className="wrap ws-top-inner">
        <Link className="wordmark" href="/">fuzzyHR</Link>
        {tabs && (
          <nav className="ws-tabs" aria-label="Workspace">
            {(
              [
                ["today", "Today"],
                ["shortlist", `Shortlist${tabs.shortlist ? ` (${tabs.shortlist})` : ""}`],
                ["tracker", "Tracker"],
                ["brief", "Your brief"],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button key={id} className={tabs.tab === id ? "on" : ""} onClick={() => tabs.setTab(id)} aria-current={tabs.tab === id ? "page" : undefined}>
                {label}
              </button>
            ))}
          </nav>
        )}
        {clerk && (
          <div className="ws-user">
            <UserButton />
          </div>
        )}
      </div>
    </header>
  );
}

function CvPanel({ state, busy, onCv, title = "Your CV" }: { state: WorkspaceState; busy: boolean; onCv: (f: FormData | string) => void; title?: string }) {
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  return (
    <div className="panel cv-panel">
      <h2>{title}</h2>
      {state.cv ? (
        <p className="muted small">On file: {state.cv.chars.toLocaleString()} characters, starting “{state.cv.preview.slice(0, 120).replace(/\s+/g, " ")}…” Upload again to replace it.</p>
      ) : (
        <p className="muted">A PDF of your CV works best. I only use what&apos;s in it, and never invent experience.</p>
      )}
      <label className="file-drop" htmlFor="cv-file">
        <span className="btn btn-small">{busy ? "Reading…" : state.cv ? "Upload a new CV" : "Upload your CV"}</span>
        <span className="muted small">PDF or .txt, up to 5 MB</span>
        <input
          id="cv-file"
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const fd = new FormData();
            fd.append("file", f);
            onCv(fd);
            e.target.value = "";
          }}
        />
      </label>
      {showPaste ? (
        <form
          className="paste"
          onSubmit={(e) => {
            e.preventDefault();
            onCv(paste);
          }}
        >
          <label htmlFor="cv-text" className="small">Paste the text of your CV</label>
          <textarea id="cv-text" rows={10} value={paste} onChange={(e) => setPaste(e.target.value)} />
          <div><button className="btn btn-small" type="submit" disabled={busy || paste.trim().length < 300}>Use this text</button></div>
        </form>
      ) : (
        <button className="textbtn small" onClick={() => setShowPaste(true)}>Or paste the text instead</button>
      )}
    </div>
  );
}

function Onboarding({
  state,
  suggested,
  busy,
  onCv,
  onBrief,
}: {
  state: WorkspaceState;
  suggested: Brief | null;
  busy: string | null;
  onCv: (f: FormData | string) => void;
  onBrief: (b: Brief) => void;
}) {
  const step = state.cv ? 2 : 1;
  return (
    <section className="onboard">
      <div className="onboard-head">
        <p className="muted small">Step {step} of 2</p>
        <h1>{step === 1 ? "Let's meet. Start with your CV." : "Now tell me what you want next."}</h1>
      </div>
      {step === 1 ? (
        <CvPanel state={state} busy={busy === "cv"} onCv={onCv} title="Your CV" />
      ) : (
        <BriefEditor
          key={suggested ? "suggested" : "blank"}
          brief={suggested ?? state.brief}
          busy={busy === "brief"}
          onSave={onBrief}
          title="Your brief"
          intro={
            suggested
              ? "I read your CV and filled this in. Change anything you like, then I'll start hunting."
              : "Separate items with commas. When you save, I'll scan the last three weeks of postings for you."
          }
          submitLabel={busy === "brief" ? "Hunting…" : "Start hunting"}
        />
      )}
    </section>
  );
}
