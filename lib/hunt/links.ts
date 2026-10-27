import { boardFromUrl, fetchBoards, type BoardRef } from "./sources";
import type { Job } from "./types";

/**
 * Reading links a seeker pastes in: a company's careers page, or one job posting.
 * Pages are fetched by the server, so only plain public https pages are allowed.
 */

const MAX_BYTES = 2_000_000;
const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|.*\.localhost|metadata\.google\.internal)$/i;
const IP_LITERAL = /^(\d{1,3}(\.\d{1,3}){3}|\[.*\])$/;

export class LinkError extends Error {}

function checkUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new LinkError("That doesn't look like a web link. Paste the full address, starting with https://");
  }
  if (u.protocol !== "https:") throw new LinkError("Only https:// links work here.");
  if (PRIVATE_HOST.test(u.hostname) || IP_LITERAL.test(u.hostname) || !u.hostname.includes(".")) {
    throw new LinkError("I can only read public websites.");
  }
  if (u.port && u.port !== "443") throw new LinkError("I can only read public websites.");
  return u;
}

/** Fetch a public page as text, following up to 4 redirects and checking each hop. */
export async function fetchPage(raw: string): Promise<{ url: string; html: string }> {
  let u = checkUrl(raw);
  for (let hop = 0; hop < 5; hop++) {
    let res: Response;
    try {
      res = await fetch(u, {
        redirect: "manual",
        signal: AbortSignal.timeout(12_000),
        headers: { "user-agent": "fuzzyHR/1.0 (+https://fuzzyhr.vercel.app)", accept: "text/html,application/xhtml+xml" },
      });
    } catch {
      throw new LinkError("That site didn't answer. Check the link, or try again later.");
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      u = checkUrl(new URL(res.headers.get("location")!, u).toString());
      continue;
    }
    if (!res.ok) throw new LinkError(`That page returned an error (${res.status}). It may have been taken down, or it needs a sign-in.`);
    const type = res.headers.get("content-type") ?? "";
    if (!/html|text/.test(type)) throw new LinkError("That link isn't a web page I can read.");
    const reader = res.body?.getReader();
    if (!reader) return { url: u.toString(), html: "" };
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    return { url: u.toString(), html: new TextDecoder().decode(Buffer.concat(chunks)) };
  }
  throw new LinkError("That link redirects too many times.");
}

/** Look for an embedded job board in a careers page. */
export function boardInHtml(html: string): BoardRef | null {
  const patterns: [RegExp, BoardRef["source"]][] = [
    [/boards(?:-api)?\.greenhouse\.io\/(?:embed\/job_board(?:\/js)?\?for=|v1\/boards\/)?([a-z0-9_-]+)/i, "greenhouse"],
    [/job-boards\.greenhouse\.io\/([a-z0-9_-]+)/i, "greenhouse"],
    [/jobs\.lever\.co\/([a-z0-9_-]+)/i, "lever"],
    [/api\.lever\.co\/v0\/postings\/([a-z0-9_-]+)/i, "lever"],
    [/jobs\.ashbyhq\.com\/([a-z0-9_.-]+)/i, "ashby"],
    [/([a-z0-9-]+)\.recruitee\.com/i, "recruitee"],
  ];
  for (const [re, source] of patterns) {
    const m = re.exec(html);
    if (m && !["embed", "api", "www", "jobs", "app"].includes(m[1].toLowerCase())) return { source, board: m[1] };
  }
  return null;
}

/** A careers link → a job board fuzzyHR can hunt, checked by loading it. */
export async function resolveCompany(raw: string): Promise<{ ref: BoardRef; jobs: number }> {
  let ref: BoardRef | null = boardFromUrl(raw);
  if (!ref) {
    const page = await fetchPage(raw);
    ref = boardFromUrl(page.url) ?? boardInHtml(page.html);
  }
  if (!ref) {
    throw new LinkError(
      "I couldn't find a job board I can read on that page. I can follow companies that list jobs on Greenhouse, Lever, Ashby or Recruitee. For anything else, paste individual job links instead.",
    );
  }
  const { jobs, errors } = await fetchBoards([{ source: ref.source, board: ref.board }]);
  if (errors.length) throw new LinkError("I found the company's job board, but it didn't load. Try again later.");
  const company = jobs[0]?.company && jobs[0].company !== ref.board ? jobs[0].company : prettify(ref.board);
  return { ref: { ...ref, company }, jobs: jobs.length };
}

const prettify = (slug: string) => slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'");
const text = (html: string) => decode(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/(p|li|h\d|div)>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();

type LdPosting = {
  "@type"?: string | string[];
  title?: string;
  description?: string;
  datePosted?: string;
  hiringOrganization?: { name?: string } | string;
  jobLocation?: LdLocation | LdLocation[];
  jobLocationType?: string;
  url?: string;
};
type LdLocation = { address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string | { name?: string } } | string };

function findPosting(node: unknown): LdPosting | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = findPosting(n);
      if (hit) return hit;
    }
    return null;
  }
  const o = node as Record<string, unknown>;
  const t = o["@type"];
  if (t === "JobPosting" || (Array.isArray(t) && t.includes("JobPosting"))) return o as LdPosting;
  return findPosting(o["@graph"]);
}

/** Read a schema.org JobPosting from the page, which most job sites include for Google. */
export function postingFromJsonLd(html: string, url: string): Omit<Job, "id" | "source" | "board"> | null {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const p = findPosting(data);
    if (!p?.title) continue;
    const locs = (Array.isArray(p.jobLocation) ? p.jobLocation : p.jobLocation ? [p.jobLocation] : [])
      .map((l) => {
        if (typeof l.address === "string") return l.address;
        const a = l.address;
        const country = typeof a?.addressCountry === "string" ? a.addressCountry : a?.addressCountry?.name;
        return [a?.addressLocality, a?.addressRegion, country].filter(Boolean).join(", ");
      })
      .filter(Boolean);
    const remote = /TELECOMMUTE/i.test(p.jobLocationType ?? "");
    return {
      title: decode(p.title).trim(),
      company: (typeof p.hiringOrganization === "string" ? p.hiringOrganization : p.hiringOrganization?.name) ?? new URL(url).hostname.replace(/^www\./, ""),
      location: locs.join("; ") || (remote ? "Remote" : ""),
      remote: remote || /\bremote\b/i.test(locs.join(" ")),
      url,
      description: text(p.description ?? "").slice(0, 20_000),
      postedAt: p.datePosted && !Number.isNaN(Date.parse(p.datePosted)) ? new Date(p.datePosted).toISOString() : new Date().toISOString(),
    };
  }
  return null;
}

/** The visible text of a page, for the AI to read when there's no structured data. */
export function pageText(html: string): string {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "";
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  return `${decode(title).trim()}\n\n${text(body)}`.slice(0, 30_000);
}

/** A stable id for a posting added by link, so adding it twice doesn't duplicate it. */
export function linkId(url: string): string {
  let h = 0;
  for (const c of url) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return `ln-${(h >>> 0).toString(36)}`;
}
