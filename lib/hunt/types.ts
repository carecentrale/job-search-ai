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
  /** The CV and cover letter Claude wrote for this posting. */
  tailored?: Tailored;
  /** How many times Claude has written this one (capped, to keep costs predictable). */
  writes?: number;
};

export type Tailored = {
  /** Markdown. */
  cv: string;
  /** Markdown. */
  coverLetter: string;
  /** What the posting asks for that the CV does not show. */
  gaps: string[];
  createdAt: string;
  model: string;
};
