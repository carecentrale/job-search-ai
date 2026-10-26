/** What the job seeker tells their headhunter. */
export type Brief = {
  name: string;
  /** Job titles they want, e.g. "Senior Product Manager". */
  targetTitles: string[];
  /** Skills, domains and tools from their CV, e.g. "payments", "sponsor banks". */
  skills: string[];
  /** Cities they would work in. */
  locations: string[];
  remoteOk: boolean;
  /** Words that rule a posting out, e.g. "crypto", "commission only". */
  avoid: string[];
};

/** A posting, normalised from whichever job board it came from. */
export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  /** Plain text of the posting. */
  description: string;
  /** ISO date the posting was published or last updated. */
  postedAt: string;
  source: "greenhouse" | "lever" | "sample";
  /** Which board it came from, e.g. "greenhouse:stripe". */
  board: string;
};

export type ScoredJob = Job & {
  /** 0–100. */
  fit: number;
  /** Short, human reasons for the score. */
  reasons: string[];
  /** Things to check before applying, e.g. a stale posting. */
  warnings: string[];
};

export type ApplicationStatus =
  | "preparing"
  | "applied"
  | "interviewing"
  | "offer"
  | "closed";

export type Application = {
  id: string;
  job: ScoredJob;
  status: ApplicationStatus;
  /** ISO dates. */
  createdAt: string;
  appliedAt?: string;
  lastFollowUpAt?: string;
  interviewAt?: string;
  note?: string;
};
