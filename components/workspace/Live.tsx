"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkspaceState } from "@/lib/api";
import type { AgentSettings, ApplicationStatus, Brief, ScoredJob } from "@/lib/hunt/types";
import { AppCard, BriefEditor, COLUMNS, JobRow, STATUS_LABEL } from "./parts";

type Tab = "today" | "shortlist" | "tracker" | "brief" | "plan";
type Reply = {
  state: WorkspaceState;
  suggestedBrief?: Brief | null;
  hunt?: { read: number; found: number; boardErrors: number } | null;
  review?: { reviewed: number; approved: number };
  company?: { name: string; openRoles: number };
  added?: { company: string; title: string };
};

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

export default function LiveWorkspace({ clerk, isAdmin = false }: { clerk: boolean; isAdmin?: boolean }) {
  const [state, setState] = useState<WorkspaceState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<Tab>("today");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [suggested, setSuggested] = useState<Brief | null>(null);
  /** What the headhunter is doing in the background, if anything. */
  const [agentMsg, setAgentMsg] = useState<string | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const agentRunning = useRef(false);

  useEffect(() => {
    call("/api/me").then((r) => setState(r.state), (e: Error) => setLoadError(e.message));
  }, []);
  // Tell the server which screen is open, for the owner's admin timeline.
  const screen = !state ? null : !state.onboarded && tab !== "plan" ? null : tab;
  useEffect(() => {
    if (!screen) return;
    fetch("/api/me/view", json("POST", { view: screen })).catch(() => {});
  }, [screen]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.error ? 6000 : 3000);
    return () => clearTimeout(t);
  }, [toast]);

  /**
   * The agent, from the browser: while there are matches the AI hasn't reviewed,
   * ask for a review; while Autopilot has approvals without documents, write
   * them, one at a time. Stops at the first error and says why.
   */
  useEffect(() => {
    if (!state || !state.onboarded || !state.ai || agentRunning.current || agentError) return;
    const review = state.unreviewed > 0;
    const writeId = state.autopilotPending[0];
    if (!review && !writeId) return;
    agentRunning.current = true;
    const app = state.applications.find((a) => a.id === writeId);
    const run = async () => {
      setAgentMsg(
        review
          ? `Reading ${Math.min(state.unreviewed, 12)} new match${state.unreviewed === 1 ? "" : "es"} against your CV…`
          : `Autopilot is writing your CV and cover letter for ${app?.job.company ?? "a role"}…`,
      );
      try {
        const r = review
          ? await call("/api/me/review", { method: "POST" })
          : await call(`/api/me/applications/${encodeURIComponent(writeId)}/tailor`, { method: "POST" });
        setState(r.state);
        if (r.review?.approved) setToast({ text: `Autopilot approved ${r.review.approved} role${r.review.approved === 1 ? "" : "s"}. They're in your tracker.` });
        if (!review && app) setToast({ text: `Autopilot wrote your ${app.job.company} CV and letter. Review them before you send.` });
      } catch (e) {
        setAgentError((e as Error).message);
      } finally {
        agentRunning.current = false;
        setAgentMsg(null);
      }
    };
    void run();
  }, [state, agentError]);

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
  const top = state.matches.filter((m) => m.review?.verdict !== "skip").slice(0, 3);
  const approve = (j: ScoredJob) =>
    act(`job:${j.id}`, () => call("/api/me/applications", json("POST", { jobId: j.id })), () => {
      setTab("tracker");
      return `Approved. ${j.company} is in your tracker`;
    });
  const pass = (j: ScoredJob) => act(`job:${j.id}`, () => call("/api/me/pass", json("POST", { jobId: j.id })), () => `Passed on ${j.company}`);
  const setStatus = (id: string, status: ApplicationStatus) =>
    act(`app:${id}`, () => call(`/api/me/applications/${id}`, json("PATCH", { status })), () => `Moved to ${STATUS_LABEL[status]}`);
  const followedUp = (id: string) =>
    act(`app:${id}`, () => call(`/api/me/applications/${id}`, json("PATCH", { followedUp: true })), () => "Follow-up logged. I'll remind you again in 7 days.");
  const tailor = (id: string, company: string) =>
    act(`tailor:${id}`, () => call(`/api/me/applications/${id}/tailor`, { method: "POST" }), () => `Your ${company} CV and cover letter are ready`);
  const huntNow = () =>
    act("hunt", () => call("/api/me/hunt", { method: "POST" }), (r) => {
      setAgentError(null);
      return r.hunt ? huntSummary(r.hunt) : undefined;
    });
  const saveAgent = (a: AgentSettings) =>
    act("agent", () => call("/api/me/agent", json("PUT", a)), () => {
      setAgentError(null);
      return a.autopilot ? `Autopilot on: roles the AI scores ${a.minFit}+, up to ${a.perDay} a day` : "Autopilot off. I'll ask before every application.";
    });
  const followCompany = (url: string) =>
    act("company", () => call("/api/me/companies", json("POST", { url })), (r) =>
      r.company ? `Following ${r.company.name}: ${r.company.openRoles} open role${r.company.openRoles === 1 ? "" : "s"}. They'll be in your next hunt.` : undefined,
    );
  const unfollow = (source: string, board: string) => act("company", () => call("/api/me/companies", json("DELETE", { source, board })), () => "Stopped following");
  const addJob = (url: string) =>
    act("addjob", () => call("/api/me/jobs", json("POST", { url })), (r) => {
      setAgentError(null);
      setTab("shortlist");
      return r.added ? `Added ${r.added.title} at ${r.added.company} to your shortlist` : undefined;
    });
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

  const saveKey = (apiKey: string) =>
    act("key", () => call("/api/me/claude-key", json("PUT", { apiKey })), () => "Key saved. fuzzyHR is now free for you, with no limits.");
  const removeKey = () => act("key", () => call("/api/me/claude-key", { method: "DELETE" }), () => "Key removed");
  const deleteAccount = async () => {
    setBusy("delete");
    try {
      const res = await fetch("/api/me", json("DELETE", { confirm: "DELETE" }));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "I couldn't delete your account. Try again.");
      window.location.replace(`${window.location.origin}/`);
    } catch (e) {
      setToast({ text: (e as Error).message, error: true });
      setBusy(null);
    }
  };

  const nudgeAction = (appId: string, kind: string) => {
    if (kind === "follow-up") followedUp(appId);
    else if (kind === "finish-application") setStatus(appId, "applied");
    else setTab("tracker");
  };

  return (
    <div className="ws">
      <Top
        clerk={clerk}
        tabs={state.onboarded ? { tab, setTab, shortlist: state.matches.length } : undefined}
        onPlan={() => setTab("plan")}
        isAdmin={isAdmin}
        needsKey={state.claude.mode !== "own" && state.claude.canSaveKey && tab !== "plan"}
      />

      <div className="wrap trial-bar">
        {state.claude.mode === "own" ? (
          <span className="muted">Free with your own {state.claude.provider === "openai" ? "OpenAI" : "Claude"} key. No limits.</span>
        ) : trial.ended || state.claude.mode === "none" ? (
          <span className="warn">
            {trial.ended ? "Your free week has ended. " : ""}Add your own Claude or OpenAI key to use fuzzyHR for free.{" "}
            <button className="textbtn small" onClick={() => setTab("plan")}>Add your key</button>
          </span>
        ) : (
          <span className="muted">
            Free week: {trial.daysLeft} day{trial.daysLeft === 1 ? "" : "s"} left. {trial.used} of {trial.limit} tailored applications used.{" "}
            <button className="textbtn small" onClick={() => setTab("plan")}>Use your own key for no limits</button>
          </span>
        )}
      </div>

      <main className="wrap ws-main">
        {state.onboarded && (agentMsg || agentError) && tab !== "plan" && (
          <div className="agent-note" role="status">
            {agentMsg ? (
              <><span className="dot" aria-hidden="true" />{agentMsg}</>
            ) : (
              <span>
                <span className="warn">I paused the AI review:</span> {agentError}{" "}
                <button className="textbtn small" onClick={() => setAgentError(null)}>Try again</button>
              </span>
            )}
          </div>
        )}
        {tab === "plan" ? (
          <>
            <PlanPanel state={state} busy={busy === "key"} onSave={saveKey} onRemove={removeKey} onBack={() => setTab("today")} />
            <DataPanel busy={busy === "delete"} onDelete={deleteAccount} />
          </>
        ) : !state.onboarded ? (
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
                  ) : top.length === 0 ? (
                    <p className="muted">
                      The AI suggests skipping the {state.matches.length === 1 ? "one role" : `${state.matches.length} roles`} left.{" "}
                      <button className="textbtn" onClick={() => setTab("shortlist")}>See why</button>
                    </p>
                  ) : (
                    <ul className="jobs">
                      {top.map((j) => <JobRow key={j.id} job={j} busy={busy === `job:${j.id}`} onApprove={approve} onPass={pass} />)}
                    </ul>
                  )}
                </div>
              </section>
            )}

            {tab === "shortlist" && (
              <section className="panel">
                <div className="panel-head">
                  <h1>Shortlist</h1>
                  <p className="muted">I find roles by keyword, then the AI reads each one against your CV and recommends the ones worth your time. You approve or pass. Once you approve, I can write the CV and cover letter.</p>
                </div>
                <AddJob busy={busy === "addjob"} onAdd={addJob} />
                {state.matches.length === 0 ? (
                  <p className="muted">Nothing left to review. New matches arrive every morning.</p>
                ) : (
                  <Shortlist matches={state.matches} busy={busy} onApprove={approve} onPass={pass} />
                )}
              </section>
            )}

            {tab === "tracker" && (
              <section>
                <h1 className="ws-h1">Tracker</h1>
                {state.applications.length === 0 && <p className="muted">Nothing here yet. Approve a match on your shortlist to start.</p>}
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
                            draftLine={`${a.approvedBy === "autopilot" ? "Approved by Autopilot. " : ""}${a.tailored ? "CV and cover letter ready" : state.autopilotPending.includes(a.id) ? "Autopilot will write this" : "Not written yet"}`}
                            onStatus={setStatus}
                            onFollowUp={followedUp}
                          >
                            {a.tailored ? (
                              <>
                                <Link className="btn btn-small btn-ghost" href={`/app/doc/${encodeURIComponent(a.id)}`}>View CV and letter</Link>
                                {state.ai && (state.claude.mode === "own" || (a.writes ?? 1) < 3) && (
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
                              <button className="textbtn small" onClick={() => setTab("plan")}>Add your AI key to write this</button>
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
                <HuntSettings
                  state={state}
                  busy={busy}
                  onAgent={saveAgent}
                  onFollow={followCompany}
                  onUnfollow={unfollow}
                  onPlan={() => setTab("plan")}
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

function Top({
  clerk,
  tabs,
  onPlan,
  needsKey,
  isAdmin,
}: {
  clerk: boolean;
  tabs?: { tab: Tab; setTab: (t: Tab) => void; shortlist: number };
  onPlan?: () => void;
  needsKey?: boolean;
  isAdmin?: boolean;
}) {
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
                ["plan", "Plan"],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button key={id} className={tabs.tab === id ? "on" : ""} onClick={() => tabs.setTab(id)} aria-current={tabs.tab === id ? "page" : undefined}>
                {label}
              </button>
            ))}
          </nav>
        )}
        {isAdmin && <Link className="admin-link" href="/admin">Admin</Link>}
        {clerk && (
          <div className="ws-user">
            {needsKey && onPlan && (
              <button className="btn btn-small key-pill" onClick={onPlan}>Add AI key</button>
            )}
            <UserButton>
              {onPlan && (
                <UserButton.MenuItems>
                  <UserButton.Action label="AI key and plan" labelIcon={<KeyIcon />} onClick={onPlan} />
                  {isAdmin ? <UserButton.Link label="Admin" labelIcon={<AdminIcon />} href="/admin" /> : null}
                </UserButton.MenuItems>
              )}
            </UserButton>
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

const KEY_LINKS = {
  anthropic: "https://console.anthropic.com/settings/keys",
  openai: "https://platform.openai.com/api-keys",
};

function detectProvider(key: string): "anthropic" | "openai" | null {
  const k = key.trim();
  if (k.startsWith("sk-ant-")) return "anthropic";
  if (k.startsWith("sk-")) return "openai";
  return null;
}

function AdminIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.7 12.3 20 3M16 7l3 3M14 9l2 2" />
    </svg>
  );
}

function PlanPanel({
  state,
  busy,
  onSave,
  onRemove,
  onBack,
}: {
  state: WorkspaceState;
  busy: boolean;
  onSave: (key: string) => void;
  onRemove: () => void;
  onBack: () => void;
}) {
  const [key, setKey] = useState("");
  const c = state.claude;
  const detected = detectProvider(key);
  const ownName = c.provider === "openai" ? "OpenAI" : "Anthropic";
  return (
    <section className="plan-page">
      <div className="panel">
        <div className="panel-head">
          <h1>Your plan</h1>
          {!state.onboarded && <button className="textbtn small" onClick={onBack}>Back to setup</button>}
        </div>
        {c.mode === "own" ? (
          <p>You&apos;re on <strong>Free with your own key</strong>: hunting, shortlists, reminders and unlimited CVs and cover letters, at no charge from fuzzyHR. {ownName} bills your account for the writing.</p>
        ) : state.trial.ended ? (
          <p>Your free week has ended. Add your own Claude or OpenAI key below and fuzzyHR stays free, with no limits. Everything you made is still here.</p>
        ) : c.houseKeyAvailable ? (
          <>
            <p>You&apos;re on the <strong>free week</strong>, with the writing on us: {state.trial.daysLeft} day{state.trial.daysLeft === 1 ? "" : "s"} left, {state.trial.used} of {state.trial.limit} tailored applications used.</p>
            <p className="muted small">Today: {c.usedToday} of {c.dailyLimit} writing requests used. They reset at midnight Eastern.</p>
          </>
        ) : (
          <p>Add your own Claude or OpenAI key to switch on writing. With your own key, fuzzyHR is free.</p>
        )}
      </div>

      <div className="panel key-panel">
        <h2>Your AI key</h2>
        {c.keyLast4 ? (
          <>
            <p>
              Saved {ownName} key ending in <strong className="mono">…{c.keyLast4}</strong>
              {c.model ? <>, writing with <span className="mono">{c.model}</span></> : null}. It&apos;s encrypted, used only to write your own documents, and never shown again, not even to you.
            </p>
            <div><button className="btn btn-small btn-ghost" disabled={busy} onClick={onRemove}>{busy ? "Removing…" : "Remove key"}</button></div>
            <p className="muted small">To switch keys or providers, remove this one and add the new one.</p>
          </>
        ) : !c.canSaveKey ? (
          <p className="muted">Saving keys is switched off on the server right now. Check back soon.</p>
        ) : (
          <form
            className="key-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSave(key);
              setKey("");
            }}
          >
            <p className="muted">
              Add a Claude or OpenAI API key and fuzzyHR is free, with no daily or free-week limits. You pay Anthropic or OpenAI directly for the writing.
            </p>
            <div className="key-get">
              <a className="btn btn-small btn-ghost" href={KEY_LINKS.anthropic} target="_blank" rel="noopener noreferrer">Get a Claude key</a>
              <a className="btn btn-small btn-ghost" href={KEY_LINKS.openai} target="_blank" rel="noopener noreferrer">Get an OpenAI key</a>
            </div>
            <ol className="small key-steps">
              <li>Open either link, sign in, and add some credit to your account&apos;s billing.</li>
              <li>Create a key and copy it.</li>
              <li>Paste it here. I check it before saving.</li>
            </ol>
            <label htmlFor="claude-key" className="small">
              API key{detected ? <span className="key-detected"> · {detected === "openai" ? "OpenAI" : "Claude"} key detected</span> : null}
            </label>
            <input
              id="claude-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-… or sk-…"
            />
            <div><button className="btn btn-small" type="submit" disabled={busy || !detected || key.trim().length < 20}>{busy ? "Checking…" : "Save key"}</button></div>
            <p className="muted small">Stored encrypted. Remove it any time. Tip: set a monthly spending limit for the key with your provider.</p>
          </form>
        )}
      </div>
    </section>
  );
}

