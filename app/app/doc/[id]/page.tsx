import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import DocToolbar from "@/components/DocToolbar";
import { currentCaller } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { markdownToHtml, markdownToText } from "@/lib/markdown";
import { getSeeker } from "@/lib/seekers";

export const metadata: Metadata = { title: "Your application" };

const TEMPLATES = ["minimal", "bold", "elegant"] as const;
type Template = (typeof TEMPLATES)[number];

export default async function DocPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const caller = hasDb() ? await currentCaller() : null;
  if (!caller) redirect("/sign-in");

  const seeker = await getSeeker(caller.userId);
  const app = seeker?.applications.find((a) => a.id === decodeURIComponent(id));
  if (!app?.tailored) {
    return (
      <main className="wrap doc-missing">
        <h1>Nothing written for this one yet</h1>
        <p className="muted">Open your tracker and choose Write my CV and letter.</p>
        <p><Link className="btn" href="/app">Back to your workspace</Link></p>
      </main>
    );
  }

  const template: Template = TEMPLATES.includes(t as Template) ? (t as Template) : "minimal";
  const { tailored, job } = app;

  return (
    <div className={`doc-shell doc-${template}`}>
      <DocToolbar
        id={app.id}
        template={template}
        company={job.company}
        cvText={markdownToText(tailored.cv)}
        letterText={markdownToText(tailored.coverLetter)}
      />

      {tailored.gaps.length > 0 && (
        <aside className="doc-gaps no-print">
          <h2>Before you send it</h2>
          <p>The posting asks for these, and your CV doesn&apos;t show them. I left them out rather than invent anything. If you do have this experience, add it to your CV under Your brief, then choose Write again in your tracker.</p>
          <ul>{tailored.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
        </aside>
      )}

      <article className="doc-page" aria-label="Tailored CV" dangerouslySetInnerHTML={{ __html: markdownToHtml(tailored.cv) }} />
      <article className="doc-page doc-letter" aria-label="Cover letter" dangerouslySetInnerHTML={{ __html: markdownToHtml(tailored.coverLetter) }} />

      <p className="doc-meta no-print muted small">
        Written for {job.title} at {job.company} on {new Date(tailored.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}.
      </p>
    </div>
  );
}
