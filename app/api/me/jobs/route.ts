import { logActivity } from "@/lib/activity";
import { extractPosting } from "@/lib/ai";
import { ApiError, readJson, stateResponse, withSeeker } from "@/lib/api";
import { chooseClaude, claudeError, recordUse, reserveCall } from "@/lib/claude";
import { rankMatches } from "@/lib/hunt/run";
import { fetchPage, LinkError, linkId, pageText, postingFromJsonLd } from "@/lib/hunt/links";
import { scoreJob } from "@/lib/hunt/score";
import { boardFromUrl, fetchBoards } from "@/lib/hunt/sources";
import type { Job, ScoredJob } from "@/lib/hunt/types";
import { updateSeeker, type SeekerRecord } from "@/lib/seekers";

export const maxDuration = 60;

/** Work out the posting behind a link: job board API first, then the page's structured data, then the AI. */
async function postingFor(s: SeekerRecord, url: string): Promise<{ job: Job; via: string }> {
  const ref = boardFromUrl(url);
  if (ref?.jobId) {
    const { jobs } = await fetchBoards([{ source: ref.source, board: ref.board }]);
    const hit = jobs.find((j) => j.id.endsWith(`-${ref.jobId}`) || j.url.includes(ref.jobId!));
    if (hit) return { job: hit, via: ref.source };
  }
  const page = await fetchPage(url);
  const ld = postingFromJsonLd(page.html, page.url);
  if (ld && ld.description.length > 150) return { job: { ...ld, id: linkId(page.url), source: "link", board: "link" }, via: "page data" };

  // No structured data: let the AI read the page. This counts as one AI request.
  const claude = chooseClaude(s);
  await reserveCall(s, claude);
  let out;
  try {
    out = await extractPosting(claude.llm, page.url, pageText(page.html));
  } catch (e) {
    throw claudeError(e, claude);
  }
  await recordUse(s, claude, out.use);
  if (!out.data.isJob || !out.data.title) throw new ApiError(422, "I couldn't find a single job posting on that page. Open the posting itself and paste that link.");
  const d = out.data;
  return {
    job: {
      id: linkId(page.url),
      title: d.title,
      company: d.company || new URL(page.url).hostname.replace(/^www\./, ""),
      location: d.location,
      remote: d.remote,
      url: page.url,
      description: d.description,
      postedAt: new Date().toISOString(),
      source: "link",
      board: "link",
    },
    via: "AI",
  };
}

/** POST /api/me/jobs { url }: add one posting to the shortlist by its link. */
export async function POST(req: Request) {
  return withSeeker(async (s) => {
    const { url } = await readJson<{ url?: string }>(req);
    if (!url?.trim()) throw new ApiError(400, "Paste the link to the job posting.");
    let found;
    try {
      found = await postingFor(s, url.trim());
    } catch (e) {
      if (e instanceof LinkError) throw new ApiError(422, e.message);
      throw e;
    }
    const { job, via } = found;
    if (s.applications.some((a) => a.job.id === job.id)) throw new ApiError(409, `${job.company}'s ${job.title} is already in your tracker.`);
    const scored: ScoredJob = scoreJob(s.brief, job) ?? {
      ...job,
      fit: 0,
      reasons: [],
      warnings: ["It mentions something on your avoid list."],
    };
    const mine: ScoredJob = { ...scored, addedByYou: true };
    const saved = await updateSeeker(s.id, {
      matches: rankMatches([mine, ...s.matches.filter((m) => m.id !== job.id)]),
      passed: s.passed.filter((p) => p !== job.id),
    });
    await logActivity(s.id, "job_link_added", { company: job.company, title: job.title, url: job.url, via, fit: mine.fit });
    return stateResponse(saved, { added: { id: job.id, company: job.company, title: job.title } });
  }, req);
}