function Shortlist({
  matches,
  busy,
  onApprove,
  onPass,
}: {
  matches: ScoredJob[];
  busy: string | null;
  onApprove: (j: ScoredJob) => void;
  onPass: (j: ScoredJob) => void;
}) {
  const recommended = matches.filter((m) => m.review?.verdict === "recommend");
  const rest = matches.filter((m) => m.review?.verdict !== "recommend" && m.review?.verdict !== "skip");
  const skipped = matches.filter((m) => m.review?.verdict === "skip");
  const row = (j: ScoredJob) => <JobRow key={j.id} job={j} expanded busy={busy === `job:${j.id}`} onApprove={onApprove} onPass={onPass} />;
  return (
    <>
      {recommended.length > 0 && (
        <>
          <h2 className="group-head">Recommended for you · {recommended.length}</h2>
          <ul className="jobs">{recommended.map(row)}</ul>
        </>
      )}
      {rest.length > 0 && (
        <>
          <h2 className="group-head">{recommended.length ? "Worth a look" : "To review"} · {rest.length}</h2>
          <ul className="jobs">{rest.map(row)}</ul>
        </>
      )}
      {skipped.length > 0 && (
        <details className="skipped">
          <summary>The AI suggests skipping {skipped.length} role{skipped.length === 1 ? "" : "s"}. Show them</summary>
          <ul className="jobs">{skipped.map(row)}</ul>
        </details>
      )}
    </>
  );
}

