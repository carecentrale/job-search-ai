"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkspaceState } from "@/lib/api";
import type { AgentSettings, ApplicationStatus, Brief, ScoredJob } from "@/lib/hunt/types";
import { AppCard, BriefEditor, COLUMNS, JobRow, STATUS_LABEL } from "./parts";
import { LanguageSwitch, useT } from "@/components/I18n";
import type { T } from "@/lib/i18n";

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
  const data = await res.json().catch(() => ({ error: "!unexpected" }));
  if (!res.ok) throw new Error(data.error ?? "!generic");
  return data as Reply;
}
const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

function huntSummary(t: T, h: NonNullable<Reply["hunt"]>) {
  if (h.read === 0 && h.boardErrors > 0) return t("The job boards didn't answer. I'll try again in the morning.");
  if (h.found === 0) return t("I read {n} new postings. None fit your brief well enough yet.", { n: h.read });
  return t("I read {n} postings and shortlisted {found}.", { n: h.read, found: h.found });
}

/** English-style plural pick; the French entries use the same split. */
const pl = (n: number, one: string, many: string) => (n === 1 ? one : many);

export default function LiveWorkspace({ clerk, isAdmin = false, adminAlert = 0 }: { clerk: boolean; isAdmin?: boolean; adminAlert?: number }) {
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
  const { t, dateLocale, msg } = useT();
  /** Errors from the browser side (network, bad replies) get a translated message. */
  const errText = useCallback((e: unknown) => {
    const m = (e as Error).message;
    return m === "!unexpected" ? t("The server sent back something unexpected. Try again.") : m === "!generic" ? t("Something went wrong. Try again.") : m;
  }, [t]);

  useEffect(() => {
    call("/api/me").then((r) => setState(r.state), (e: Error) => setLoadError(errText(e)));
    // Back from Stripe Checkout: the payment confirmation can take a few seconds to reach us.
    const billing = new URLSearchParams(window.location.search).get("billing");
    if (billing) setTimeout(() => {
      window.history.replaceState(null, "", "/app");
      if (billing === "cancelled") {
        setToast({ text: t("No charge made. You can subscribe any time under Plan.") });
      } else if (billing === "success") {
        setToast({ text: t("Payment received. Switching on your Personal plan…") });
        let tries = 0;
        const poll = setInterval(async () => {
          tries++;
          try {
            const r = await call("/api/me");
            if (r.state.billing.personal || tries >= 15) {
              clearInterval(poll);
              setState(r.state);
              setToast(
                r.state.billing.personal
                  ? { text: t("You're on Personal. No API key needed: I'll write with fuzzyHR's AI.") }
                  : { text: t("Your payment is still being confirmed. Refresh in a minute; if it doesn't show, write to us."), error: true },
              );
            }
          } catch {
            /* keep trying */
          }
        }, 2000);
      }
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on load
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
          ? t(pl(state.unreviewed, "Reading {n} new match against your CV…", "Reading {n} new matches against your CV…"), { n: Math.min(state.unreviewed, 12) })
          : t("Autopilot is writing your CV and cover letter for {company}…", { company: app?.job.company ?? t("a role") }),
      );
      try {
        const r = review
          ? await call("/api/me/review", { method: "POST" })
          : await call(`/api/me/applications/${encodeURIComponent(writeId)}/tailor`, { method: "POST" });
        setState(r.state);
        if (r.review?.approved) setToast({ text: t(pl(r.review.approved, "Autopilot approved {n} role. It's in your tracker.", "Autopilot approved {n} roles. They're in your tracker."), { n: r.review.approved }) });
        if (!review && app) setToast({ text: t("Autopilot wrote your {company} CV and letter. Review them before you send.", { company: app.job.company }) });
      } catch (e) {
        setAgentError(errText(e));
      } finally {
        agentRunning.current = false;
        setAgentMsg(null);
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t and errText only change with the language
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
      setToast({ text: errText(e), error: true });
    } finally {
      setBusy(null);
    }
  }, [errText]);

  if (!state) {
    return (
      <div className="ws">
        <Top clerk={clerk} />
        <main className="wrap ws-main">
          <p className={loadError ? "warn" : "muted"} style={{ paddingTop: 32 }}>{loadError || t("Loading your briefing…")}</p>
        </main>
      </div>
    );
  }

  const { trial } = state;
  const top = state.matches.filter((m) => m.review?.verdict !== "skip").slice(0, 3);
  const approve = (j: ScoredJob) =>
    act(`job:${j.id}`, () => call("/api/me/applications", json("POST", { jobId: j.id })), () => {
      setTab("tracker");
      return t("Approved. {company} is in your tracker", { company: j.company });
    });
  const pass = (j: ScoredJob) => act(`job:${j.id}`, () => call("/api/me/pass", json("POST", { jobId: j.id })), () => t("Passed on {company}", { company: j.company }));
  const setStatus = (id: string, status: ApplicationStatus) =>
    act(`app:${id}`, () => call(`/api/me/applications/${id}`, json("PATCH", { status })), () => t("Moved to {status}", { status: t(STATUS_LABEL[status]) }));
  const followedUp = (id: string) =>
    act(`app:${id}`, () => call(`/api/me/applications/${id}`, json("PATCH", { followedUp: true })), () => t("Follow-up logged. I'll remind you again in 7 days."));
  const tailor = (id: string, company: string) =>
    act(`tailor:${id}`, () => call(`/api/me/applications/${id}/tailor`, { method: "POST" }), () => t("Your {company} CV and cover letter are ready", { company }));
  const huntNow = () =>
    act("hunt", () => call("/api/me/hunt", { method: "POST" }), (r) => {
      setAgentError(null);
      return r.hunt ? huntSummary(t, r.hunt) : undefined;
    });
  const saveAgent = (a: AgentSettings) =>
    act("agent", () => call("/api/me/agent", json("PUT", a)), () => {
      setAgentError(null);
      return a.autopilot ? t("Autopilot on: roles the AI scores {fit}+, up to {n} a day", { fit: a.minFit, n: a.perDay }) : t("Autopilot off. I'll ask before every application.");
    });
  const followCompany = (url: string) =>
    act("company", () => call("/api/me/companies", json("POST", { url })), (r) =>
      r.company ? t(pl(r.company.openRoles, "Following {name}: {n} open role. It'll be in your next hunt.", "Following {name}: {n} open roles. They'll be in your next hunt."), { name: r.company.name, n: r.company.openRoles }) : undefined,
    );
  const unfollow = (source: string, board: string) => act("company", () => call("/api/me/companies", json("DELETE", { source, board })), () => t("Stopped following"));
  const addJob = (url: string) =>
    act("addjob", () => call("/api/me/jobs", json("POST", { url })), (r) => {
      setAgentError(null);
      setTab("shortlist");
      return r.added ? t("Added {title} at {company} to your shortlist", { title: r.added.title, company: r.added.company }) : undefined;
    });
  const saveBrief = (b: Brief) =>
    act("brief", () => call("/api/me/brief", json("PUT", b)), (r) => {
      setSuggested(null);
      setTab("today");
      return r.hunt ? `${t("Brief saved.")} ${huntSummary(t, r.hunt)}` : t("Brief saved.");
    });
  const uploadCv = (form: FormData | string) =>
    act(
      "cv",
      () => (typeof form === "string" ? call("/api/me/cv", json("POST", { text: form })) : call("/api/me/cv", { method: "POST", body: form })),
      (r) => {
        if (r.suggestedBrief) setSuggested(r.suggestedBrief);
        return t("Got your CV");
      },
    );

  const saveKey = (apiKey: string) =>
    act("key", () => call("/api/me/claude-key", json("PUT", { apiKey })), () => t("Key saved. fuzzyHR is now free for you, with no limits."));
  const removeKey = () => act("key", () => call("/api/me/claude-key", { method: "DELETE" }), () => t("Key removed"));
  const notifyMe = (feature: string) =>
    act("notify", () => call("/api/me/ai-request", json("POST", { feature })), () => t("You're on the list. You'll get a full free week when free AI writing switches on."));
  const goTo = async (path: string, body?: unknown) => {
    setBusy("billing");
    try {
      const res = await fetch(path, json("POST", body ?? {}));
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? "!generic");
      window.location.assign(data.url);
    } catch (e) {
      setToast({ text: errText(e), error: true });
      setBusy(null);
    }
  };
  const subscribe = () => goTo("/api/me/billing/checkout");
  const manageBilling = () => goTo("/api/me/billing/portal");
  const pause = (months: number | null) =>
    act("pause", () => call("/api/me/pause", json("POST", { months })), () => t("Paused. Enjoy the break. Your tracker and documents are all still here."));
  const resume = () =>
    act("pause", () => call("/api/me/resume", { method: "POST" }), (r) => {
      setTab("today");
      return (r as Reply & { resumed?: { chargedNow: boolean } }).resumed?.chargedNow
        ? t("Welcome back. A new month of Personal started today. I'll hunt again from tomorrow morning, or press Hunt now.")
        : t("Welcome back. I'll hunt again from tomorrow morning, or press Hunt now.");
    });
  const gotJob = (applicationId: string | null, company: string) =>
    act("pause", () => call("/api/me/got-job", json("POST", { applicationId, company })), () => {
      setTab("today");
      return t("Congratulations! I've stopped hunting, and any billing is paused.");
    });
  const deleteAccount = async () => {
    setBusy("delete");
    try {
      const res = await fetch("/api/me", json("DELETE", { confirm: "DELETE" }));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t("I couldn't delete your account. Try again."));
      window.location.replace(`${window.location.origin}/`);
    } catch (e) {
      setToast({ text: errText(e), error: true });
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
        adminAlert={adminAlert}
        needsKey={state.claude.mode !== "own" && state.claude.canSaveKey && tab !== "plan"}
      />

      <div className="wrap trial-bar">
        {state.pause.hunting ? (
          <span className="muted">
            {state.pause.gotJob ? t("Congratulations on the new job. Hunting and reminders are off.") : t("You're on a break. Hunting and reminders are off.")}{" "}
            <button className="textbtn small" disabled={busy === "pause"} onClick={resume}>{t("Resume")}</button>
          </span>
        ) : state.claude.mode === "own" ? (
          <span className="muted">{t("Free with your own {provider} key. No limits.", { provider: state.claude.provider === "openai" ? "OpenAI" : "Claude" })}</span>
        ) : state.billing.personal ? (
          <span className="muted">
            {t("Personal plan: {used} of {limit} tailored applications used this month.", { used: trial.used, limit: trial.limit ?? 0 })}
            {state.billing.status === "past_due" ? <> <span className="warn">{t("Your last payment didn't go through.")}</span> <button className="textbtn small" onClick={() => setTab("plan")}>{t("Update your card")}</button></> : null}
          </span>
        ) : state.houseOff ? (
          <span className="muted">
            {t("Free AI writing is switching on soon. Hunting, matching and your tracker work now.")}{" "}
            {state.aiRequested ? (
              <span>{t("You're on the list for a full free week.")}</span>
            ) : (
              <button className="textbtn small" disabled={busy === "notify"} onClick={() => notifyMe("notify me")}>{t("Notify me")}</button>
            )}{" "}
            <button className="textbtn small" onClick={() => setTab("plan")}>{t("Or use your own key now")}</button>
          </span>
        ) : trial.ended || state.claude.mode === "none" ? (
          <span className="warn">
            {trial.ended ? `${t("Your free week has ended.")} ` : ""}{t("Add your own Claude or OpenAI key to use fuzzyHR for free.")}{" "}
            <button className="textbtn small" onClick={() => setTab("plan")}>{t("Add your key")}</button>
          </span>
        ) : (
          <span className="muted">
            {t(pl(trial.daysLeft, "Free week: {days} day left. {used} of {limit} tailored applications used.", "Free week: {days} days left. {used} of {limit} tailored applications used."), { days: trial.daysLeft, used: trial.used, limit: trial.limit ?? 0 })}{" "}
            <button className="textbtn small" onClick={() => setTab("plan")}>{t("Use your own key for no limits")}</button>
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
                <span className="warn">{t("I paused the AI review:")}</span> {agentError}{" "}
                <button className="textbtn small" onClick={() => setAgentError(null)}>{t("Try again")}</button>
              </span>
            )}
          </div>
        )}
        {tab === "plan" ? (
          <>
            {(state.billing.personal || state.billing.canManage) && <PersonalPanel state={state} busy={busy === "billing"} onManage={manageBilling} />}
            {!state.billing.personal && state.claude.mode !== "own" && (
              <PersonalOffer offer={state.billing.offer} busy={busy === "billing"} onSubscribe={subscribe} />
            )}
            {state.onboarded && (
              <BreakPanel state={state} busy={busy === "pause"} onPause={pause} onResume={resume} onGotJob={gotJob} />
            )}
            <PlanPanel state={state} busy={busy === "key" || busy === "notify"} onSave={saveKey} onRemove={removeKey} onBack={() => setTab("today")} onNotify={() => notifyMe("notify me")} />
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
                    <h1>{t(greeting())}, {state.brief.name || t("there")}.</h1>
                    <p className="muted">{todayLine(t, dateLocale, state)}</p>
                  </div>
                  {!state.pause.hunting && (
                    <button className="btn btn-small btn-ghost hunt-btn" disabled={busy === "hunt"} onClick={huntNow}>
                      {busy === "hunt" ? t("Hunting…") : t("Hunt now")}
                    </button>
                  )}
                </div>

                {state.nudges.length > 0 && (
                  <div className="panel">
                    <h2>{t("To do today")}</h2>
                    <ul className="nudges">
                      {state.nudges.map((n) => (
                        <li key={n.appId + n.kind}>
                          <span>{msg(n.message)}</span>
                          <button className="btn btn-small" disabled={busy === `app:${n.appId}`} onClick={() => nudgeAction(n.appId, n.kind)}>
                            {n.kind === "follow-up" ? t("I followed up") : n.kind === "finish-application" ? t("Mark as sent") : t("Open tracker")}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="panel">
                  <div className="panel-head">
                    <h2>{t("Top matches")}</h2>
                    {state.matches.length > 3 && <button className="textbtn" onClick={() => setTab("shortlist")}>{t("See all {n}", { n: state.matches.length })}</button>}
                  </div>
                  {state.matches.length === 0 ? (
                    <p className="muted">{t("Nothing on your shortlist right now. I hunt every morning at 7, or press Hunt now. Widening the roles or cities in your brief brings in more.")}</p>
                  ) : top.length === 0 ? (
                    <p className="muted">
                      {t(pl(state.matches.length, "The AI suggests skipping the one role left.", "The AI suggests skipping the {n} roles left."), { n: state.matches.length })}{" "}
                      <button className="textbtn" onClick={() => setTab("shortlist")}>{t("See why")}</button>
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
                  <h1>{t("Shortlist")}</h1>
                  <p className="muted">{t("I find roles by keyword, then the AI reads each one against your CV and recommends the ones worth your time. You approve or pass. Once you approve, I can write the CV and cover letter.")}</p>
                </div>
                <AddJob busy={busy === "addjob"} onAdd={addJob} />
                {state.matches.length === 0 ? (
                  <p className="muted">{t("Nothing left to review. New matches arrive every morning.")}</p>
                ) : (
                  <Shortlist matches={state.matches} busy={busy} onApprove={approve} onPass={pass} />
                )}
              </section>
            )}

            {tab === "tracker" && (
              <section>
                <h1 className="ws-h1">{t("Tracker")}</h1>
                {state.applications.length === 0 && <p className="muted">{t("Nothing here yet. Approve a match on your shortlist to start.")}</p>}
                <div className="board">
                  {COLUMNS.map((col) => {
                    const items = state.applications.filter((a) => a.status === col);
                    return (
                      <div key={col} className="col">
                        <h2>{t(STATUS_LABEL[col])} <span className="count">{items.length}</span></h2>
                        {items.length === 0 && <p className="muted small">{t("None yet")}</p>}
                        {items.map((a) => (
                          <AppCard
                            key={a.id}
                            app={a}
                            busy={busy === `app:${a.id}` || busy === `tailor:${a.id}`}
                            due={state.nudges.some((n) => n.appId === a.id && n.kind === "follow-up")}
                            draftLine={`${a.approvedBy === "autopilot" ? `${t("Approved by Autopilot.")} ` : ""}${a.tailored ? t("CV and cover letter ready") : state.autopilotPending.includes(a.id) ? t("Autopilot will write this") : t("Not written yet")}`}
                            onStatus={setStatus}
                            onFollowUp={followedUp}
                          >
                            {a.tailored ? (
                              <>
                                <Link className="btn btn-small btn-ghost" href={`/app/doc/${encodeURIComponent(a.id)}`}>{t("View CV and letter")}</Link>
                                {state.ai && (state.claude.mode === "own" || (a.writes ?? 1) < 3) && (
                                  <button className="textbtn small" disabled={busy === `tailor:${a.id}`} onClick={() => tailor(a.id, a.job.company)}>
                                    {busy === `tailor:${a.id}` ? t("Writing…") : t("Write again")}
                                  </button>
                                )}
                              </>
                            ) : state.ai ? (
                              <button className="btn btn-small" disabled={busy === `tailor:${a.id}`} onClick={() => tailor(a.id, a.job.company)}>
                                {busy === `tailor:${a.id}` ? t("Writing… about 30 seconds") : t("Write my CV and letter")}
                              </button>
                            ) : (
                              state.houseOff ? (
                                <span className="small muted">
                                  {t("Free writing is coming soon.")}{" "}
                                  {state.aiRequested ? t("You're on the list.") : <button className="textbtn small" disabled={busy === "notify"} onClick={() => notifyMe("writing")}>{t("Notify me")}</button>}{" "}
                                  <button className="textbtn small" onClick={() => setTab("plan")}>{t("Use my own key")}</button>
                                </span>
                              ) : (
                                <button className="textbtn small" onClick={() => setTab("plan")}>{t("Add your AI key to write this")}</button>
                              )
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
                  intro={t("This is what I hunt for every morning. Separate items with commas. Saving rescans the last three weeks of postings.")}
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

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
}

function todayLine(t: T, dateLocale: string, s: WorkspaceState) {
  const b = s.briefing;
  const count = t(pl(s.matches.length, "{n} role is on your shortlist.", "{n} roles are on your shortlist."), { n: s.matches.length });
  if (!b) return `${t("Your first hunt is done.")} ${count}`;
  const today = b.date === new Date().toISOString().slice(0, 10);
  const day = new Date(b.date + "T12:00:00").toLocaleDateString(dateLocale, { month: "long", day: "numeric" });
  const read = today
    ? t(pl(b.postingsRead, "I read {n} new posting today.", "I read {n} new postings today."), { n: b.postingsRead })
    : t(pl(b.postingsRead, "I read {n} new posting on {day}.", "I read {n} new postings on {day}."), { n: b.postingsRead, day });
  return `${read} ${count}`;
}

function Top({
  clerk,
  tabs,
  onPlan,
  needsKey,
  isAdmin,
  adminAlert = 0,
}: {
  clerk: boolean;
  tabs?: { tab: Tab; setTab: (t: Tab) => void; shortlist: number };
  onPlan?: () => void;
  needsKey?: boolean;
  isAdmin?: boolean;
  adminAlert?: number;
}) {
  const { t } = useT();
  return (
    <header className="ws-top">
      <div className="wrap ws-top-inner">
        <Link className="wordmark" href="/">fuzzyHR</Link>
        {tabs && (
          <nav className="ws-tabs" aria-label={t("Workspace")}>
            {(
              [
                ["today", t("Today")],
                ["shortlist", `${t("Shortlist")}${tabs.shortlist ? ` (${tabs.shortlist})` : ""}`],
                ["tracker", t("Tracker")],
                ["brief", t("Your brief")],
                ["plan", t("Plan")],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button key={id} className={tabs.tab === id ? "on" : ""} onClick={() => tabs.setTab(id)} aria-current={tabs.tab === id ? "page" : undefined}>
                {label}
              </button>
            ))}
          </nav>
        )}
        {isAdmin && (
          <Link className="admin-link" href="/admin" title={adminAlert ? `${adminAlert} waiting for free AI writing: time to add your Anthropic key` : undefined}>
            Admin{adminAlert > 0 && <span className="admin-dot" aria-label={`${adminAlert} waiting`}>{adminAlert}</span>}
          </Link>
        )}
        <LanguageSwitch className="ws-lang" />
        {clerk && (
          <div className="ws-user">
            {needsKey && onPlan && (
              <button className="btn btn-small key-pill" onClick={onPlan}>{t("Add AI key")}</button>
            )}
            <UserButton>
              {onPlan && (
                <UserButton.MenuItems>
                  <UserButton.Action label={t("AI key and plan")} labelIcon={<KeyIcon />} onClick={onPlan} />
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

function CvPanel({ state, busy, onCv, title }: { state: WorkspaceState; busy: boolean; onCv: (f: FormData | string) => void; title?: string }) {
  const { t } = useT();
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  return (
    <div className="panel cv-panel">
      <h2>{title ?? t("Your CV")}</h2>
      {state.cv ? (
        <p className="muted small">{t("On file: {chars} characters, starting “{start}…” Upload again to replace it.", { chars: state.cv.chars.toLocaleString(), start: state.cv.preview.slice(0, 120).replace(/\s+/g, " ") })}</p>
      ) : (
        <p className="muted">{t("A PDF of your CV works best. I only use what's in it, and never invent experience.")}</p>
      )}
      <label className="file-drop" htmlFor="cv-file">
        <span className="btn btn-small">{busy ? t("Reading…") : state.cv ? t("Upload a new CV") : t("Upload your CV")}</span>
        <span className="muted small">{t("PDF or .txt, up to 5 MB")}</span>
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
          <label htmlFor="cv-text" className="small">{t("Paste the text of your CV")}</label>
          <textarea id="cv-text" rows={10} value={paste} onChange={(e) => setPaste(e.target.value)} />
          <div><button className="btn btn-small" type="submit" disabled={busy || paste.trim().length < 300}>{t("Use this text")}</button></div>
        </form>
      ) : (
        <button className="textbtn small" onClick={() => setShowPaste(true)}>{t("Or paste the text instead")}</button>
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
  const { t } = useT();
  const step = state.cv ? 2 : 1;
  return (
    <section className="onboard">
      <div className="onboard-head">
        <p className="muted small">{t("Step {step} of 2", { step })}</p>
        <h1>{step === 1 ? t("Let's meet. Start with your CV.") : t("Now tell me what you want next.")}</h1>
      </div>
      {step === 1 ? (
        <CvPanel state={state} busy={busy === "cv"} onCv={onCv} title={t("Your CV")} />
      ) : (
        <BriefEditor
          key={suggested ? "suggested" : "blank"}
          brief={suggested ?? state.brief}
          busy={busy === "brief"}
          onSave={onBrief}
          title={t("Your brief")}
          intro={
            suggested
              ? t("I read your CV and filled this in. Change anything you like, then I'll start hunting.")
              : t("Separate items with commas. When you save, I'll scan the last three weeks of postings for you.")
          }
          submitLabel={busy === "brief" ? t("Hunting…") : t("Start hunting")}
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
  onNotify,
}: {
  state: WorkspaceState;
  busy: boolean;
  onSave: (key: string) => void;
  onRemove: () => void;
  onBack: () => void;
  onNotify: () => void;
}) {
  const { t } = useT();
  const [key, setKey] = useState("");
  const c = state.claude;
  const detected = detectProvider(key);
  const ownName = c.provider === "openai" ? "OpenAI" : "Anthropic";
  return (
    <section className="plan-page">
      <div className="panel">
        <div className="panel-head">
          <h1>{t("Your plan")}</h1>
          {!state.onboarded && <button className="textbtn small" onClick={onBack}>{t("Back to setup")}</button>}
        </div>
        {state.billing.personal && c.mode !== "own" ? (
          <p className="muted small">{t("Your Personal plan covers the AI, so you don't need a key. You can still add your own below for unlimited use.")}</p>
        ) : c.mode === "own" ? (
          <p>{t("You're on Free with your own key: hunting, shortlists, reminders and unlimited CVs and cover letters, at no charge from fuzzyHR. {provider} bills your account for the writing.", { provider: ownName })}</p>
        ) : state.houseOff ? (
          <>
            <p><strong>{t("Free AI writing is switching on soon.")}</strong> {t("Hunting, matching, your shortlist and tracker work now. The AI that reviews matches and writes your CV and cover letters isn't on yet for free accounts.")}</p>
            <p>
              {state.aiRequested ? (
                <span className="muted">{t("You're on the list. When it switches on, you'll get a full free week, starting then.")}</span>
              ) : (
                <button className="btn btn-small btn-ghost" disabled={busy} onClick={onNotify}>{t("Notify me when it's on")}</button>
              )}
            </p>
            <p className="muted small">{t("Don't want to wait? Add your own Claude or OpenAI key below, and everything switches on now, free from fuzzyHR.")}</p>
          </>
        ) : state.trial.ended ? (
          <p>{t("Your free week has ended. Add your own Claude or OpenAI key below and fuzzyHR stays free, with no limits. Everything you made is still here.")}</p>
        ) : c.houseKeyAvailable ? (
          <>
            <p>{t(pl(state.trial.daysLeft, "You're on the free week, with the writing on us: {days} day left, {used} of {limit} tailored applications used.", "You're on the free week, with the writing on us: {days} days left, {used} of {limit} tailored applications used."), { days: state.trial.daysLeft, used: state.trial.used, limit: state.trial.limit ?? 0 })}</p>
            <p className="muted small">{t("Today: {used} of {limit} writing requests used. They reset at midnight Eastern.", { used: c.usedToday ?? 0, limit: c.dailyLimit ?? 0 })}</p>
          </>
        ) : (
          <p>{t("Add your own Claude or OpenAI key to switch on writing. With your own key, fuzzyHR is free.")}</p>
        )}
      </div>

      <div className="panel key-panel">
        <h2>{t("Your AI key")}</h2>
        {c.keyLast4 ? (
          <>
            <p>
              {t("Saved {provider} key ending in", { provider: ownName })} <strong className="mono">…{c.keyLast4}</strong>
              {c.model ? <>, {t("writing with")} <span className="mono">{c.model}</span></> : null}. {t("It's encrypted, used only to write your own documents, and never shown again, not even to you.")}
            </p>
            <div><button className="btn btn-small btn-ghost" disabled={busy} onClick={onRemove}>{busy ? t("Removing…") : t("Remove key")}</button></div>
            <p className="muted small">{t("To switch keys or providers, remove this one and add the new one.")}</p>
          </>
        ) : !c.canSaveKey ? (
          <p className="muted">{t("Saving keys is switched off on the server right now. Check back soon.")}</p>
        ) : (
          <form
            className="key-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSave(key);
              setKey("");
            }}
          >
            <p className="muted">{t("Add a Claude or OpenAI API key and fuzzyHR is free, with no daily or free-week limits. You pay Anthropic or OpenAI directly for the writing.")}</p>
            <div className="key-get">
              <a className="btn btn-small btn-ghost" href={KEY_LINKS.anthropic} target="_blank" rel="noopener noreferrer">{t("Get a Claude key")}</a>
              <a className="btn btn-small btn-ghost" href={KEY_LINKS.openai} target="_blank" rel="noopener noreferrer">{t("Get an OpenAI key")}</a>
            </div>
            <ol className="small key-steps">
              <li>{t("Open either link, sign in, and add some credit to your account's billing.")}</li>
              <li>{t("Create a key and copy it.")}</li>
              <li>{t("Paste it here. I check it before saving.")}</li>
            </ol>
            <label htmlFor="claude-key" className="small">
              {t("API key")}{detected ? <span className="key-detected"> · {t("{provider} key detected", { provider: detected === "openai" ? "OpenAI" : "Claude" })}</span> : null}
            </label>
            <input
              id="claude-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={t("sk-ant-… or sk-…")}
            />
            <div><button className="btn btn-small" type="submit" disabled={busy || !detected || key.trim().length < 20}>{busy ? t("Checking…") : t("Save key")}</button></div>
            <p className="muted small">{t("Stored encrypted. Remove it any time. Tip: set a monthly spending limit for the key with your provider.")}</p>
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
  const { t } = useT();
  const recommended = matches.filter((m) => m.review?.verdict === "recommend");
  const rest = matches.filter((m) => m.review?.verdict !== "recommend" && m.review?.verdict !== "skip");
  const skipped = matches.filter((m) => m.review?.verdict === "skip");
  const row = (j: ScoredJob) => <JobRow key={j.id} job={j} expanded busy={busy === `job:${j.id}`} onApprove={onApprove} onPass={onPass} />;
  return (
    <>
      {recommended.length > 0 && (
        <>
          <h2 className="group-head">{t("Recommended for you")} · {recommended.length}</h2>
          <ul className="jobs">{recommended.map(row)}</ul>
        </>
      )}
      {rest.length > 0 && (
        <>
          <h2 className="group-head">{recommended.length ? t("Worth a look") : t("To review")} · {rest.length}</h2>
          <ul className="jobs">{rest.map(row)}</ul>
        </>
      )}
      {skipped.length > 0 && (
        <details className="skipped">
          <summary>{t(pl(skipped.length, "The AI suggests skipping {n} role. Show it", "The AI suggests skipping {n} roles. Show them"), { n: skipped.length })}</summary>
          <ul className="jobs">{skipped.map(row)}</ul>
        </details>
      )}
    </>
  );
}

function AddJob({ busy, onAdd }: { busy: boolean; onAdd: (url: string) => void }) {
  const { t } = useT();
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
      <label htmlFor="job-link" className="sr-only">{t("Link to a job posting")}</label>
      <input id="job-link" type="url" inputMode="url" placeholder={t("Found a job yourself? Paste its link")} value={url} onChange={(e) => setUrl(e.target.value)} />
      <button className="btn btn-small btn-ghost" type="submit" disabled={busy || !/^https:\/\/.+\..+/.test(url.trim())}>{busy ? t("Reading…") : t("Add job")}</button>
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
  const { t } = useT();
  const [url, setUrl] = useState("");
  const a = state.agent;
  const src = state.sources;
  const sites = [src.adzuna && "Adzuna", src.jooble && "Jooble"].filter(Boolean) as string[];
  return (
    <div className="panel">
      <h2>{t("How I hunt")}</h2>
      <p className="muted small">
        {t("Every morning I check {n} companies' job boards", { n: src.companies })}
        {src.following.length ? t(", plus the {n} you follow", { n: src.following.length }) : ""}
        {sites.length ? t(", and search {sites} for your roles and cities", { sites: sites.join(t(" and ")) }) : ""}. {t("Keyword matches go to the AI, which recommends the ones worth your time.")}
      </p>

      <h3 className="small" style={{ marginTop: 18 }}>{t("Autopilot")}</h3>
      <div className="toggle-row">
        <input
          id="autopilot"
          type="checkbox"
          checked={a.autopilot}
          disabled={busy === "agent" || !state.ai}
          onChange={(e) => onAgent({ ...a, autopilot: e.target.checked })}
        />
        <label htmlFor="autopilot">
          <strong>{t("Let me approve strong matches for you")}</strong>
          <span className="muted small" style={{ display: "block" }}>
            {t("When the AI rates a role highly, I'll approve it and write the CV and cover letter without asking. I never send anything. You review every application and submit it yourself.")}
            {state.claude.mode === "house" && !state.billing.personal ? ` ${t("On the free week, each approval uses one of your 5 tailored applications.")}` : ""}
          </span>
          {!state.ai && (
            <button type="button" className="textbtn small" onClick={onPlan}>
              {state.houseOff ? t("Autopilot needs AI, which is switching on soon. See Plan") : t("Add your AI key to use Autopilot")}
            </button>
          )}
        </label>
      </div>
      {a.autopilot && (
        <div className="agent-limits">
          <label>
            {t("Only roles the AI scores")}
            <select value={a.minFit} disabled={busy === "agent"} onChange={(e) => onAgent({ ...a, minFit: Number(e.target.value) })}>
              {[70, 75, 80, 85, 90].map((n) => <option key={n} value={n}>{t("{n} or higher", { n })}</option>)}
            </select>
          </label>
          <label>
            {t("At most")}
            <select value={a.perDay} disabled={busy === "agent"} onChange={(e) => onAgent({ ...a, perDay: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{t("{n} a day", { n })}</option>)}
            </select>
          </label>
        </div>
      )}

      <h3 className="small" style={{ marginTop: 18 }}>{t("Companies you follow")}</h3>
      <p className="muted small">{t("Paste a company's careers page and I'll check its jobs every morning. Works with companies that use Greenhouse, Lever, Ashby or Recruitee, which covers most tech companies.")}</p>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          onFollow(url.trim());
          setUrl("");
        }}
      >
        <label htmlFor="company-link" className="sr-only">{t("Company careers link")}</label>
        <input id="company-link" type="url" inputMode="url" placeholder={t("https://company.com/careers")} value={url} onChange={(e) => setUrl(e.target.value)} />
        <button className="btn btn-small btn-ghost" type="submit" disabled={busy === "company" || !/^https:\/\/.+\..+/.test(url.trim())}>
          {busy === "company" ? t("Checking…") : t("Follow")}
        </button>
      </form>
      {src.following.length > 0 && (
        <ul className="follow-list">
          {src.following.map((b) => (
            <li key={`${b.source}:${b.board}`}>
              <span>{b.company ?? b.board} <span className="muted small">· {b.source}</span></span>
              <button className="textbtn small" disabled={busy === "company"} onClick={() => onUnfollow(b.source, b.board)}>{t("Unfollow")}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DataPanel({ busy, onDelete }: { busy: boolean; onDelete: () => void }) {
  const { t } = useT();
  const [confirm, setConfirm] = useState("");
  const [open, setOpen] = useState(false);
  const word = t("DELETE");
  return (
    <section className="panel plan-page" style={{ marginTop: 16 }}>
      <h2>{t("Your data")}</h2>
      <p className="muted small">
        {t("Everything I store about you: your CV, brief, matches, applications, documents and activity.")} <Link href="/privacy">{t("Privacy Policy")}</Link> · <Link href="/terms">{t("Terms of Use")}</Link>
      </p>
      <div><a className="btn btn-small btn-ghost" href="/api/me/export" download>{t("Download my data")}</a></div>
      <div className="danger-zone">
        {!open ? (
          <button className="textbtn small" onClick={() => setOpen(true)}>{t("Delete my account")}</button>
        ) : (
          <form
            className="key-form"
            onSubmit={(e) => {
              e.preventDefault();
              onDelete();
            }}
          >
            <p className="warn small">{t("This permanently deletes your account, CV, applications, documents and saved key. It can't be undone. Download your data first if you want a copy.")}</p>
            <label htmlFor="confirm-delete" className="small">{t("Type {word} to confirm", { word })}</label>
            <input id="confirm-delete" autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button className="btn btn-small btn-danger" type="submit" disabled={busy || confirm.trim().toUpperCase() !== word}>{busy ? t("Deleting…") : t("Delete everything")}</button>
              <button className="textbtn small" type="button" onClick={() => { setOpen(false); setConfirm(""); }}>{t("Cancel")}</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

type Offer = WorkspaceState["billing"]["offer"];

/** The Personal plan, priced in the visitor's currency (CAD in Canada, USD in the US). */
function PersonalOffer({ offer, busy, onSubscribe }: { offer: Offer; busy: boolean; onSubscribe: () => void }) {
  const { t } = useT();
  return (
    <section className="panel personal-offer">
      <div className="panel-head">
        <h2>{t("Personal")}</h2>
        <p className="price-line"><strong>{offer.price}</strong> {t("a month, tax included")}</p>
      </div>
      <p>{t("No API key needed. I use fuzzyHR's AI for you.")}</p>
      <ul className="small offer-list">
        <li>{t("{n} tailored CVs and cover letters a month, with free rewrites", { n: offer.appsPerMonth })}</li>
        <li>{t("AI review of every hunt, and Autopilot")}</li>
        <li>{t("Up to {n} AI requests a day", { n: offer.dailyRequests })}</li>
        <li>{t("Pause or cancel any time from this page")}</li>
      </ul>
      {offer.onSale ? (
        <>
          <div className="offer-actions">
            <button className="btn" disabled={busy} onClick={onSubscribe}>{busy ? t("Opening checkout…") : t("Subscribe")}</button>
          </div>
          <p className="muted small">
            {t("Secure payment by Stripe. fuzzyHR never sees your card number. Renews monthly until you pause or cancel.")} <Link href="/terms">{t("Terms of Use")}</Link>.
            {offer.testMode ? ` ${t("Test mode: use card 4242 4242 4242 4242; no real charge.")}` : ""}
          </p>
        </>
      ) : (
        <p className="muted small">
          {offer.available
            ? t("Coming soon. Until then, add your own Claude or OpenAI key below and fuzzyHR is free.")
            : t("Personal is available in Canada and the US for now. fuzzyHR is free everywhere with your own Claude or OpenAI key.")}
        </p>
      )}
    </section>
  );
}

function PersonalPanel({ state, busy, onManage }: { state: WorkspaceState; busy: boolean; onManage: () => void }) {
  const { t, dateLocale } = useT();
  const b = state.billing;
  const end = b.periodEnd ? new Date(b.periodEnd).toLocaleDateString(dateLocale, { month: "long", day: "numeric", year: "numeric" }) : null;
  return (
    <section className="panel personal-offer">
      <div className="panel-head">
        <h2>{b.personal ? t("You're on Personal") : t("Billing")}</h2>
      </div>
      {b.personal ? (
        <>
          <p>
            {t("{used} of {limit} tailored applications used this month.", { used: state.trial.used, limit: state.trial.limit ?? 0 })}{" "}
            {end ? (b.cancelAtPeriodEnd ? t("Your plan ends on {date} and won't renew.", { date: end }) : t("Renews on {date}.", { date: end })) : null}
          </p>
          {b.status === "past_due" && <p className="warn small">{t("Your last payment didn't go through. Stripe will retry; update your card to keep Personal.")}</p>}
        </>
      ) : (
        <p className="muted small">{t("Your Personal plan has ended. Invoices and receipts are still available.")}</p>
      )}
      {b.canManage && (
        <div><button className="btn btn-small btn-ghost" disabled={busy} onClick={onManage}>{busy ? t("Opening…") : t("Manage billing, invoices or cancel")}</button></div>
      )}
    </section>
  );
}

/** Take a break, say you got a job, or come back. */
function BreakPanel({
  state,
  busy,
  onPause,
  onResume,
  onGotJob,
}: {
  state: WorkspaceState;
  busy: boolean;
  onPause: (months: number | null) => void;
  onResume: () => void;
  onGotJob: (applicationId: string | null, company: string) => void;
}) {
  const { t, dateLocale } = useT();
  const [months, setMonths] = useState<string>("1");
  const [jobOpen, setJobOpen] = useState(false);
  const [appId, setAppId] = useState<string>("");
  const [company, setCompany] = useState("");
  const p = state.pause;
  const paying = state.billing.personal || p.billing;
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(dateLocale, { month: "long", day: "numeric", year: "numeric" }) : "");

  if (p.hunting) {
    return (
      <section className="panel break-panel">
        <h2>{p.gotJob ? t("Congratulations on the new job") : t("You're on a break")}</h2>
        <p>
          {p.gotJob?.company ? <>{p.gotJob.title ? t("At {company}, as {title}.", { company: p.gotJob.company, title: p.gotJob.title }) : t("At {company}.", { company: p.gotJob.company })} </> : null}
          {t("Hunting, reminders and Autopilot are off. Your tracker, CV and documents are all still here.")}
        </p>
        {p.billing && (
          <p className="small">
            {t("Billing is paused: no more charges.")}
            {p.paidThrough && new Date(p.paidThrough) > new Date() ? ` ${t("You keep Personal until {date}, the end of the month you paid for.", { date: date(p.paidThrough) })}` : ""}
            {p.resumeAt ? ` ${t("Billing starts again by itself on {date}, unless you cancel.", { date: date(p.resumeAt) })}` : ` ${t("It stays paused until you resume.")}`}
          </p>
        )}
        <div className="offer-actions">
          <button className="btn btn-small" disabled={busy} onClick={onResume}>{busy ? t("Resuming…") : t("Resume hunting")}</button>
          {p.billing && state.billing.canManage && <span className="muted small">{t("Done for good? Cancel under Manage billing above.")}</span>}
        </div>
        {p.billing && p.paidThrough && new Date(p.paidThrough) <= new Date() && (
          <p className="muted small">{t("Resuming starts a new month of Personal today and charges your card.")}</p>
        )}
      </section>
    );
  }

  return (
    <section className="panel break-panel">
      <h2>{t("Taking a break, or got the job?")}</h2>
      <p className="muted small">
        {t("Pausing stops hunting, reminders and Autopilot.")}{paying ? ` ${t("It also pauses billing right away: no more charges, and you keep Personal until the end of the month you've paid for.")}` : ""} {t("Everything you've made stays here.")}
      </p>
      <div className="inline-form">
        <label htmlFor="pause-for" className="sr-only">{t("Pause for")}</label>
        <select id="pause-for" value={months} onChange={(e) => setMonths(e.target.value)} className="pause-select">
          <option value="1">{t("Pause for 1 month")}</option>
          <option value="2">{t("Pause for 2 months")}</option>
          <option value="3">{t("Pause for 3 months")}</option>
          <option value="">{t("Pause until I resume")}</option>
        </select>
        <button className="btn btn-small btn-ghost" disabled={busy} onClick={() => onPause(months ? Number(months) : null)}>{busy ? t("Pausing…") : t("Pause")}</button>
      </div>
      {paying && months && <p className="muted small">{t(pl(Number(months), "Billing starts again by itself after {n} month. You can resume sooner, or cancel.", "Billing starts again by itself after {n} months. You can resume sooner, or cancel."), { n: months })}</p>}

      <div className="got-job">
        {!jobOpen ? (
          <button className="btn btn-small" onClick={() => setJobOpen(true)}>{t("I got a job!")}</button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onGotJob(appId || null, company);
            }}
          >
            <p><strong>{t("Congratulations!")}</strong> {paying ? t("I'll stop hunting right away and pause your billing, so you're not charged again.") : t("I'll stop hunting right away.")}</p>
            <label htmlFor="job-from" className="small">{t("Where?")}</label>
            <div className="inline-form">
              <select id="job-from" value={appId} onChange={(e) => setAppId(e.target.value)} className="pause-select">
                <option value="">{t("Somewhere not in my tracker")}</option>
                {state.applications.map((a) => <option key={a.id} value={a.id}>{a.job.company}: {a.job.title}</option>)}
              </select>
              {!appId && <input aria-label={t("Company (optional)")} placeholder={t("Company (optional)")} value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} />}
            </div>
            <div className="offer-actions" style={{ marginTop: 10 }}>
              <button className="btn btn-small" type="submit" disabled={busy}>{busy ? t("Saving…") : t("Stop hunting")}</button>
              <button className="textbtn small" type="button" onClick={() => setJobOpen(false)}>{t("Cancel")}</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
