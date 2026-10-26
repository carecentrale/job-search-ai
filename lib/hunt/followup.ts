import { daysBetween } from "./score";
import type { Application } from "./types";

/** A polite gap before chasing an employer. */
export const FOLLOW_UP_AFTER_DAYS = 7;

export type Nudge = {
  appId: string;
  kind: "follow-up" | "interview-prep" | "finish-application";
  message: string;
};

/** What the headhunter should remind the seeker about today. */
export function nudgesFor(apps: Application[], today = new Date()): Nudge[] {
  const out: Nudge[] = [];
  for (const a of apps) {
    const who = a.job.company;
    if (a.status === "applied" && a.appliedAt) {
      const since = daysBetween(a.lastFollowUpAt ?? a.appliedAt, today);
      if (since >= FOLLOW_UP_AFTER_DAYS) {
        out.push({
          appId: a.id,
          kind: "follow-up",
          message: `Follow up with ${who}. It has been ${since} days.`,
        });
      }
    }
    if (a.status === "interviewing" && a.interviewAt) {
      const until = -daysBetween(a.interviewAt, today);
      if (until >= 0 && until <= 2) {
        out.push({
          appId: a.id,
          kind: "interview-prep",
          message: `Interview with ${who} ${until === 0 ? "today" : until === 1 ? "tomorrow" : "in 2 days"}. Time to prepare.`,
        });
      }
    }
    if (a.status === "preparing" && daysBetween(a.createdAt, today) >= 2) {
      out.push({
        appId: a.id,
        kind: "finish-application",
        message: `Your ${who} application is ready to review and send.`,
      });
    }
  }
  return out;
}