function AddJob({ busy, onAdd }: { busy: boolean; onAdd: (url: string) => void }) {
  const [url, setUrl] = useState("");
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(url.trim());
        setUrl("");
      }}
    >
      <label htmlFor="job-link" className="sr-only">Link to a job posting</label>
      <input id="job-link" type="url" inputMode="url" placeholder="Found a job yourself? Paste its link" value={url} onChange={(e) => setUrl(e.target.value)} />
      <button className="btn btn-small btn-ghost" type="submit" disabled={busy || !/^https:\/\/.+\..+/.test(url.trim())}>{busy ? "Reading…" : "Add job"}</button>
    </form>
  );
}

function HuntSettings({
  state,
  busy,
  onAgent,
  onFollow,
  onUnfollow,
  onPlan,
}: {
  state: WorkspaceState;
  busy: string | null;
  onAgent: (a: AgentSettings) => void;
  onFollow: (url: string) => void;
  onUnfollow: (source: string, board: string) => void;
  onPlan: () => void;
}) {
  const [url, setUrl] = useState("");
  const a = state.agent;
  const src = state.sources;
  const sites = [src.adzuna && "Adzuna", src.jooble && "Jooble"].filter(Boolean) as string[];
  return (
    <div className="panel">
      <h2>How I hunt</h2>
      <p className="muted small">
        Every morning I check {src.companies} companies&apos; job boards{src.following.length ? `, plus the ${src.following.length} you follow` : ""}
        {sites.length ? `, and search ${sites.join(" and ")} for your roles and cities` : ""}. Keyword matches go to the AI, which recommends the ones worth your time.
      </p>

      <h3 className="small" style={{ marginTop: 18 }}>Autopilot</h3>
      <div className="toggle-row">
        <input
          id="autopilot"
          type="checkbox"
          checked={a.autopilot}
          disabled={busy === "agent" || !state.ai}
          onChange={(e) => onAgent({ ...a, autopilot: e.target.checked })}
        />
        <label htmlFor="autopilot">
          <strong>Let me approve strong matches for you</strong>
          <span className="muted small" style={{ display: "block" }}>
            When the AI rates a role highly, I&apos;ll approve it and write the CV and cover letter without asking. I never send anything. You review every application and submit it yourself.
            {state.claude.mode === "house" ? " On the free week, each approval uses one of your 5 tailored applications." : ""}
          </span>
          {!state.ai && <button type="button" className="textbtn small" onClick={onPlan}>Add your AI key to use Autopilot</button>}
        </label>
      </div>
      {a.autopilot && (
        <div className="agent-limits">
          <label>
            Only roles the AI scores
            <select value={a.minFit} disabled={busy === "agent"} onChange={(e) => onAgent({ ...a, minFit: Number(e.target.value) })}>
              {[70, 75, 80, 85, 90].map((n) => <option key={n} value={n}>{n} or higher</option>)}
            </select>
          </label>
          <label>
            At most
            <select value={a.perDay} disabled={busy === "agent"} onChange={(e) => onAgent({ ...a, perDay: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} a day</option>)}
            </select>
          </label>
        </div>
      )}

      <h3 className="small" style={{ marginTop: 18 }}>Companies you follow</h3>
      <p className="muted small">Paste a company&apos;s careers page and I&apos;ll check its jobs every morning. Works with companies that use Greenhouse, Lever, Ashby or Recruitee, which covers most tech companies.</p>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          onFollow(url.trim());
          setUrl("");
        }}
      >
        <label htmlFor="company-link" className="sr-only">Company careers link</label>
        <input id="company-link" type="url" inputMode="url" placeholder="https://company.com/careers" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button className="btn btn-small btn-ghost" type="submit" disabled={busy === "company" || !/^https:\/\/.+\..+/.test(url.trim())}>
          {busy === "company" ? "Checking…" : "Follow"}
        </button>
      </form>
      {src.following.length > 0 && (
        <ul className="follow-list">
          {src.following.map((b) => (
            <li key={`${b.source}:${b.board}`}>
              <span>{b.company ?? b.board} <span className="muted small">· {b.source}</span></span>
              <button className="textbtn small" disabled={busy === "company"} onClick={() => onUnfollow(b.source, b.board)}>Unfollow</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DataPanel({ busy, onDelete }: { busy: boolean; onDelete: () => void }) {
  const [confirm, setConfirm] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <section className="panel plan-page" style={{ marginTop: 16 }}>
      <h2>Your data</h2>
      <p className="muted small">
        Everything I store about you: your CV, brief, matches, applications, documents and activity. See the <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms of Use</Link>.
      </p>
      <div><a className="btn btn-small btn-ghost" href="/api/me/export" download>Download my data</a></div>
      <div className="danger-zone">
        {!open ? (
          <button className="textbtn small" onClick={() => setOpen(true)}>Delete my account</button>
        ) : (
          <form
            className="key-form"
            onSubmit={(e) => {
              e.preventDefault();
              onDelete();
            }}
          >
            <p className="warn small">This permanently deletes your account, CV, applications, documents and saved key. It can&apos;t be undone. Download your data first if you want a copy.</p>
            <label htmlFor="confirm-delete" className="small">Type DELETE to confirm</label>
            <input id="confirm-delete" autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button className="btn btn-small btn-danger" type="submit" disabled={busy || confirm !== "DELETE"}>{busy ? "Deleting…" : "Delete everything"}</button>
              <button className="textbtn small" type="button" onClick={() => { setOpen(false); setConfirm(""); }}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
